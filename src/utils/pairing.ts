import { PairingData } from '@/types';

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseQuery(text: string): Record<string, string> {
  const queryIndex = text.indexOf('?');
  if (queryIndex === -1) return {};

  const query = text.slice(queryIndex + 1).split('#')[0];
  const result: Record<string, string> = {};

  for (const part of query.split('&')) {
    if (!part) continue;
    const separator = part.indexOf('=');
    const rawKey = separator === -1 ? part : part.slice(0, separator);
    const rawValue = separator === -1 ? '' : part.slice(separator + 1);
    try {
      result[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
    } catch {
      result[rawKey] = rawValue;
    }
  }

  return result;
}

/**
 * Exchange pairing code for auth token.
 * GET /auth/connect/{code} returns { "token": "..." }
 */
export async function exchangePairingCode(baseUrl: string, code: string): Promise<string | null> {
  try {
    const url = `${baseUrl.replace(/\/+$/, '')}/auth/connect/${code}`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Build SSE endpoint with auth_token from token.
 * auth_token = base64("opencode:" + token)
 */
export function buildSseEndpoint(baseUrl: string, token: string): string {
  const authToken = btoa(`opencode:${token}`);
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/api/event?auth_token=${encodeURIComponent(authToken)}`;
}

export function normalizeEndpoint(value: string): string {
  let endpoint = value.trim();

  if (/^https:\/\//i.test(endpoint)) {
    endpoint = endpoint.replace(/^https:\/\//i, 'wss://');
  } else if (/^http:\/\//i.test(endpoint)) {
    endpoint = endpoint.replace(/^http:\/\//i, 'ws://');
  }

  if (!/^wss?:\/\//i.test(endpoint)) {
    endpoint = `ws://${endpoint}`;
  }

  return endpoint.replace(/\/+$/, '');
}

/**
 * Aceita o QR do OpenCode em vários formatos:
 * - JSON: { type: "pairing", payload: {...} } ou { endpoint, publicKey, ... }
 * - URL: opencode-remote://pair?endpoint=...&key=...
 * - URL direta: ws://192.168.0.10:4096
 * - host:porta
 * - HTTPS pairing: https://host/auth/connect/CODE (one-time code, expires 5 min)
 */
export function parsePairingPayload(raw: string): PairingData | null {
  const text = raw.trim();
  if (!text) return null;

  let candidate: any = null;

  // 1) JSON direto
  if (text.startsWith('{') || text.startsWith('[')) {
    candidate = safeJson(text);
  }

  // 2) URL (https://, wss://, opencode-remote://, etc.)
  if (!candidate) {
    const looksLikeUrl = /^[a-z][a-z0-9+.-]*:\/\//i.test(text);
    if (looksLikeUrl) {
      const parsed = parseUrlWithPathToken(text);
      if (parsed) {
        candidate = parsed;
      } else {
        // Fallback: query params
        const params = parseQuery(text);
        const endpoint = firstString(
          params.endpoint,
          params.url,
          params.server,
          params.host,
          params.ws,
          params.address
        );
        const key = firstString(
          params.publicKey,
          params.key,
          params.token,
          params.secret,
          params.auth
        );
        if (endpoint || /^wss?:\/\//i.test(text)) {
          candidate = {
            endpoint: endpoint ?? text,
            publicKey: key,
            sessionId: params.sessionId ?? params.session,
          };
        }
      }
    }
  }

  // 3) Host:port ou ws(s):// simples
  if (!candidate) {
    if (/^wss?:\/\//i.test(text)) {
      candidate = { endpoint: text };
    } else if (/^[\w.-]+:\d{2,5}$/.test(text)) {
      candidate = { endpoint: text };
    } else {
      return null;
    }
  }

  // Desembrulha formatos aninhados.
  if (candidate?.type === 'pairing' && candidate.payload) {
    candidate =
      typeof candidate.payload === 'string'
        ? safeJson(candidate.payload) ?? candidate
        : candidate.payload;
  }
  if (candidate?.data && typeof candidate.data === 'object') {
    candidate = candidate.data;
  }
  if (candidate?.payload && typeof candidate.payload === 'object') {
    candidate = candidate.payload;
  }

  const endpoint = firstString(
    candidate.endpoint,
    candidate.url,
    candidate.server,
    candidate.host,
    candidate.ws,
    candidate.address
  );

  if (!endpoint) return null;

  const publicKey =
    firstString(
      candidate.publicKey,
      candidate.key,
      candidate.token,
      candidate.secret,
      candidate.auth
    ) ?? '';

  const sessionId =
    firstString(candidate.sessionId, candidate.session, candidate.id) ??
    `session-${Date.now()}`;

  const expiresAt =
    typeof candidate.expiresAt === 'number'
      ? candidate.expiresAt
      : typeof candidate.expires_at === 'number'
        ? candidate.expires_at
        : Date.now() + 24 * 60 * 60 * 1000;

  // Extract baseUrl and pairing code for HTTPS pairing URLs
  let baseUrl = '';
  let pairingCode = '';
  if (text.startsWith('https://') || text.startsWith('http://')) {
    try {
      const url = new URL(text);
      baseUrl = `${url.protocol}//${url.host}`;
      // Extract code from /auth/connect/CODE path
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'auth' && pathParts[1] === 'connect' && pathParts[2]) {
        pairingCode = pathParts[2];
      }
    } catch {
      // ignore
    }
  }

  return {
    endpoint: normalizeEndpoint(endpoint),
    publicKey,
    sessionId,
    expiresAt,
    // Store baseUrl and pairingCode for token exchange
    token: pairingCode ? `${baseUrl}|${pairingCode}` : undefined,
  };
}

/**
 * Extrai endpoint + token de URLs no formato do app OpenCode:
 * https://host/auth/connect/TOKEN
 * https://host/pair/TOKEN
 * wss://host/connect/TOKEN
 * opencode-remote://pair?endpoint=...&key=...
 */
function parseUrlWithPathToken(text: string): { endpoint: string; publicKey: string; sessionId?: string } | null {
  try {
    const url = new URL(text);
    const hostname = url.hostname;
    const protocol = url.protocol === 'https:' ? 'wss:' : url.protocol === 'http:' ? 'ws:' : url.protocol;
    const port = url.port ? `:${url.port}` : '';
    const baseEndpoint = `${protocol}//${hostname}${port}`;

    // Path tokens: /auth/connect/TOKEN, /pair/TOKEN, /connect/TOKEN, /auth/TOKEN
    const pathParts = url.pathname.split('/').filter(Boolean);
    const tokenCandidates = pathParts.filter(p => p.length >= 20 && /^[A-Za-z0-9_-]+$/.test(p));
    const token = tokenCandidates[tokenCandidates.length - 1];

    if (!token) return null;

    // Query params podem sobrescrever
    const params = parseQuery(text);
    const endpoint = firstString(params.endpoint, params.url, params.server, params.host, params.ws, params.address) ?? baseEndpoint;
    const key = firstString(params.publicKey, params.key, params.token, params.secret, params.auth) ?? token;
    const sessionId = firstString(params.sessionId, params.session);

    return { endpoint, publicKey: key, sessionId };
  } catch {
    return null;
  }
}

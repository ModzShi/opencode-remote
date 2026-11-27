const REPO = 'ModzShi/opencode-remote';

/** Versão embutida neste build (mantida em sincronia com app.json). */
const APP_VERSION = '1.0.2';

export interface UpdateInfo {
  version: string;
  url: string;
  notes?: string;
}

function parseVersion(value: string): number[] {
  return value
    .replace(/^v/i, '')
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

/** -1 se a < b, 0 se iguais, 1 se a > b. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const x = left[index] ?? 0;
    const y = right[index] ?? 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

export function currentVersion(): string {
  return APP_VERSION;
}

/**
 * Consulta a última release do GitHub.
 * Retorna null quando não há versão nova (ou quando estamos offline).
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const tag = typeof data?.tag_name === 'string' ? data.tag_name : '';
    if (!tag) return null;

    if (compareVersions(tag, currentVersion()) <= 0) return null;

    return {
      version: tag.replace(/^v/i, ''),
      url: data.html_url,
      notes: typeof data.body === 'string' ? data.body.slice(0, 400) : undefined,
    };
  } catch {
    return null;
  }
}
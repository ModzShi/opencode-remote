import type { ConfigEntry, PluginInfo, SkillInfo } from '@/types';

/** Normaliza a resposta {data:[...]} ou uma lista crua. */
function listOf(payload: any): any[] {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

export function normalizeSkills(payload: any): SkillInfo[] {
  return listOf(payload)
    .filter((item) => item?.name || item?.id)
    .map((item) => ({
      id: String(item.id ?? item.name),
      name: String(item.name ?? item.id),
      description: item.description ? String(item.description) : undefined,
      autoinvoke: Boolean(item.autoinvoke),
      path: String(item.path ?? ''),
      content: String(item.content ?? ''),
    }));
}

export function normalizePlugins(payload: any): PluginInfo[] {
  return listOf(payload).map((item) => ({
    id: item.id ? String(item.id) : undefined,
    source: String(item.source ?? item.id ?? 'plugin'),
    features: Array.isArray(item.features) ? item.features.map((feature: any) => String(feature)) : [],
    state:
      typeof item.state === 'string'
        ? item.state
        : item.state
          ? JSON.stringify(item.state)
          : 'instalado',
  }));
}

export function configEntries(payload: any): ConfigEntry[] {
  const list = Array.isArray(payload) ? payload : listOf(payload);
  return list
    .filter((item) => item?.type === 'document' || item?.type === 'directory')
    .map((item) => ({
      type: item.type,
      path: item.path ? String(item.path) : undefined,
      info: item.info ?? undefined,
    }));
}

/**
 * Acha a pasta onde ficam os agentes: ao lado do documento de configuração
 * (opencode.json) do PC, em agent/.
 */
export function agentDirectory(entries: ConfigEntry[]): string | null {
  const document = entries.find((entry) => entry.type === 'document' && entry.path);
  if (!document?.path) return null;
  const separator = document.path.includes('\\') ? '\\' : '/';
  const index = document.path.lastIndexOf(separator);
  if (index <= 0) return null;
  return `${document.path.slice(0, index)}${separator}agent`;
}

export function joinPath(directory: string, name: string): string {
  const separator = directory.includes('\\') ? '\\' : '/';
  return `${directory.replace(/[\\/]+$/, '')}${separator}${name}`;
}

/** Nome seguro para arquivo de agente. */
export function agentSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/** Monta o .md do subagente (frontmatter + instruções). */
export function agentMarkdown(input: { name: string; description: string; instructions: string }): string {
  const description = input.description.replace(/\s+/g, ' ').trim();
  return [
    '---',
    `description: ${JSON.stringify(description)}`,
    'mode: subagent',
    '---',
    '',
    input.instructions.trim(),
    '',
  ].join('\n');
}

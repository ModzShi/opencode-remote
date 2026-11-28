import { File } from 'expo-file-system';
import type { ChatAttachment, PromptFile } from '@/types';

/** O servidor aceita data: URL de até 20 MB; 12 MB de arquivo cabe com folga. */
export const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export function guessMimeType(name: string, fallback = 'application/octet-stream'): string {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[extension] ?? fallback;
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Lê o arquivo e monta o data: URL que o PC consegue abrir. */
export async function toPromptFile(attachment: ChatAttachment): Promise<PromptFile> {
  if (attachment.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`${attachment.name} passa de ${formatBytes(MAX_ATTACHMENT_BYTES)}`);
  }
  const base64 = await new File(attachment.uri).base64();
  if (base64.length * 0.75 > MAX_ATTACHMENT_BYTES) {
    throw new Error(`${attachment.name} é grande demais para enviar`);
  }
  return {
    uri: `data:${attachment.mimeType || 'application/octet-stream'};base64,${base64}`,
    name: attachment.name,
  };
}

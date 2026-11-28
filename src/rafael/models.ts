import { useEffect, useState } from 'react';
import { websocket, getModelProbe as serverModelProbe, getDefaultModel as serverDefaultModel } from '@/utils/websocket';
import type { ModelOption } from '@/types';

let cache: ModelOption[] = [];
let loading: Promise<ModelOption[]> | null = null;
let probe = '';
const listeners = new Set<(models: ModelOption[]) => void>();

/** De onde veio a lista (ou os status HTTP quando não veio nada). */
export function getModelProbe(): string {
  return probe;
}

/** Modelo padrão do servidor, quando o PC informou. */
export function getDefaultModel(): ModelOption | null {
  return serverDefaultModel();
}

export function getModels(): ModelOption[] {
  return cache;
}

export function subscribeModels(listener: (models: ModelOption[]) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function refreshModels(force = false): Promise<ModelOption[]> {
  if (!force && cache.length > 0) return Promise.resolve(cache);
  if (loading) return loading;
  loading = websocket
    .fetchModels()
    .then((models) => {
      probe = serverModelProbe();
      if (models.length > 0) cache = models;
      listeners.forEach((listener) => listener(cache));
      return cache;
    })
    .catch(() => cache)
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** Lista de modelos do PC; carrega sozinho quando `enabled` fica true. */
export function useModels(enabled: boolean): ModelOption[] {
  const [models, setModels] = useState<ModelOption[]>(getModels);

  useEffect(() => subscribeModels(setModels), []);

  useEffect(() => {
    if (!enabled || cache.length > 0) return;
    void refreshModels();
  }, [enabled]);

  return models;
}

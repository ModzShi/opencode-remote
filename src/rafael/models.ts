import { useEffect, useState } from 'react';
import { websocket } from '@/utils/websocket';
import type { ModelOption } from '@/types';

let cache: ModelOption[] = [];
let loading: Promise<ModelOption[]> | null = null;
const listeners = new Set<(models: ModelOption[]) => void>();

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

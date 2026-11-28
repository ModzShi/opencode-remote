import type { ModelOption } from '@/types';

/** Separa "provedor/modelo#variante" em partes. */
export function splitModelRef(ref?: string | null): { base: string; variant?: string } {
  if (!ref) return { base: '' };
  const hash = ref.indexOf('#');
  if (hash < 0) return { base: ref };
  return { base: ref.slice(0, hash), variant: ref.slice(hash + 1) || undefined };
}

/** Monta o valor guardado na sessão: provedor/modelo#variante. */
export function modelRefValue(providerID: string, modelID: string, variant?: string): string {
  return `${providerID}/${modelID}${variant ? `#${variant}` : ''}`;
}

/** Acha o modelo na lista carregada (ou monta um a partir do texto). */
export function optionFromRef(ref: string, models: ModelOption[]): ModelOption | null {
  const { base, variant } = splitModelRef(ref);
  if (!base) return null;
  const found = models.find((model) => model.value === base);
  if (found) return variant ? { ...found, variant } : found;

  const slash = base.indexOf('/');
  if (slash <= 0) return null;
  return {
    value: base,
    label: base.slice(slash + 1),
    provider: base.slice(0, slash),
    providerID: base.slice(0, slash),
    modelID: base.slice(slash + 1),
    variant,
  };
}

/** Nome pronto para a pílula: "Sonnet 4.5 · high". */
export function modelDisplayLabel(option: ModelOption | null | undefined, fallback = 'modelo padrão'): string {
  if (!option) return fallback;
  return option.variant ? `${option.label} · ${option.variant}` : option.label;
}

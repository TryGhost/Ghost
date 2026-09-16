import { CURATED_MODELS, findCuratedModel } from './curated-models';

import type { BuilderCredentialStore } from './session-credential-store';
import type { BuilderProvider } from './curated-models';

export type BuilderModelSelection = {
  provider: BuilderProvider;
  modelId: string;
};

export const builderModelPreferenceKey = 'ghost-builder.model-selection';

function preferenceStorage(): Storage {
  return import.meta.env.DEV ? globalThis.localStorage : globalThis.sessionStorage;
}

function providerDefaultModel(provider: BuilderProvider): string {
  const model = CURATED_MODELS.find((item) => item.provider === provider);
  if (!model) {
    throw new Error(`No Builder model is configured for ${provider}.`);
  }
  return model.id;
}

function isProvider(value: unknown): value is BuilderProvider {
  return value === 'openai' || value === 'openai-codex' || value === 'anthropic';
}

export class BuilderModelPreferenceStore {
  private readonly storage: Storage;

  constructor(storage: Storage = preferenceStorage()) {
    this.storage = storage;
  }

  get(): BuilderModelSelection | undefined {
    const serialized = this.storage.getItem(builderModelPreferenceKey);
    if (!serialized) {
      return undefined;
    }
    try {
      const value: unknown = JSON.parse(serialized);
      if (!value || typeof value !== 'object') {
        return undefined;
      }
      const { provider, modelId } = value as Record<string, unknown>;
      if (!isProvider(provider) || typeof modelId !== 'string') {
        return undefined;
      }
      findCuratedModel(provider, modelId);
      return { provider, modelId };
    } catch {
      return undefined;
    }
  }

  set(selection: BuilderModelSelection): void {
    findCuratedModel(selection.provider, selection.modelId);
    this.storage.setItem(builderModelPreferenceKey, JSON.stringify(selection));
  }
}

export function initialBuilderModelSelection(
  credentials: BuilderCredentialStore,
  preferences: BuilderModelPreferenceStore,
): BuilderModelSelection {
  const preferred = preferences.get();
  if (preferred && credentials.get(preferred.provider)) {
    return preferred;
  }
  const credentialProvider = CURATED_MODELS.map((model) => model.provider).find(
    (provider, index, providers) =>
      providers.indexOf(provider) === index && credentials.get(provider),
  );
  if (credentialProvider) {
    return { provider: credentialProvider, modelId: providerDefaultModel(credentialProvider) };
  }
  return preferred ?? { provider: 'openai', modelId: providerDefaultModel('openai') };
}

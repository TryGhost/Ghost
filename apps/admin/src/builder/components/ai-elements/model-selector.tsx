import {inputSurface} from '@tryghost/shade/components';

import type {BuilderProvider, CuratedModel} from '@/builder/models/curated-models';

export const ModelSelector = ({provider, modelId, models, disabled, onSelect}: {
    provider: BuilderProvider;
    modelId: string;
    models: readonly CuratedModel[];
    disabled?: boolean;
    onSelect: (provider: BuilderProvider, modelId: string) => void;
}) => (
    <select
        aria-label='Model'
        className={`${inputSurface('self')} h-8 max-w-48 px-2 text-sm`}
        disabled={disabled}
        value={`${provider}:${modelId}`}
        onChange={(event) => {
            const [nextProvider, nextModelId] = event.target.value.split(':');
            if ((nextProvider === 'openai' || nextProvider === 'anthropic') && nextModelId) {
                onSelect(nextProvider, nextModelId);
            }
        }}
    >
        {models.map(model => <option key={`${model.provider}:${model.id}`} value={`${model.provider}:${model.id}`}>{model.name}</option>)}
    </select>
);

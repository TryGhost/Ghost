import {useCallback} from 'react';
import {createMutation} from '../utils/api/hooks';

export type SlugType = 'post' | 'tag' | 'user';

export interface SlugsResponseType {
    slugs: {
        slug: string;
    }[];
}

export interface GenerateSlugPayload {
    type: SlugType;
    text: string;
    // when provided, the API ignores the model's own slug when checking for
    // uniqueness (used when re-slugifying an existing post)
    modelId?: string;
}

// Mirrors ghost/admin/app/services/slug-generator.js — collapse whitespace
// before encoding to avoid encoded control characters (e.g. %0A) in the URL
// path, which break some hosting setups
const slugPath = ({type, text, modelId}: GenerateSlugPayload) => {
    const name = encodeURIComponent(text.replace(/\s+/g, ' ').trim());
    return modelId ? `/slugs/${type}/${name}/${modelId}/` : `/slugs/${type}/${name}/`;
};

const useGenerateSlugMutation = createMutation<SlugsResponseType, GenerateSlugPayload>({
    method: 'GET',
    path: slugPath
});

export const useGenerateSlug = () => {
    const mutation = useGenerateSlugMutation();
    const {mutateAsync} = mutation;

    const generateSlug = useCallback(async (payload: GenerateSlugPayload): Promise<string> => {
        if (!payload.text) {
            return '';
        }

        const response = await mutateAsync(payload);
        return response.slugs[0]?.slug ?? '';
    }, [mutateAsync]);

    return {
        ...mutation,
        generateSlug
    };
};

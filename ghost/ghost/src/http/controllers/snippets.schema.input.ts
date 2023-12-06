import {z} from 'zod';
import {LimitEnums, FormatEnums} from '../../common/schemas/enums';

// @NOTE: Transform done in validation to make sure there's always a value when entering the system
//         Could be extracted into it's own utils module once reused elsewhere
const formatSchema = z.string()
    .default(FormatEnums.enum.mobiledoc)
    .transform(value => (value === FormatEnums.enum.lexical ? FormatEnums.enum.lexical : FormatEnums.enum.mobiledoc));

export const FormatsSnippetQuerySchema = z.object({
    formats: formatSchema
});

export const BrowseSnippetQuerySchema = z.object({
    filter: z.string().optional(),
    page: z.number().int().min(1).default(1),
    limit: z.union([z.literal(LimitEnums.enum.all), z.number().int().min(1).default(15)]),
    formats: formatSchema
});

const SnippetSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    lexical: z.string().optional(),
    mobiledoc: z.string().optional()
});

export const SnippetsBodySchema = z.object({
    snippets: z.array(SnippetSchema).nonempty()
});

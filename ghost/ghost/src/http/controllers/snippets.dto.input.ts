import {z} from 'zod';
import {BrowseSnippetQuerySchema, FormatsSnippetQuerySchema, SnippetsBodySchema} from './snippets.schema.input';

export type BrowseSnippetQueryDTO = z.infer<typeof BrowseSnippetQuerySchema>;
export type FormatsSnippetQueryDTO = z.infer<typeof FormatsSnippetQuerySchema>;
export type GetSnippetQueryDTO = FormatsSnippetQueryDTO;
export type PutSnippetQueryDTO = FormatsSnippetQueryDTO;
export type PostSnippetQueryDTO = FormatsSnippetQueryDTO;

export type SnippetsBodyDTO = z.infer<typeof SnippetsBodySchema>;

import type {
  CreateContentData,
  PageEditableData,
  PostEditableData,
  PostTier,
} from '@tryghost/admin-x-framework/api/content-types';

/**
 * The fields the editor writes. `show_title_and_feature_image` is a page field;
 * the write contract strips it from post payloads (post-contract.ts).
 */
type EditorWritableData = Omit<
  PostEditableData & Pick<PageEditableData, 'show_title_and_feature_image'>,
  'tiers'
> & {
  // A tier relation travels as the record the settings field holds; the API
  // reads its id and ignores the rest.
  tiers?: PostTier[];
};

/** A create carries no identity: the server assigns the id and the first token. */
export type EditorCreatePayload = CreateContentData<EditorWritableData>;

/** An update carries the id and the collision token the save was built at. */
export type EditorEditPayload = EditorCreatePayload & {
  id: string;
  updated_at: string;
};

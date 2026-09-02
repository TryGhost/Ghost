import adjacentListsMerge from './adjacent-lists-merge.json';
import alignedBlocks from './aligned-blocks.json';
import directionNullVsLtr from './direction-null-vs-ltr.json';
import emptyDocumentParagraph from './empty-document-paragraph.json';
import invalidNesting from './invalid-nesting.json';
import legacyHeadingQuoteNodes from './legacy-heading-quote-nodes.json';
import legacyTextNodes from './legacy-text-nodes.json';
import missingDefaultProps from './missing-default-props.json';
import nestedEditorHtml from './nested-editor-html.json';
import oldVisibilityFormat from './old-visibility-format.json';
import type { LexicalDocument } from '@/editor/engine/lexical-compare';

// headless-koenig / mounted-koenig: `after` recorded from koenig-lexical loading `before`.
// hand-authored: pair written by hand; after-load.test.tsx verifies every pair regardless.
export type FixtureProvenance = 'headless-koenig' | 'mounted-koenig' | 'hand-authored';

export interface OldSchemaFixture {
  name: string;
  provenance: FixtureProvenance;
  before: LexicalDocument;
  after: LexicalDocument;
}

function fixture(
  name: string,
  provenance: FixtureProvenance,
  pair: { before: LexicalDocument; after: LexicalDocument },
): OldSchemaFixture {
  return { name, provenance, before: pair.before, after: pair.after };
}

export const OLD_SCHEMA_CORPUS: OldSchemaFixture[] = [
  fixture('legacy-text-nodes', 'headless-koenig', legacyTextNodes),
  fixture('legacy-heading-quote-nodes', 'headless-koenig', legacyHeadingQuoteNodes),
  fixture('old-visibility-format', 'headless-koenig', oldVisibilityFormat),
  fixture('missing-default-props', 'headless-koenig', missingDefaultProps),
  fixture('invalid-nesting', 'headless-koenig', invalidNesting),
  fixture('adjacent-lists-merge', 'headless-koenig', adjacentListsMerge),
  fixture('aligned-blocks', 'headless-koenig', alignedBlocks),
  fixture('nested-editor-html', 'mounted-koenig', nestedEditorHtml),
  fixture('direction-null-vs-ltr', 'hand-authored', directionNullVsLtr),
  fixture('empty-document-paragraph', 'hand-authored', emptyDocumentParagraph),
];

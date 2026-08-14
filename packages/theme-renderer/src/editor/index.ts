/**
 * The `@tryghost/theme-renderer/editor` subpath: the anchored edit appliers
 * consumed by the editor loop (docs/markers.md §editor loop) — text edits
 * (slice 3/4) and attribute edits (slice 5, image swaps). They are editor-side
 * tools, not part of the render contract on the package root.
 */
export {applyTextEdit, applyThemeTextEdit} from './text-edit.ts';
export {applyAttributeEdit, applyAttributeEdits, applyThemeAttributeEdit, applyThemeAttributeEdits} from './attribute-edit.ts';
export type {AttributeEdit, AttributeEditsResult, SkippedAttributeEdit} from './attribute-edit.ts';
export type {EditAnchor, SourcePosition} from './edit-common.ts';
export type {EditMarker} from '../engine/markers.ts';

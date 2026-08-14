/**
 * The `@tryghost/theme-renderer/editor` subpath: the anchored edit appliers
 * consumed by the editor loop (docs/markers.md §editor loop) — text edits
 * (slice 3/4) and attribute edits (slice 5, image swaps). They are editor-side
 * tools, not part of the render contract on the package root.
 */
export {applyTextEdit, applyThemeTextEdit} from './text-edit.ts';
export type {EditMarker, SourcePosition, TextEditAnchor} from './text-edit.ts';
export {applyAttributeEdit, applyThemeAttributeEdit} from './attribute-edit.ts';
export type {AttributeEdit, EditAnchor} from './attribute-edit.ts';

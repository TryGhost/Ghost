---
"@tryghost/koenig-lexical": patch
---

Fixed the editor's own controls staying live in a read-only editor. With Lexical's editable flag off on the top-level editor, the format toolbar, card menus and pickers are not shown, no card can be selected, edited, inserted, deleted or dragged, cards take no pointer input and keep no focus, and HTML dropped on the document is refused, while text, including text in cards, can still be selected and copied. Also fixed the Cmd/Ctrl+K link shortcut leaving a stale handler behind when a format toolbar unmounts.

---
"@tryghost/koenig-lexical": patch
---

Fixed the editor's own controls staying live in a read-only editor. With Lexical's editable flag off on the top-level editor, the format toolbar and card menus are not shown, no card can be selected, edited or dragged, and cards take no pointer input or focus, while their text can still be selected and copied. Also fixed the Cmd/Ctrl+K link shortcut leaving a stale handler behind when the format toolbar unmounts.

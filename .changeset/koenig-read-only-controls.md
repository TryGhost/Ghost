---
"@tryghost/koenig-lexical": patch
---

Fixed the editor's own controls staying live in a read-only editor. With Lexical's editable flag off on the top-level editor, the format toolbar, card menus and pickers are not shown, no card can be selected, edited, inserted, deleted or dragged, cards take no pointer or click input, no keys other than Ctrl/Cmd shortcuts and Tab, no file from a dialog opened earlier and no new focus, placing the cursor no longer triggers text shortcuts, and anything dropped on the document is refused, while text, including text in cards, can still be selected and copied. A picker or field a card had open stays closed once the editor is editable again, other than the Unsplash and GIF selectors. Also fixed the Cmd/Ctrl+K link shortcut leaving a stale handler behind when a format toolbar unmounts.

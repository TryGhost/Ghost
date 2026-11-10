# Add a building block

How to add a building block a new field type needs: a text format, a list to choose from, a
kind of leaf, or a shape. The blocks are explained in
[How a field type is built](../explanation/how-a-field-type-is-built.md).

Adding a block leads the compiler to everything written per block of its kind.

- **A text format**, in `TEXT_FORMATS`: its rule and messages in `TEXT_RULES`, and which
  control it is typed into in Admin's `TEXT_CONTROL` and Portal's `TEXT_INPUT`.
- **A list**, in `LIST_SOURCES`: which keys it accepts in `LIST_RULES`, how Admin offers
  it and names a key in `memberCustomFieldChoiceLists`, and how Portal offers it in
  `LIST_OPTIONS`.
- **A kind of leaf**, such as a number or a date: every `matchLeaf` call and every map
  keyed by leaf kind, which are the leaf's rule, Admin's control, one-line value, filter
  type and filter picker, and Portal's input.
- **A shape**, such as the set a list is: `ValueOf`, for the value a type of it holds,
  `SettingsOf`, for what a field of it is set up with, its variant in `withTypedSettings`
  and the settings each caller gives it there (as written, as read back, and as Ghost's
  table holds them), and every `matchShape` and
  `matchField` call, which are its rule, Ghost's row layout (how its rows are read, and
  where a filter finds its whole value), CSV columns and cells, Admin's control, editor,
  one-line value, filters and import mapping, and Portal's inputs, change detection and
  error placement. A value laid out unlike a string, a record or a list of strings also
  fails to compile where Ghost writes its rows.

The compiler won't ask about how a leaf is stored or compared. Every leaf is stored as
text in `value_text`, under the path of its part, and `ValueOf` gives every leaf a string,
so a leaf that should hold, store or compare as a number or a date needs those changed by
hand. Ghost's filters compare stored text.

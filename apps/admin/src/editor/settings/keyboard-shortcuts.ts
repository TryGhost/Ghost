/** One token in a shortcut: a modifier glyph, a key cap, or text the writer types. */
export interface ShortcutKey {
  text: string;
  /** What a glyph stands for, where the glyph alone does not say. */
  tooltip?: string;
  /** Typed text or a letter key rather than a symbol. */
  mono?: boolean;
  /** A word joining two alternatives rather than a key of its own. */
  plain?: boolean;
}

/** The formatting a shortcut produces, which its label is shown in. */
export type ShortcutStyle =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'highlight'
  | 'link'
  | 'code';

export interface Shortcut {
  label: string;
  style?: ShortcutStyle;
  keys: ShortcutKey[];
}

export interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

function typed(text: string): ShortcutKey {
  return { text, mono: true };
}

/** Every shortcut the editor offers, in the order they are shown. */
export function keyboardShortcutGroups(isMac: boolean): ShortcutGroup[] {
  const cmd: ShortcutKey = isMac ? { text: '⌘', tooltip: 'Command' } : { text: 'Ctrl', mono: true };
  const ctrl: ShortcutKey = isMac
    ? { text: '⌃', tooltip: 'Control' }
    : { text: 'Ctrl', mono: true };
  const alt: ShortcutKey = isMac ? { text: '⌥', tooltip: 'Option' } : { text: 'Alt', mono: true };

  const shift: ShortcutKey = isMac ? { text: '⇧', tooltip: 'Shift' } : typed('Shift');
  const enter: ShortcutKey = isMac ? { text: '↩', tooltip: 'Return' } : typed('Enter');

  return [
    {
      title: 'Formatting',
      shortcuts: [
        { label: 'Bold', style: 'bold', keys: [cmd, typed('B')] },
        { label: 'Emphasize', style: 'italic', keys: [cmd, typed('I')] },
        { label: 'Underline', style: 'underline', keys: [cmd, typed('U')] },
        { label: 'Strike through', style: 'strikethrough', keys: [ctrl, alt, typed('U')] },
        { label: 'Highlight', style: 'highlight', keys: [cmd, alt, typed('H')] },
        { label: 'Link', style: 'link', keys: [cmd, typed('K')] },
        { label: 'Inline code', style: 'code', keys: [ctrl, shift, typed('K')] },
        { label: 'List', keys: [ctrl, typed('L')] },
        { label: 'Ordered list', keys: [ctrl, alt, typed('L')] },
        { label: 'Quote', keys: [ctrl, typed('Q')] },
        { label: 'H2', keys: [ctrl, alt, typed('2')] },
        { label: 'H3', keys: [ctrl, alt, typed('3')] },
      ],
    },
    {
      title: 'Editing',
      shortcuts: [
        { label: 'Toggle card edit mode', keys: [cmd, enter] },
        { label: 'Paste without formatting', keys: [cmd, shift, typed('V')] },
        { label: 'Indent', keys: [typed('tab')] },
        { label: 'Unindent', keys: [shift, typed('tab')] },
        { label: 'Line break', keys: [shift, enter] },
        { label: 'Undo', keys: [cmd, typed('Z')] },
        { label: 'Redo', keys: [cmd, shift, typed('Z')] },
      ],
    },
    {
      title: 'Application',
      shortcuts: [
        { label: 'Save', keys: [cmd, typed('S')] },
        { label: 'Preview', keys: [cmd, typed('P')] },
        { label: 'Publish', keys: [cmd, shift, typed('P')] },
      ],
    },
    {
      title: 'Inserting',
      shortcuts: [
        { label: 'Code block', keys: [typed('```'), enter] },
        { label: 'Language code block', keys: [typed('```html'), enter] },
        { label: 'Emoji', keys: [typed(':emoji_name:')] },
        { label: 'Image', keys: [typed('/image')] },
        { label: 'Markdown', keys: [typed('/md')] },
        { label: 'HTML', keys: [typed('/html')] },
        { label: 'Gallery', keys: [typed('/gallery')] },
        {
          label: 'Divider',
          keys: [typed('---'), { text: 'or', mono: true, plain: true }, typed('/hr')],
        },
        { label: 'Bookmark', keys: [typed('/bookmark [url]')] },
        { label: 'Public preview', keys: [typed('/paywall')] },
        { label: 'Button', keys: [typed('/button')] },
        { label: 'Callout', keys: [typed('/callout')] },
        { label: 'Toggle', keys: [typed('/toggle')] },
        { label: 'Video', keys: [typed('/video')] },
        { label: 'Audio', keys: [typed('/audio')] },
        { label: 'File', keys: [typed('/file')] },
        { label: 'Product', keys: [typed('/product')] },
        { label: 'Header', keys: [typed('/header')] },
        { label: 'GIF', keys: [typed('/gif')] },
        { label: 'Signup', keys: [typed('/signup')] },
        { label: 'YouTube', keys: [typed('/youtube [url]')] },
        { label: 'X (Twitter)', keys: [typed('/twitter [url]')] },
        { label: 'Unsplash', keys: [typed('/unsplash')] },
        { label: 'Vimeo', keys: [typed('/vimeo [url]')] },
        { label: 'CodePen', keys: [typed('/codepen [url]')] },
        { label: 'Spotify', keys: [typed('/spotify [url]')] },
        { label: 'SoundCloud', keys: [typed('/soundcloud [url]')] },
        { label: 'Other embed', keys: [typed('/embed [url]')] },
      ],
    },
  ];
}

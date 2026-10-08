export const NEWSLETTER_FONT_OPTIONS = [
  { value: 'serif', label: 'Elegant serif', category: 'serif', family: 'Georgia, serif' },
  {
    value: 'sans_serif',
    label: 'Clean sans-serif',
    category: 'sans_serif',
    family: '-apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
  },
  {
    value: 'verdana',
    label: 'Verdana',
    category: 'sans_serif',
    family: 'Verdana, Geneva, sans-serif',
  },
  {
    value: 'times_new_roman',
    label: 'Times New Roman',
    category: 'serif',
    family: "'Times New Roman', Times, serif",
  },
];

export function getNewsletterFont(id: string | undefined) {
  return NEWSLETTER_FONT_OPTIONS.find((font) => font.value === id) || NEWSLETTER_FONT_OPTIONS[1];
}

// The existing category IDs remain valid so saved newsletter designs need no migration.
export const NEWSLETTER_FONTS = {
  sans_serif: {
    category: 'sans_serif',
    family: '-apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
  },
  serif: { category: 'serif', family: 'Georgia, serif' },
  verdana: { category: 'sans_serif', family: 'Verdana, Geneva, sans-serif' },
  times_new_roman: { category: 'serif', family: "'Times New Roman', Times, serif" },
} as const;

export function getNewsletterFont(id: string | undefined) {
  return (
    Object.entries(NEWSLETTER_FONTS).find(([fontId]) => fontId === id)?.[1] ||
    NEWSLETTER_FONTS.sans_serif
  );
}

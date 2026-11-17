import { Box, Stack, Text } from '@tryghost/shade/primitives';
import { useSearch } from '@/settings/providers/settings-app-context';

interface SearchableSectionProps {
  children?: React.ReactNode;
  keywords: string[];
  title?: string;
}

const SearchableSection: React.FC<SearchableSectionProps> = ({ children, keywords, title }) => {
  const { checkVisible, noResult } = useSearch();
  const isVisible = checkVisible(keywords) || noResult;

  // The parent stack owns the spacing between sections, so it
  // matches the page's top and bottom padding.
  return (
    <Box className={!isVisible ? 'hidden' : undefined}>
      {title && (
        <Text
          as="h2"
          className="settings-heading z-20 mt-[-5px] mb-px pb-10 tracking-tight in-data-[admin7-design=true]:text-[length:var(--large-title-size-sm)] in-data-[admin7-design=true]:leading-[1.15]!"
          leading="heading"
          size="2xl"
          weight="semibold"
        >
          {title}
        </Text>
      )}
      {children && (
        <Stack className="gap-12" gap="none">
          {children}
        </Stack>
      )}
    </Box>
  );
};

export default SearchableSection;

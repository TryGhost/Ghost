import { Box, Stack, Text } from '@tryghost/shade/primitives';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useSearch } from '@/settings/providers/settings-app-context';

interface SearchableSectionProps {
  children?: React.ReactNode;
  keywords: string[];
  title?: string;
}

const SearchableSection: React.FC<SearchableSectionProps> = ({ children, keywords, title }) => {
  const { checkVisible, noResult } = useSearch();
  const admin7Settings = useFeatureFlag('admin7settings');
  const isVisible = checkVisible(keywords) || noResult;

  // In admin7settings the parent stack owns the spacing between sections, so it
  // matches the page's top and bottom padding.
  return (
    <Box className={!isVisible ? 'hidden' : admin7Settings ? undefined : 'mb-[10vh]'}>
      {title && (
        <Text
          as="h2"
          className="z-20 mt-[-5px] mb-px pb-10 tracking-tight"
          leading="heading"
          size="2xl"
          weight="semibold"
        >
          {title}
        </Text>
      )}
      {children && (
        <Stack className={admin7Settings ? 'gap-12' : 'mb-10 gap-12'} gap="none">
          {children}
        </Stack>
      )}
    </Box>
  );
};

export default SearchableSection;

import {Box, Stack, Text} from '@tryghost/shade/primitives';
import {useSearch} from './providers/settings-app-provider';

interface SearchableSectionProps {
    children?: React.ReactNode;
    keywords: string[];
    title?: string;
}

const SearchableSection: React.FC<SearchableSectionProps> = ({children, keywords, title}) => {
    const {checkVisible, noResult} = useSearch();
    const isVisible = checkVisible(keywords) || noResult;

    return (
        <Box className={isVisible ? 'mb-[10vh]' : 'hidden'}>
            {title && (
                <Text as='h2' className='z-20 mt-[-5px] mb-px pb-10 tracking-tight' leading='heading' size='2xl' weight='semibold'>
                    {title}
                </Text>
            )}
            {children && (
                <Stack className='mb-10 gap-12' gap='none'>
                    {children}
                </Stack>
            )}
        </Box>
    );
};

export default SearchableSection;

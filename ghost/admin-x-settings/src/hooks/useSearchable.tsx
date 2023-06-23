import {useSearch} from '../components/providers/ServiceProvider';

const useSearchable = ({keywords}: { keywords: string[] | undefined }) => {
    const {filter} = useSearch();

    if (!filter || !keywords) {
        return {isVisible: true};
    }

    const isVisible = keywords.some(keyword => keyword.toLowerCase().includes(filter.toLowerCase()));

    return {isVisible};
};

export default useSearchable;

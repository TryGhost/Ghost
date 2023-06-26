import {useState} from 'react';

export interface SearchService {
    filter: string;
    setFilter: (value: string) => void;
    checkVisible: (keywords: string[]) => boolean;
}

const useSearchService = () => {
    const [filter, setFilter] = useState('');

    const checkVisible = (keywords: string[]) => {
        if (!keywords.length) {
            return true;
        }

        return keywords.some(keyword => keyword.toLowerCase().includes(filter.toLowerCase()));
    };

    return {
        filter,
        setFilter,
        checkVisible
    };
};

export default useSearchService;

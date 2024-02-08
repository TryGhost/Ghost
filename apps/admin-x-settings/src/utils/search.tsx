import React, {ReactNode, useState} from 'react';

export interface SearchService {
    filter: string;
    setFilter: (value: string) => void;
    checkVisible: (keywords: string[]) => boolean;
    highlightKeywords: (text: ReactNode) => ReactNode;
    noResult: boolean;
    setNoResult: (value: boolean) => void;
}

const useSearchService = () => {
    const [filter, setFilter] = useState('');
    const [noResult, setNoResult] = useState(false);

    const checkVisible = (keywords: string[]) => {
        if (!keywords.length) {
            return true;
        }

        return keywords.some(keyword => keyword.toLowerCase().includes(filter.toLowerCase()));
    };

    const highlightKeywords = (text: ReactNode): ReactNode => {
        if (!filter) {
            return text;
        }

        if (typeof text === 'string') {
            const words = filter.split(/\s+/).map(word => word.toLowerCase());
            const wordsPattern = words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
            const parts = text.split(new RegExp(`(${wordsPattern})`, 'gi'));

            return parts.map(part => (words.includes(part.toLowerCase()) ? <span className='bg-yellow-500/40'>{part}</span> : part));
        } else if (Array.isArray(text)) {
            return text.map(part => highlightKeywords(part));
        } else if (text && typeof text === 'object' && text) {
            return React.Children.map(text, (child) => {
                if (child && typeof child === 'object' && 'props' in child) {
                    return highlightKeywords(child.props.children);
                }
                return child;
            });
        } else {
            return text;
        }
    };

    return {
        filter,
        setFilter,
        checkVisible,
        highlightKeywords,
        noResult,
        setNoResult
    };
};

export default useSearchService;

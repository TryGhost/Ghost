import React, {ReactNode, useCallback, useState} from 'react';

export interface SearchService {
    filter: string;
    setFilter: (value: string) => void;
    checkVisible: (keywords: string[]) => boolean;
    highlightKeywords: (text: ReactNode) => ReactNode;
    noResult: boolean;
    setNoResult: (value: boolean) => void;
    // Component visibility tracking
    registerComponent: (componentId: string) => void;
    unregisterComponent: (componentId: string) => void;
    getVisibleComponents: () => Set<string>;
    isOnlyVisibleComponent: (componentId: string) => boolean;
}

const useSearchService = () => {
    const [filter, setFilter] = useState('');
    const [noResult, setNoResult] = useState(false);
    const [visibleComponents, setVisibleComponents] = useState<Set<string>>(new Set());

    const checkVisible = (keywords: string[]) => {
        if (!keywords.length) {
            return true;
        }

        return keywords.some(keyword => keyword.toLowerCase().includes(filter.toLowerCase()));
    };

    // Register a component
    const registerComponent = useCallback((componentId: string) => {
        setVisibleComponents(prev => new Set(prev).add(componentId));
    }, []);

    // Unregister a component when it unmounts
    const unregisterComponent = useCallback((componentId: string) => {
        setVisibleComponents((prev) => {
            const next = new Set(prev);
            next.delete(componentId);
            return next;
        });
    }, []);

    // Check if a specific component is the only visible one
    const isOnlyVisibleComponent = useCallback((componentId: string) => {
        return visibleComponents.size === 1 && visibleComponents.has(componentId);
    }, [visibleComponents]);

    const getVisibleComponents = useCallback(() => {
        return visibleComponents;
    }, [visibleComponents]);

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
        setNoResult,
        registerComponent,
        unregisterComponent,
        getVisibleComponents,
        isOnlyVisibleComponent
    };
};

export default useSearchService;

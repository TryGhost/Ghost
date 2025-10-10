import React, {ReactNode, useCallback, useEffect, useRef, useState} from 'react';

export type ComponentId = string & { __brand: 'ComponentId' };

export const createComponentId = (base: string, unique: string): ComponentId => {
    return `${base}-${unique}` as ComponentId;
};

export interface SearchService {
    filter: string;
    setFilter: (value: string) => void;
    checkVisible: (keywords: string[]) => boolean;
    highlightKeywords: (text: ReactNode) => ReactNode;
    noResult: boolean;
    setNoResult: (value: boolean) => void;
    registerComponent: (id: ComponentId, keywords: string[]) => void;
    unregisterComponent: (id: ComponentId) => void;
    getVisibleComponents: () => Set<ComponentId>;
    isOnlyVisibleComponent: (id: ComponentId) => boolean;
}

const useSearchService = () => {
    const [filter, setFilter] = useState('');
    const [noResult, setNoResult] = useState(false);
    const registeredComponents = useRef<Map<ComponentId, string[]>>(new Map());
    const [visibleComponents, setVisibleComponents] = useState<Set<ComponentId>>(new Set());

    const checkVisible = (keywords: string[]) => {
        if (!keywords.length) {
            return true;
        }

        return keywords.some(keyword => keyword.toLowerCase().includes(filter.toLowerCase()));
    };

    const registerComponent = useCallback((id: ComponentId, keywords: string[]) => {
        registeredComponents.current.set(id, keywords);
        const isVisible = !filter || keywords.some(keyword => keyword.toLowerCase().includes(filter.toLowerCase()));
        if (isVisible) {
            setVisibleComponents(prev => new Set(prev).add(id));
        }
    }, [filter]);

    const unregisterComponent = useCallback((id: ComponentId) => {
        registeredComponents.current.delete(id);
        setVisibleComponents((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, []);

    useEffect(() => {
        const newVisible = new Set<ComponentId>();
        registeredComponents.current.forEach((keywords, id) => {
            const isVisible = !filter || keywords.some(keyword => keyword.toLowerCase().includes(filter.toLowerCase()));
            if (isVisible) {
                newVisible.add(id);
            }
        });
        setVisibleComponents(newVisible);
    }, [filter]);

    const isOnlyVisibleComponent = useCallback((id: ComponentId) => {
        return visibleComponents.size === 1 && visibleComponents.has(id);
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

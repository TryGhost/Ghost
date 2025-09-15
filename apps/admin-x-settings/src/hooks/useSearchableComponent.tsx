import {useEffect, useId} from 'react';
import {useSearch} from '../components/providers/SettingsAppProvider';

export const useSearchableComponent = (componentName: string, keywords: string[]) => {
    const {registerComponent, unregisterComponent, isOnlyVisibleComponent, checkVisible, filter} = useSearch();
    const componentId = `${componentName}-${useId()}`; // Create a unique ID combining name and React's useId

    useEffect(() => {
        registerComponent(componentId, keywords);
        return () => {
            unregisterComponent(componentId);
        };
    }, [componentId, keywords, registerComponent, unregisterComponent]);

    return {
        isVisible: checkVisible(keywords),
        isOnlyVisible: filter && isOnlyVisibleComponent(componentId),
        hasActiveSearch: !!filter
    };
};
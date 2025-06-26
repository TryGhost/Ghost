import {Navigate} from '@tryghost/admin-x-framework';
import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

/**
 * Custom hook to check if a feature flag is enabled
 * Handles loading states to prevent premature redirects
 * 
 * @param flagName The name of the feature flag to check
 * @param fallbackPath The path to redirect to if feature flag is disabled
 * @returns An object containing the feature flag status and optional component to render
 */
export const useFeatureFlag = (flagName: string, fallbackPath: string) => {
    const {isLoading, settings} = useGlobalData();
    
    // Parse labs settings
    const labsJSON = getSettingValue<string>(settings, 'labs') || '{}';
    let labs: Record<string, unknown> = {};
    
    try {
        labs = JSON.parse(labsJSON);
    } catch (error) {
        // If JSON parsing fails, fall back to empty object
        labs = {};
    }
    
    // Check if the feature flag is enabled
    const isEnabled = labs[flagName] === true;
    
    // If loading, don't make a decision yet
    if (isLoading) {
        return {
            isEnabled: false,
            isLoading: true,
            redirect: null
        };
    }
    
    // If feature flag is disabled, return redirect component
    if (!isEnabled) {
        return {
            isEnabled: false,
            isLoading: false,
            redirect: <Navigate to={fallbackPath} />
        };
    }
    
    // Feature flag is enabled
    return {
        isEnabled: true,
        isLoading: false,
        redirect: null
    };
}; 
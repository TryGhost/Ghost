import {AppContext, AppContextType} from '@tryghost/admin-x-framework';
import {ReactNode, createContext, useContext} from 'react';

export interface PostsAppContextType extends AppContextType {
    fromAnalytics: boolean;
}

const PostsAppContext = createContext<PostsAppContextType | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(PostsAppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

interface PostsAppContextProviderProps {
    children: ReactNode;
    value: Partial<PostsAppContextType>;
}

export const PostsAppContextProvider = ({children, value}: PostsAppContextProviderProps) => {
    // Try to get parent AppContext - will be undefined in standalone mode (e.g. within Ember)
    const parentContext = useContext(AppContext);

    // Determine externalNavigate - prefer local value, fallback to parent
    const externalNavigate = value.externalNavigate ?? parentContext?.externalNavigate;

    if (!externalNavigate) {
        throw new Error('External navigate function is required');
    }

    // Merge parent context with local value, with local value taking precedence
    const mergedValue: PostsAppContextType = {
        externalNavigate,
        fromAnalytics: false,
        ...parentContext,
        ...value
    };

    return <PostsAppContext.Provider value={mergedValue}>
        {children}
    </PostsAppContext.Provider>;
};

export default PostsAppContextProvider;

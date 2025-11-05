import {AppContextType} from '@tryghost/admin-x-framework';
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
    value: PostsAppContextType;
}

export const PostsAppContextProvider = ({children, value}: PostsAppContextProviderProps) => {
    return <PostsAppContext.Provider value={value}>
        {children}
    </PostsAppContext.Provider>;
};

export default PostsAppContextProvider;

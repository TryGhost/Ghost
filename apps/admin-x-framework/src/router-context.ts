import {createContext, RouterContextProvider} from 'react-router';
import {User} from './api/users';

export const user = createContext<User | null>(null);

export function createRouterContext() {
    const routerContext = new RouterContextProvider();
    routerContext.set(user, null);
    return routerContext;
}

import {AppContextType, EditableAppContextType} from './AppContext';
import {Page} from './pages';

export type ActionMethod<T = undefined> = (options: {data: T, state: Omit<AppContextType, 'dispatchAction'>}) => Partial<EditableAppContextType>;

const setPage: ActionMethod<Page> = ({data}) => {
    return {
        page: data
    };
};

export const actions = {
    setPage
};

export type ActionName = keyof typeof actions;
export type DispatchActionMethod = <T extends ActionName>(name: T, data: Parameters<typeof actions[T]>[0]['data']) => void;

import React from 'react';
import pages from './pages';
import {AppContext, EditableAppContextType} from './AppContext';
import {DispatchActionMethod, actions} from './actions';
import {Frame} from './components/Frame';
import {setupGhostApi} from './utils/api';

function App() {
    const [state, setState] = React.useState<EditableAppContextType>({
        page: {
            name: 'form',
            data: {}
        }
    });

    const api = React.useMemo(() => {
        return setupGhostApi({siteUrl: 'https://site.ghost/'});
    }, []);

    const context = {
        page: state.page,
        api
    };

    // Method to call one of the actions defined in the actions object, with one argument being the name of the method, and the second the options.data to pass to the method (using strong typing)
    const dispatchAction: DispatchActionMethod = (name, data) => {
        setState((s) => {
            const updatedState = actions[name]({data, state: context});
            return {...s, ...updatedState};
        });
    };

    const finalContext = {
        ...context,
        dispatchAction
    };

    const PageComponent = pages[state.page.name];
    const data = state.page.data as any; // issue with TypeScript understanding the type here when passing it to the component

    return (
        <div>
            <AppContext.Provider value={finalContext}>
                <Frame>
                    <PageComponent {...data} />
                </Frame>
            </AppContext.Provider>
        </div>
    );
}

export default App;

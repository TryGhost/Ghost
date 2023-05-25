import React, {ComponentProps} from 'react';
import pages, {Page, PageName} from './pages';
import {AppContextProvider} from './AppContext';
import {ContentBox} from './components/ContentBox';
import {Frame} from './components/Frame';
import {setupGhostApi} from './utils/api';
import {useDarkMode} from './utils/darkMode';
import {useOptions} from './utils/options';

type AppProps = {
    scriptTag: HTMLElement;
    root: HTMLElement;
};

const App: React.FC<AppProps> = ({scriptTag, root}) => {
    const options = useOptions(scriptTag);
    const isDarkMode = useDarkMode(options.colorScheme, root);

    const [page, setPage] = React.useState<Page>({
        name: 'FormPage',
        data: {}
    });

    const api = React.useMemo(() => {
        return setupGhostApi({siteUrl: options.site});
    }, [options.site]);

    const _setPage = <T extends PageName>(name: T, data: ComponentProps<typeof pages[T]>) => {
        setPage({
            name,
            data
        } as Page);
    };

    const context = {
        page,
        api,
        options,
        setPage: _setPage
    };

    const PageComponent = pages[page.name];
    const data = page.data as any; // issue with TypeScript understanding the type here when passing it to the component

    return (
        <div>
            <AppContextProvider value={context}>
                <Frame>
                    <ContentBox isDarkMode={isDarkMode}>
                        <PageComponent {...data} />
                    </ContentBox>
                </Frame>
            </AppContextProvider>
        </div>
    );
};

export default App;

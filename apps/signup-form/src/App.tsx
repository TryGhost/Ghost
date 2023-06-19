import React, {ComponentProps} from 'react';
import i18nLib from '@tryghost/i18n';
import pages, {Page, PageName} from './pages';
import {AppContextProvider, AppContextType} from './AppContext';
import {ContentBox} from './components/ContentBox';
import {Frame} from './components/Frame';
import {setupGhostApi} from './utils/api';
import {useOptions} from './utils/options';

type AppProps = {
    scriptTag: HTMLElement;
};

const App: React.FC<AppProps> = ({scriptTag}) => {
    const options = useOptions(scriptTag);

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

    const i18n = i18nLib(options.locale, 'signup-form');
    const context: AppContextType = {
        page,
        api,
        options,
        setPage: _setPage,
        t: i18n.t,
        scriptTag
    };

    const PageComponent = pages[page.name];
    const data = page.data as any; // issue with TypeScript understanding the type here when passing it to the component
    return (
        <>
            <AppContextProvider value={context}>
                <Frame>
                    <ContentBox>
                        <PageComponent {...data} />
                    </ContentBox>
                </Frame>
            </AppContextProvider>
        </>
    );
};

export default App;

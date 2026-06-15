import {ComponentProps, useMemo, useState, useEffect, type ReactElement} from 'react';
import {AppContextProvider, type SetPage} from './app-context';
import {Frame} from './components/Frame';
import pages, {type Page, type PageName} from './pages';
import {FormPage} from './components/pages/FormPage';
import {SuccessPage} from './components/pages/SuccessPage';
import {setupGhostApi} from './utils/api';
import {useOptions} from './utils/options';
import {identityTranslator, loadTranslator, type Translator} from './utils/i18n';

interface AppProps {
    scriptTag: HTMLElement;
}

export function App({scriptTag}: AppProps): ReactElement {
    const options = useOptions(scriptTag);

    const [page, setPageState] = useState<Page>({
        name: 'FormPage',
        data: {}
    });

    const [t, setT] = useState<Translator>(() => identityTranslator);

    const api = useMemo(
        () => setupGhostApi({siteUrl: options.site}),
        [options.site]
    );

    // Load locale strings from the Ghost site whenever the locale or site URL
    // changes. Starts with the identity translator; replaces once the fetch resolves.
    useEffect(() => {
        let cancelled = false;
        loadTranslator(options.site, options.locale).then((translator) => {
            if (!cancelled) setT(() => translator);
        });
        return () => {
            cancelled = true;
        };
    }, [options.site, options.locale]);

    const setPage: SetPage = <T extends PageName>(
        name: T,
        data: ComponentProps<(typeof pages)[T]>
    ) => {
        setPageState({name, data} as Page);
    };

    return (
        <AppContextProvider
            value={{
                page,
                setPage,
                options,
                api,
                t,
                scriptTag
            }}
        >
            <Frame>
                <section>
                    <PageRenderer page={page} />
                </section>
            </Frame>
        </AppContextProvider>
    );
}

/**
 * Renders the active page by switching on the discriminated Page union.
 * Props are passed explicitly for each case so TypeScript can narrow to the
 * correct shape — spreading `page.data` directly hits a TS limitation where
 * the narrowed type is still seen as `unknown` at the spread site.
 */
function PageRenderer({page}: {page: Page}): ReactElement {
    switch (page.name) {
    case 'FormPage':
        return <FormPage />;
    case 'SuccessPage':
        return <SuccessPage email={page.data.email} />;
    }
}

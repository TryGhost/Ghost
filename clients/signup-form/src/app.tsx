import * as i18nLibModule from '@tryghost/i18n/registry/signup-form';
import pages, { type Page, type PageName } from './pages';
import { AppContextProvider, type AppContextType } from './app-context';
import { ContentBox } from './components/content-box';
import { Frame } from './components/frame';
import { setupGhostApi } from './utils/api';
import { useMemo, useState } from 'preact/hooks';
import { useOptions } from './utils/options';
import type { ComponentProps } from 'preact';

const i18nLib = 'default' in i18nLibModule ? Reflect.get(i18nLibModule, 'default') : i18nLibModule;

type AppProps = {
  scriptTag: HTMLElement;
};

const App = ({ scriptTag }: AppProps) => {
  const options = useOptions(scriptTag);

  const [page, setPage] = useState<Page>({
    name: 'FormPage',
    data: {},
  });

  const api = useMemo(() => {
    return setupGhostApi({ siteUrl: options.site });
  }, [options.site]);

  const _setPage = <T extends PageName>(name: T, data: ComponentProps<(typeof pages)[T]>) => {
    setPage({
      name,
      data,
    } as Page);
  };

  const i18n = i18nLib(options.locale, 'signup-form');
  const context: AppContextType = {
    page,
    api,
    options,
    setPage: _setPage,
    t: i18n.t,
    scriptTag,
  };

  const PageComponent = pages[page.name];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

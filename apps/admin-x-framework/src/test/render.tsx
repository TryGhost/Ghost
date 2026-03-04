import {DesignSystemAppProps} from '@tryghost/admin-x-design-system';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {TopLevelFrameworkProps} from '../providers/framework-provider';

const fetchKoenigLexical: DesignSystemAppProps['fetchKoenigLexical'] = async () => {
    // @ts-expect-error koenig-lexical doesn't currently ship TypeScript declarations.
    return await import('@tryghost/koenig-lexical');
};

export default function renderStandaloneApp<Props extends object>(
    App: React.ComponentType<Props & {
        framework: TopLevelFrameworkProps;
        designSystem: DesignSystemAppProps;
    }>,
    props: Props
) {
    const style = document.createElement('style');
    style.appendChild(document.createTextNode(`
        :root {
            font-size: 62.5%;
            line-height: 1.5;
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%;

            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            -webkit-text-size-adjust: 100%;
        }

        html, body, #root {
            width: 100%;
            height: 100%;
            margin: 0;
            letter-spacing: unset;
        }
    `));
    document.head.appendChild(style);

    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
        <React.StrictMode>
            <App
                designSystem={{darkMode: false, fetchKoenigLexical}}
                framework={{
                    externalNavigate: (link) => {
                        // Use the expectExternalNavigate helper to test this dummy external linking
                        document.body.dataset.externalNavigate = JSON.stringify(link);
                    },
                    ghostVersion: '5.x',
                    sentryDSN: null,
                    unsplashConfig: {
                        Authorization: '',
                        'Accept-Version': '',
                        'Content-Type': '',
                        'App-Pragma': '',
                        'X-Unsplash-Cache': false
                    },
                    onDelete: () => {},
                    onInvalidate: () => {},
                    onUpdate: () => {}
                }}
                {...props}
            />
        </React.StrictMode>
    );
}

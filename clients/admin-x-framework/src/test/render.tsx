import React from 'react';
import ReactDOM from 'react-dom/client';
import { TopLevelFrameworkProps } from '../providers/framework-provider';

export default function renderStandaloneApp<Props extends object>(
  App: React.ComponentType<Props & { framework: TopLevelFrameworkProps }>,
  props: Props,
) {
  const style = document.createElement('style');
  style.appendChild(
    document.createTextNode(`
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
    `),
  );
  document.head.appendChild(style);

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App
        framework={{
          ghostVersion: '5.x',
          unsplashConfig: {
            Authorization: '',
            'Accept-Version': '',
            'Content-Type': '',
            'App-Pragma': '',
            'X-Unsplash-Cache': false,
          },
        }}
        {...props}
      />
    </React.StrictMode>,
  );
}

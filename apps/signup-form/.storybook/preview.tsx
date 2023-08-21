import React from 'react';
import i18nLib from '@tryghost/i18n';

import type {Preview} from "@storybook/react";
import './storybook.css';
import {AppContextProvider, AppContextType} from '../src/AppContext';

const transparencyGrid = `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ctitle%3ERectangle%3C/title%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpath fill='%23F2F6F8' d='M0 0h24v24H0z'/%3E%3Cpath fill='%23E5ECF0' d='M0 0h12v12H0zM12 12h12v12H12z'/%3E%3C/g%3E%3C/svg%3E")`

const preview: Preview = {
    parameters: {
        actions: {argTypesRegex: "^on[A-Z].*"},
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/,
            },
        },
        options: {
            storySort: {
                order: ['Global', 'Settings', 'Experimental'],
            },
        },
    },
    globalTypes: {
        locale: {
            description: 'Internationalization locale',
            defaultValue: 'en',
            toolbar: {
                icon: 'globe',
                items: [
                    {value: 'en', right: '🇺🇸', title: 'English'},
                    {value: 'nl', right: '🇳🇱', title: 'Nederlands'},
                ],
            },
        },
    },
    decorators: [
        (Story, context) => (
            <div className="signup-form" style={{
                padding: '24px',
                backgroundImage: context.tags.includes('transparency-grid') ? transparencyGrid : undefined
            }}>
                {/* 👇 Decorators in Storybook also accept a function. Replace <Story/> with Story() to enable it  */}
                <Story />
            </div>
        ),

        (Story, {context, globals}) => {
            const i18n = i18nLib(globals.locale || 'en', 'signup-form');
            const c: AppContextType = {
                page: {
                    name: 'FormPage',
                    data: {}
                },
                setPage: () => { },
                api: {
                    sendMagicLink: async () => {
                        // Sleep to ensure the loading state is visible enough
                        await new Promise((resolve) => {
                            setTimeout(resolve, 2000);
                        });

                        return true;
                    }
                },
                t: i18n.t,
                scriptTag: document.createElement('div'),
                options: {
                    site: 'localhost',
                    locale: globals.locale || 'en',
                    title: 'Signup Forms Weekly',
                    description: 'An independent publication about embeddable signup forms.',
                    buttonColor: '#121212',
                    backgroundColor: '#ffffff',
                    labels: [],
                    ...context
                }
            };

            return (<AppContextProvider value={c}>
                {/* 👇 Decorators in Storybook also accept a function. Replace <Story/> with Story() to enable it  */}
                <Story />
            </AppContextProvider>);
        }
    ],
};
export default preview;

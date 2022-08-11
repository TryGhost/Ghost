import {render, within} from '@testing-library/react';
import App from './App';
import {ROOT_DIV_ID} from './utils/constants';
import {buildComment} from './utils/test-utils';

const sinon = require('sinon');

function renderApp({member = null, documentStyles = {}, props = {}} = {}) {
    const postId = 'my-post';
    const api = {
        init: async () => {
            return {
                member
            };
        },
        comments: {
            count: async () => {
                return {
                    [postId]: 0
                };
            },
            browse: async () => {
                return {
                    comments: [],
                    meta: {
                        pagination: {
                            total: 0,
                            next: null,
                            prev: null,
                            page: 1
                        }
                    }
                };
            }
        }
    };
    // In tests, we currently don't wait for the styles to have loaded. In the app we check if the styles url is set or not.
    const stylesUrl = '';
    const {container} = render(<div style={documentStyles}><div id={ROOT_DIV_ID}><App api={api} stylesUrl={stylesUrl} {...props}/></div></div>);
    const iframeElement = container.querySelector('iframe[title="comments-box"]');
    expect(iframeElement).toBeInTheDocument();
    const iframeDocument = iframeElement.contentDocument;

    return {container, api, iframeDocument};
}

describe('Auth frame', () => {
    it('renders the auth frame', () => {
        const {container} = renderApp();
        const iframeElement = container.querySelector('iframe[data-frame="admin-auth"]');
        expect(iframeElement).toBeInTheDocument();
    });
});

describe('Dark mode', () => {
    it('uses dark mode when container has a light text color', async () => {
        const {iframeDocument} = renderApp({documentStyles: {
            color: '#FFFFFF'
        }});
        const darkModeCommentsBox = await within(iframeDocument).findByTestId('comments-box');
        expect(darkModeCommentsBox.classList).toContain('dark');
    });
    it('uses dark mode when container has a dark text color', async () => {
        const {iframeDocument} = renderApp({documentStyles: {
            color: '#000000'
        }});
        const darkModeCommentsBox = await within(iframeDocument).findByTestId('comments-box');
        expect(darkModeCommentsBox.classList).not.toContain('dark');
    });
    it('uses dark mode when custom mode has been passed as a property', async () => {
        const {iframeDocument} = renderApp({
            props: {
                colorScheme: 'dark'
            }
        });
        const darkModeCommentsBox = await within(iframeDocument).findByTestId('comments-box');
        expect(darkModeCommentsBox.classList).toContain('dark');
    });
    it('uses light mode when custom mode has been passed as a property', async () => {
        const {iframeDocument} = renderApp({
            props: {
                colorScheme: 'light'
            },
            color: '#FFFFFF'
        });
        const darkModeCommentsBox = await within(iframeDocument).findByTestId('comments-box');
        expect(darkModeCommentsBox.classList).not.toContain('dark');
    });
});

describe('Comments', () => {
    it('renders comments', async () => {
        const {api, iframeDocument} = renderApp();
        sinon.stub(api.comments, 'browse').callsFake(() => {
            return {
                comments: [
                    buildComment({html: '<p>This is a comment body</p>'})
                ],
                meta: {
                    pagination: {
                        total: 1,
                        next: null,
                        prev: null,
                        page: 1
                    }
                }
            };
        });

        const commentBody = await within(iframeDocument).findByText(/This is a comment body/i);
        expect(commentBody).toBeInTheDocument();
    });
});

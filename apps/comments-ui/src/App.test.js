import {render, within} from '@testing-library/react';
import App from './App';
import {ROOT_DIV_ID} from './utils/constants';
import {buildComment} from './utils/test-utils';

const sinon = require('sinon');

function renderApp({member = null} = {}) {
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
    const {container} = render(<div><div id={ROOT_DIV_ID}></div><App api={api} stylesUrl={stylesUrl}/></div>);
    return {container, api};
}

describe('Auth frame', () => {
    it('renders the auth frame', () => {
        const {container} = renderApp();
        const iframeElement = container.querySelector('iframe[data-frame="admin-auth"]');
        expect(iframeElement).toBeInTheDocument();
    });
});

describe('Dark mode', () => {
    it.todo('uses dark mode when container has a dark background');
    it.todo('uses light mode when container has a light background');
    it.todo('uses custom mode when custom mode has been passed as a property');
});

describe('Comments', () => {
    it('renders comments', async () => {
        const {container, api} = renderApp();
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

        const iframeElement = container.querySelector('iframe[title="comments-box"]');
        expect(iframeElement).toBeInTheDocument();
        const iframeDocument = iframeElement.contentDocument;
        const commentBody = await within(iframeDocument).findByText(/This is a comment body/i);
        expect(commentBody).toBeInTheDocument();
    });
});

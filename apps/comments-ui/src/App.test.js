import {render, within} from '@testing-library/react';
import App from './App';
import {ROOT_DIV_ID} from './utils/constants';

/*test('renders the auth frame', () => {
    const {container} = render(<App />);
    const iframeElement = container.querySelector('iframe[data-frame="admin-auth"]');
    expect(iframeElement).toBeInTheDocument();
});*/

describe('Dark mode', () => {
    it.todo('uses dark mode when container has a dark background');
    it.todo('uses light mode when container has a light background');
    it.todo('uses custom mode when custom mode has been passed as a property');
});

describe('Comments', () => {
    it('renders comments', async () => {
        const postId = 'my-post';
        const member = null;
        const api = {
            init: async () => {
                return {
                    member
                };
            },
            comments: {
                count: async () => {
                    return {
                        [postId]: 1
                    };
                },
                browse: async () => {
                    return {
                        comments: [
                            {
                                id: 'test',
                                html: '<p>This is a comment body</p>',
                                replies: [],
                                count: {
                                    replies: 0,
                                    likes: 0
                                },
                                liked: false,
                                created_at: '2022-08-11T09:26:34.000Z',
                                edited_at: null,
                                member: {
                                    avatar_image: '',
                                    bio: 'Hello world codoof',
                                    id: '62d6c6564a14e6a4b5e97c43',
                                    name: 'dtt2',
                                    uuid: '613e9667-4fa2-4ff4-aa62-507220103d41'
                                },
                                status: 'published'
                            }
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
                }
            }
        };
        const stylesUrl = '';
        const {container} = render(<div><div id={ROOT_DIV_ID}></div><App api={api} stylesUrl={stylesUrl}/></div>);

        const iframeElement = container.querySelector('iframe[title="comments-box"]');
        expect(iframeElement).toBeInTheDocument();
        const iframeDocument = iframeElement.contentDocument;
        const commentBody = await within(iframeDocument).findByText(/This is a comment body/i);
        expect(commentBody).toBeInTheDocument();
    });
});

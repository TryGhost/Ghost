import {render, within, waitFor, act, fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import {ROOT_DIV_ID} from './utils/constants';
import {buildComment, buildMember} from './utils/test-utils';

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
                            limit: 5,
                            total: 0,
                            next: null,
                            prev: null,
                            page: 1
                        }
                    }
                };
            },
            add: async ({comment}) => {
                return {
                    comments: [
                        {
                            ...buildComment(),
                            ...comment,
                            member,
                            replies: [],
                            liked: false,
                            count: {
                                likes: 0
                            }
                        }
                    ]
                };
            },
            replies: async () => {
                return {
                    comments: [],
                    meta: {
                        pagination: {
                            limit: 3,
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

beforeEach(() => {
    window.scrollTo = jest.fn();
});

afterEach(() => {
    jest.restoreAllMocks();
});

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
        jest.spyOn(api.comments, 'browse').mockImplementation(() => {
            return {
                comments: [
                    buildComment({html: '<p>This is a comment body</p>'})
                ],
                meta: {
                    pagination: {
                        limit: 5,
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

    it('shows pagination button on top', async () => {
        const user = userEvent.setup();
        const limit = 5;

        const {api, iframeDocument} = renderApp();
        jest.spyOn(api.comments, 'browse').mockImplementation(({page}) => {
            if (page === 2) {
                return {
                    comments: new Array(1).fill({}).map(() => buildComment({html: '<p>This is a paginated comment</p>'})),
                    meta: {
                        pagination: {
                            limit,
                            total: limit + 1,
                            next: null,
                            prev: 1,
                            page
                        }
                    }
                };
            }
            return {
                comments: new Array(limit).fill({}).map(() => buildComment({html: '<p>This is a comment body</p>'})),
                meta: {
                    pagination: {
                        limit,
                        total: limit + 1,
                        next: 2,
                        prev: null,
                        page
                    }
                }
            };
        });

        const comments = await within(iframeDocument).findAllByText(/This is a comment body/i);
        expect(comments).toHaveLength(limit);
        const button = await within(iframeDocument).findByText(/Show 1 previous comment/i);

        await user.click(button);
        await within(iframeDocument).findByText(/This is a paginated comment/i);
        expect(button).not.toBeInTheDocument();
    });

    it('can handle deleted members', async () => {
        const limit = 5;

        const {api, iframeDocument} = renderApp();
        jest.spyOn(api.comments, 'browse').mockImplementation(({page}) => {
            return {
                comments: new Array(limit).fill({}).map(() => buildComment({html: '<p>This is a comment body</p>', member: null})),
                meta: {
                    pagination: {
                        limit,
                        total: limit + 1,
                        next: 2,
                        prev: null,
                        page
                    }
                }
            };
        });

        const comments = await within(iframeDocument).findAllByText(/This is a comment body/i);
        expect(comments).toHaveLength(limit);
    });

    it('shows a different UI when not logged in', async () => {
        const limit = 5;

        const {api, iframeDocument} = renderApp();
        jest.spyOn(api.comments, 'browse').mockImplementation(({page}) => {
            if (page === 2) {
                throw new Error('Not requested');
            }
            return {
                comments: new Array(limit).fill({}).map(() => buildComment({html: '<p>This is a comment body</p>'})),
                meta: {
                    pagination: {
                        limit,
                        total: limit + 1,
                        next: 2,
                        prev: null,
                        page
                    }
                }
            };
        });

        const comments = await within(iframeDocument).findAllByText(/This is a comment body/i);
        expect(comments).toHaveLength(limit);

        // Does not show the reply buttons if not logged in
        const replyButton = within(iframeDocument).queryByTestId('reply-button');
        expect(replyButton).toBeNull(); // it doesn't exist

        // Does not show the main form
        const form = within(iframeDocument).queryByTestId('form');
        expect(form).toBeNull(); // it doesn't exist

        // todo: Does show the CTA
    });

    it('can reply to a comment', async () => {
        const limit = 5;
        const member = buildMember();

        const {api, iframeDocument} = renderApp({
            member
        });

        jest.spyOn(api.comments, 'browse').mockImplementation(({page}) => {
            if (page === 2) {
                throw new Error('Not requested');
            }
            return {
                comments: new Array(limit).fill({}).map(() => buildComment({html: '<p>This is a comment body</p>'})),
                meta: {
                    pagination: {
                        limit,
                        total: limit + 1,
                        next: 2,
                        prev: null,
                        page
                    }
                }
            };
        });

        const repliesSpy = jest.spyOn(api.comments, 'replies');

        const comments = await within(iframeDocument).findAllByTestId('comment-component');
        expect(comments).toHaveLength(limit);

        // Does show the main form
        const form = within(iframeDocument).queryByTestId('form');
        expect(form).toBeInTheDocument();

        const replyButton = within(comments[0]).queryByTestId('reply-button');
        expect(replyButton).toBeInTheDocument();

        await userEvent.click(replyButton);

        const replyForm = within(comments[0]).queryByTestId('form');
        expect(replyForm).toBeInTheDocument();

        // todo: Check if the main form has been hidden

        expect(repliesSpy).toBeCalledTimes(1);

        // Enter some text

        const editor = replyForm.querySelector('[contenteditable="true"]');

        await act(async () => {
            await userEvent.type(editor, '> This is a quote');
            fireEvent.keyDown(editor, {key: 'Enter', code: 'Enter', charCode: 13});
            fireEvent.keyDown(editor, {key: 'Enter', code: 'Enter', charCode: 13});
            await userEvent.type(editor, 'This is a reply');
        });

        // Press save
        const submitButton = within(replyForm).queryByTestId('submit-form-button');
        expect(submitButton).toBeInTheDocument();

        await userEvent.click(submitButton);

        // Form should get removed
        await waitFor(() => {
            expect(replyForm).not.toBeInTheDocument();
        });

        // Check if reply is visible
        const replies = within(comments[0]).queryAllByTestId('comment-component');
        expect(replies).toHaveLength(1);

        const content = within(replies[0]).queryByTestId('comment-content');
        expect(content.innerHTML).toEqual('<blockquote><p>This is a quote</p></blockquote><p></p><p>This is a reply</p>');

        // Check if pagination button is NOT visible
        const replyPagination = within(iframeDocument).queryByTestId('reply-pagination-button');
        expect(replyPagination).toBeNull(); // it doesn't exist
    });
});

import * as vi from 'vitest';
import {setupAdminAPI} from './adminApi';

describe('setupAdminAPI', () => {
    let addEventListenerSpy: vi.SpyInstance;
    let postMessageMock: vi.Mock;
    let frame: HTMLIFrameElement;

    beforeEach(() => {
        frame = document.createElement('iframe');
        frame.dataset.frame = 'admin-auth';
        Object.defineProperty(frame, 'contentWindow', {
            value: {
                postMessage: vi.vitest.fn()
            },
            writable: false
        });

        document.body.appendChild(frame);

        // Mock window.addEventListener - at runtime this gets injected into the theme.
        // from here https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/frontend/src/admin-auth/message-handler.js
        // In which case, we have to mock it in order to test it.
        addEventListenerSpy = vi.vitest.spyOn(window, 'addEventListener');
        postMessageMock = frame.contentWindow!.postMessage as vi.Mock;
    });

    afterEach(() => {
        // Restore mocks and remove iframe
        vi.vitest.restoreAllMocks();
        frame.remove();
    });

    it('can call getUser', async () => {
        const adminUrl = 'https://example.com';
        const api = setupAdminAPI({adminUrl});

        const apiPromise = api.getUser();

        const eventHandler = addEventListenerSpy.mock.calls.find(
            ([eventType]) => eventType === 'message'
        )?.[1];

        const mockEvent = new MessageEvent('message', {
            origin: new URL(adminUrl).origin,
            data: JSON.stringify({
                uid: 2,
                result: {
                    users: [{id: 1, name: 'Test User'}]
                }
            })
        });

        eventHandler!(mockEvent);

        const user = await apiPromise;

        expect(user).toEqual({id: 1, name: 'Test User'});

        expect(postMessageMock).toHaveBeenCalledWith(
            JSON.stringify({uid: 2, action: 'getUser'}),
            new URL(adminUrl).origin
        );
    });

    it('can call hideComment', async () => {
        const adminUrl = 'https://example.com';
        const api = setupAdminAPI({adminUrl});

        const apiPromise = api.hideComment('123');

        const eventHandler = addEventListenerSpy.mock.calls.find(
            ([eventType]) => eventType === 'message'
        )?.[1];

        const mockEvent = new MessageEvent('message', {
            origin: new URL(adminUrl).origin,
            data: JSON.stringify({
                uid: 2,
                result: {success: true} // not the actual endpoint, we're just testing the event listener
            })
        });

        eventHandler!(mockEvent);

        const result = await apiPromise;

        expect(result).toEqual({success: true});

        expect(postMessageMock).toHaveBeenCalledWith(
            JSON.stringify({uid: 2, action: 'hideComment', id: '123'}),
            new URL(adminUrl).origin
        );
    });

    it('can call showComment', async () => {
        const adminUrl = 'https://example.com';
        const api = setupAdminAPI({adminUrl});

        const apiPromise = api.showComment('123');

        const eventHandler = addEventListenerSpy.mock.calls.find(
            ([eventType]) => eventType === 'message'
        )?.[1];

        const mockEvent = new MessageEvent('message', {
            origin: new URL(adminUrl).origin,
            data: JSON.stringify({
                uid: 2,
                result: {success: true} // not the actual data, we're just testing the event listener and functions execution
            })
        });

        eventHandler!(mockEvent);

        const result = await apiPromise;

        expect(result).toEqual({success: true});

        expect(postMessageMock).toHaveBeenCalledWith(
            JSON.stringify({uid: 2, action: 'showComment', id: '123'}),
            new URL(adminUrl).origin
        );
    });

    it('can call browse', async () => {
        const adminUrl = 'https://example.com';
        const api = setupAdminAPI({adminUrl});

        const apiPromise = api.browse({page: 1, postId: '123', order: 'asc'});

        const eventHandler = addEventListenerSpy.mock.calls.find(
            ([eventType]) => eventType === 'message'
        )?.[1];

        const mockEvent = new MessageEvent('message', {
            origin: new URL(adminUrl).origin,
            data: JSON.stringify({
                uid: 2,
                result: {
                    comments: [{id: 1, body: 'Test Comment'}],
                    meta: {
                        pagination: {
                            page: 1,
                            limit: 15,
                            pages: 1,
                            total: 1
                        }
                    }
                }
            })
        });

        eventHandler!(mockEvent);

        const result = await apiPromise;

        expect(result).toEqual({
            comments: [{id: 1, body: 'Test Comment'}],
            meta: {
                pagination: {
                    page: 1,
                    limit: 15,
                    pages: 1,
                    total: 1
                }
            }
        });

        expect(postMessageMock).toHaveBeenCalledWith(
            JSON.stringify({uid: 2, action: 'browseComments', postId: '123', params: 'limit=20&page=1&order=asc'}),
            new URL(adminUrl).origin
        );
    });

    it('can call replies', async () => {
        const adminUrl = 'https://example.com';
        const api = setupAdminAPI({adminUrl});

        const apiPromise = api.replies({commentId: '123', afterReplyId: '456', limit: 10});

        const eventHandler = addEventListenerSpy.mock.calls.find(
            ([eventType]) => eventType === 'message'
        )?.[1];

        const mockEvent = new MessageEvent('message', {
            origin: new URL(adminUrl).origin,
            data: JSON.stringify({
                uid: 2,
                result: {
                    comments: [{id: 1, body: 'Test Reply'}]
                }
            })
        });

        eventHandler!(mockEvent);

        const result = await apiPromise;

        expect(result).toEqual({
            comments: [{id: 1, body: 'Test Reply'}]
        });

        expect(postMessageMock).toHaveBeenCalledWith(
            JSON.stringify({
                uid: 2,
                action: 'getReplies',
                commentId: '123',
                params: 'limit=10&filter=id%3A%3E%27456%27'
            }),
            new URL(adminUrl).origin
        );
    });

    it('can call read', async () => {
        const adminUrl = 'https://example.com';
        const api = setupAdminAPI({adminUrl});

        const apiPromise = api.read({commentId: '123'});

        const eventHandler = addEventListenerSpy.mock.calls.find(
            ([eventType]) => eventType === 'message'
        )?.[1];

        const mockEvent = new MessageEvent('message', {
            origin: new URL(adminUrl).origin,
            data: JSON.stringify({
                uid: 2,
                result: {
                    comments: [{id: 1, body: 'Test Comment'}]
                }
            })
        });

        eventHandler!(mockEvent);

        const result = await apiPromise;

        expect(result).toEqual({comments: [{id: 1, body: 'Test Comment'}]});

        expect(postMessageMock).toHaveBeenCalledWith(
            JSON.stringify({uid: 2, action: 'readComment', commentId: '123'}),
            new URL(adminUrl).origin
        );
    });

    it('should call postMessage with the correct data on API call', async () => {
        const adminUrl = 'https://example.com';
        const api = setupAdminAPI({adminUrl});

        // Simulate an API call
        const apiPromise = api.getUser();

        // Simulate a message event to resolve the promise
        const eventHandler = addEventListenerSpy.mock.calls.find(
            ([eventType]) => eventType === 'message'
        )?.[1];

        const mockEvent = new MessageEvent('message', {
            origin: new URL(adminUrl).origin,
            data: JSON.stringify({
                uid: 2, // Mock UID from the handler
                result: {
                    users: [{id: 1, name: 'Test User'}]
                }
            })
        });

        // Trigger the event handler manually
        eventHandler!(mockEvent);

        // Await the result
        const user = await apiPromise;

        expect(user).toEqual({id: 1, name: 'Test User'});
        expect(postMessageMock).toHaveBeenCalledWith(
            JSON.stringify({uid: 2, action: 'getUser'}),
            new URL(adminUrl).origin
        );
    });

    it('should reject the promise if an error occurs', async () => {
        const adminUrl = 'https://example.com';
        const api = setupAdminAPI({adminUrl});

        // Simulate an API call
        const apiPromise = api.getUser();

        // Simulate a message event with an error
        const eventHandler = addEventListenerSpy.mock.calls.find(
            ([eventType]) => eventType === 'message'
        )?.[1];

        const mockEvent = new MessageEvent('message', {
            origin: new URL(adminUrl).origin,
            data: JSON.stringify({
                uid: 2, // Mock UID from the handler
                error: {message: 'Test Error'}
            })
        });

        // Trigger the event handler manually
        eventHandler!(mockEvent);

        await expect(apiPromise).rejects.toEqual({message: 'Test Error'});
    });

    it('should ignore messages from an invalid origin', async () => {
        const adminUrl = 'https://example.com';
        const api = setupAdminAPI({adminUrl});

        const apiPromise = api.getUser();

        // Simulate a message event from an invalid origin
        const eventHandler = addEventListenerSpy.mock.calls.find(
            ([eventType]) => eventType === 'message'
        )?.[1];

        const mockEvent = new MessageEvent('message', {
            origin: 'https://invalid.com',
            data: JSON.stringify({
                uid: 2,
                result: {users: [{id: 1, name: 'Invalid User'}]}
            })
        });

        // Trigger the event handler manually
        eventHandler!(mockEvent);

        // Ensure the promise doesn't resolve
        await expect(Promise.race([apiPromise, Promise.resolve('unresolved')])).resolves.toBe('unresolved');
    });
});

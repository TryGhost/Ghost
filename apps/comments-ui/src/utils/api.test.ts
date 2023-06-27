/* eslint-disable no-undef */
import setupGhostApi from './api';

test('should call counts endpoint', () => {
    const spy = vi.spyOn(window, 'fetch');
    spy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({success: true})
    } as any);

    const api = setupGhostApi({siteUrl: 'http://localhost:3000', apiUrl: '', apiKey: ''});

    api.comments.count({postId: null});

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
        'http://localhost:3000/members/api/comments/counts/',
        expect.objectContaining({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            credentials: 'same-origin',
            body: undefined
        })
    );
});

test('should call counts endpoint with postId query param', () => {
    const spy = vi.spyOn(window, 'fetch');
    spy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({success: true})
    } as any);

    const api = setupGhostApi({siteUrl: 'http://localhost:3000', apiUrl: '', apiKey: ''});

    api.comments.count({postId: '123'});

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
        'http://localhost:3000/members/api/comments/counts/?ids=123',
        expect.objectContaining({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            credentials: 'same-origin',
            body: undefined
        })
    );
});

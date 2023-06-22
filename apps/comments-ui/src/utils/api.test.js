import setupGhostApi from './api';

test('should call counts endpoint', () => {
    jest.spyOn(window, 'fetch');
    window.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({success: true})
    });

    const api = setupGhostApi({});

    api.comments.count({postId: null});

    expect(window.fetch).toHaveBeenCalledTimes(1);
    expect(window.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/members/api/comments/counts/',
        expect.objectContaining({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            credentials: 'same-origin',
            body: undefined
        }),
    );
});

test('should call counts endpoint with postId query param', () => {
    jest.spyOn(window, 'fetch');
    window.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({success: true})
    });

    const api = setupGhostApi({});

    api.comments.count({postId: '123'});

    expect(window.fetch).toHaveBeenCalledTimes(1);
    expect(window.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/members/api/comments/counts/?ids=123',
        expect.objectContaining({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            credentials: 'same-origin',
            body: undefined
        }),
    );
});

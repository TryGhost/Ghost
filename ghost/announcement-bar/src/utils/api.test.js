import setupGhostApi from './api';

test('should call settings endpoint on init', () => {
    jest.spyOn(window, 'fetch');
    window.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({success: true})
    });

    const api = setupGhostApi({apiKey: 'key', apiUrl: 'http://localhost'});

    api.init();

    expect(window.fetch).toHaveBeenCalledTimes(1);
    expect(window.fetch).toHaveBeenCalledWith(
        'http://localhost/settings/?key=key&keys=announcement,announcement_background',
        expect.objectContaining({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            credentials: undefined,
            body: undefined
        }),
    );
});

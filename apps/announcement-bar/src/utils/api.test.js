import setupGhostApi from './api';

test('should call settings endpoint on init', () => {
    jest.spyOn(window, 'fetch');
    window.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
            announcement: [{
                announcement_content: '<p>Test announcement</p>',
                announcement_background: 'dark'
            }]
        })
    });

    const api = setupGhostApi({apiKey: 'key', apiUrl: 'http://localhost/members/api/announcement/'});

    api.init();

    expect(window.fetch).toHaveBeenCalledTimes(1);
    expect(window.fetch).toHaveBeenCalledWith(
        'http://localhost/members/api/announcement/',
        expect.objectContaining({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            credentials: undefined,
            body: undefined
        }),
    );
});

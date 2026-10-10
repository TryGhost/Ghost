import setupGhostApi from '../../src/utils/api';

test('calls settings endpoint on init', async () => {
  const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValueOnce(
    Response.json({
      announcement: [
        {
          announcement_content: '<p>Test announcement</p>',
          announcement_background: 'dark',
        },
      ],
    }),
  );

  const api = setupGhostApi({
    apiUrl: 'http://localhost/members/api/announcement/',
  });

  await api.init();

  expect(fetchSpy).toHaveBeenCalledTimes(1);
  expect(fetchSpy).toHaveBeenCalledWith(
    'http://localhost/members/api/announcement/',
    expect.objectContaining({
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: undefined,
      body: undefined,
    }),
  );
});

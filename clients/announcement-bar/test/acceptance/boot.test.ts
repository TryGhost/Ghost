const SCRIPT_ATTRIBUTES = {
  'data-announcement-bar': 'https://site.test/',
  'data-api-url': 'https://site.test/members/api/announcement/',
  'data-preview': 'true',
  'data-announcement': '<p>Preview from the script tag</p>',
  'data-announcement-background': 'accent',
};

test('boots from the script tag into a root prepended to the body', async () => {
  sessionStorage.clear();
  document.body.appendChild(document.createElement('main'));

  const script = document.createElement('script');
  for (const [name, value] of Object.entries(SCRIPT_ATTRIBUTES)) {
    script.setAttribute(name, value);
  }
  document.head.appendChild(script);

  await import('../../src/index');

  const root = document.body.firstElementChild!;
  expect(root.id).toBe('announcement-bar-root');

  const bar = await vi.waitFor(() => {
    const el = root.querySelector('.gh-announcement-bar');
    if (!el) {
      throw new Error('Announcement bar is not shown');
    }
    return el;
  });
  expect(bar.className).toBe('gh-announcement-bar accent');
  expect(bar.querySelector('.gh-announcement-bar-content')!.innerHTML).toBe(
    '<p>Preview from the script tag</p>',
  );
  expect(bar.querySelector('button')!.getAttribute('aria-label')).toBe('close');
});

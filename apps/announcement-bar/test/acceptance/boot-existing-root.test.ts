test('renders into a root the theme already placed, replacing its contents', async () => {
  sessionStorage.clear();
  const header = document.createElement('header');
  const root = document.createElement('div');
  root.id = 'announcement-bar-root';
  root.innerHTML = '<p class="placeholder">Loading</p>';
  document.body.append(header, root);

  const script = document.createElement('script');
  script.setAttribute('data-announcement-bar', 'https://site.test/');
  script.setAttribute('data-preview', 'true');
  script.setAttribute('data-announcement', '<p>Preview text</p>');
  script.setAttribute('data-announcement-background', 'dark');
  document.head.appendChild(script);

  await import('../../src/index');

  const bar = await vi.waitFor(() => {
    const el = root.querySelector('.gh-announcement-bar');
    if (!el) {
      throw new Error('Announcement bar is not shown');
    }
    return el;
  });
  expect(document.querySelectorAll('#announcement-bar-root')).toHaveLength(1);
  expect(header.nextElementSibling).toBe(root);
  expect(root.querySelector('.placeholder')).toBeNull();
  expect(root.children).toHaveLength(1);
  expect(bar.textContent).toBe('Preview text');
});

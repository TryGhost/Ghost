import { expect, test } from '@playwright/test';
import { MockedApi, initialize } from '../utils/e2e';

test.describe('Comment timestamps in Sao Paulo', () => {
  test.use({ timezoneId: 'America/Sao_Paulo' });

  test('uses the local day when UTC has crossed midnight', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-21T01:00:00.000Z'));
    const mockedApi = new MockedApi({});
    mockedApi.setMember({});
    const commentId = '64a1b2c3d4e5f6a7b8c9d001';
    mockedApi.addComment({
      id: commentId,
      html: '<p>Same local day</p>',
      created_at: '2026-10-20T22:00:00.000Z',
    });

    const { frame } = await initialize({ mockedApi, page, publication: 'Publisher Weekly' });
    const timestamp = frame.locator(`a[href="#ghost-comments-${commentId}"]`);
    await expect(timestamp).toHaveText(/^\s*·\s*3 hrs ago\s*$/);
    await expect(timestamp).toHaveAttribute('title', '20 Oct 2026 19:00');
  });
});

test.describe('Comment timestamps in Tokyo', () => {
  test.use({ timezoneId: 'Asia/Tokyo' });

  test('uses local days and months around a UTC month boundary', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2025-03-02T15:00:00.000Z'));
    const mockedApi = new MockedApi({});
    mockedApi.setMember({});
    const yesterdayId = '64a1b2c3d4e5f6a7b8c9d002';
    const explicitId = '64a1b2c3d4e5f6a7b8c9d003';
    const monthId = '64a1b2c3d4e5f6a7b8c9d004';
    mockedApi.addComment({
      id: yesterdayId,
      html: '<p>Yesterday locally</p>',
      created_at: '2025-03-02T12:00:00.000Z',
    });
    mockedApi.addComment({
      id: explicitId,
      html: '<p>Before yesterday locally</p>',
      created_at: '2025-03-01T14:00:00.000Z',
    });
    mockedApi.addComment({
      id: monthId,
      html: '<p>Local month boundary</p>',
      created_at: '2025-02-28T15:00:00.000Z',
    });

    const { frame } = await initialize({ mockedApi, page, publication: 'Publisher Weekly' });
    const yesterday = frame.locator(`a[href="#ghost-comments-${yesterdayId}"]`);
    const explicit = frame.locator(`a[href="#ghost-comments-${explicitId}"]`);
    const month = frame.locator(`a[href="#ghost-comments-${monthId}"]`);
    await expect(yesterday).toHaveText(/^\s*·\s*Yesterday\s*$/);
    await expect(yesterday).toHaveAttribute('title', '02 Mar 2025 21:00');
    await expect(explicit).toHaveText(/^\s*·\s*1 Mar\s*$/);
    await expect(explicit).toHaveAttribute('title', '01 Mar 2025 23:00');
    await expect(month).toHaveText(/^\s*·\s*1 Mar\s*$/);
    await expect(month).toHaveAttribute('title', '01 Mar 2025 00:00');
  });
});

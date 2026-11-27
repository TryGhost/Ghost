import { afterEach, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ShadeApp } from '@tryghost/shade/app';
import {
  FloatingSidebar,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@tryghost/shade/components';
import {
  configResponse,
  currentUserResponse,
  fakeAdminStats,
  fakeTags,
  renderAdminApp,
} from '@test-utils/acceptance';
import { setBillingSubscriptionState } from '@/billing/subscription-status';
import { sidebarScreen } from './sidebar.screen';

/** Shadow blur reaches beyond its border box; every paint clip must leave room for it. */
function clippingAncestors(banner: HTMLElement): string[] {
  const rect = banner.getBoundingClientRect();
  const shadows = getComputedStyle(banner).boxShadow;
  const lengths = [...shadows.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((match) => Number(match[1]));
  const paint = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
  for (let index = 0; index + 3 < lengths.length; index += 4) {
    const [x, y, blur, spread] = lengths.slice(index, index + 4);
    // The browser's Gaussian blur extends roughly three standard deviations (1.5 * blur).
    const radius = 1.5 * blur + spread;
    paint.left = Math.min(paint.left, rect.left + x - radius);
    paint.top = Math.min(paint.top, rect.top + y - radius);
    paint.right = Math.max(paint.right, rect.right + x + radius);
    paint.bottom = Math.max(paint.bottom, rect.bottom + y + radius);
  }
  // The physical viewport is the only unavoidable paint boundary.
  paint.left = Math.max(0, paint.left);
  paint.top = Math.max(0, paint.top);
  paint.right = Math.min(innerWidth, paint.right);
  paint.bottom = Math.min(innerHeight, paint.bottom);

  const clipped: string[] = [];
  const capsule = banner.closest('[data-slot=floating-sidebar]');
  for (let ancestor = banner.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const style = getComputedStyle(ancestor);
    const bounds = ancestor.getBoundingClientRect();
    const paintContainment =
      /paint|strict|content/.test(style.contain) || style.clipPath !== 'none';
    const clipsX = paintContainment || style.overflowX !== 'visible';
    const clipsY = paintContainment || style.overflowY !== 'visible';
    if (
      (clipsX && (bounds.left > paint.left || bounds.right < paint.right)) ||
      (clipsY && (bounds.top > paint.top || bounds.bottom < paint.bottom))
    ) {
      clipped.push(
        `${ancestor.getAttribute('data-slot') || ancestor.getAttribute('data-sidebar') || ancestor.tagName}: ${style.overflowX}/${style.overflowY}`,
      );
    }
    if (ancestor === capsule) {
      break;
    }
  }
  return clipped;
}

afterEach(async () => {
  setBillingSubscriptionState(null);
  await page.viewport(1280, 800);
});

it('keeps the generic sidebar default scrolling fallback for long ordinary children', async () => {
  await page.viewport(1280, 420);
  let selected = false;
  const labels = Array.from(
    { length: 24 },
    (_, index) => `Option ${String.fromCharCode(65 + index)}`,
  );
  await render(
    <ShadeApp darkMode={false}>
      <SidebarProvider>
        <FloatingSidebar
          animate={false}
          header={<span>Example</span>}
          icon={<span />}
          label="Open example"
          pinned={false}
        >
          <SidebarGroup>
            <SidebarMenu>
              {labels.map((label) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton
                    onClick={() => {
                      selected = true;
                    }}
                  >
                    {label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </FloatingSidebar>
      </SidebarProvider>
    </ShadeApp>,
  );
  await page.getByRole('button', { name: 'Open example', exact: true }).click();
  const capsule = document.querySelector('[data-slot=floating-sidebar]');
  if (!(capsule instanceof HTMLElement)) {
    throw new Error('Expected the generic sidebar');
  }
  const body = capsule.querySelector('[data-slot=floating-sidebar-body]');
  const scroller = [...(body?.querySelectorAll<HTMLElement>('*') ?? [])].find(
    (element) => getComputedStyle(element).overflowY === 'auto',
  );
  if (!scroller) {
    throw new Error('Expected default sidebar scrolling');
  }
  await expect.poll(() => scroller.scrollHeight > scroller.clientHeight).toBe(true);
  scroller.scrollTop = scroller.scrollHeight;
  const last = page.getByRole('button', { name: labels.at(-1), exact: true });
  await expect
    .poll(
      () =>
        last.element().getBoundingClientRect().bottom <= scroller.getBoundingClientRect().bottom,
    )
    .toBe(true);
  await last.click();
  expect(selected).toBe(true);
});

it.each([
  { appearance: 'light', height: 800, mode: 'full', hovered: false },
  { appearance: 'dark', height: 800, mode: 'full', hovered: false },
  { appearance: 'dark', height: 800, mode: 'full', hovered: true },
  { appearance: 'light', height: 420, mode: 'full', hovered: false },
  { appearance: 'dark', height: 420, mode: 'compact', hovered: false },
])(
  'lets the real gradient glow paint beyond the $appearance sidebar, $height px, $mode, hover=$hovered',
  async ({ appearance, height, mode, hovered }) => {
    await page.viewport(1280, height);
    fakeTags([]);
    fakeAdminStats.memberCount();
    fakeAdminStats.mrr();
    const me = currentUserResponse();
    me.users[0].accessibility = JSON.stringify({
      nightShift: appearance,
      navigation: { expanded: { posts: true, members: true }, menu: { visible: true, mode } },
    });
    const config = configResponse();
    config.config.hostSettings = { billing: { enabled: true, url: 'https://billing.example.com' } };
    await renderAdminApp('/tags', {
      labs: { admin7Design: true },
      boot: { browseMe: { response: me }, browseConfig: { response: config } },
    });
    setBillingSubscriptionState({
      subscription: {
        status: 'trialing',
        isActiveTrial: true,
        trial_end: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
    });
    if (mode === 'compact') {
      await sidebarScreen.floatingTrigger('Test Site').click();
    }
    await expect.poll(sidebarScreen.floatingState).toBe(mode === 'full' ? 'pinned' : 'open');
    await expect
      .poll(() => document.documentElement.classList.contains('dark'))
      .toBe(appearance === 'dark');
    await expect.element(sidebarScreen.upgradeNowLink()).toBeVisible();
    const banner = sidebarScreen
      .upgradeNowLink()
      .element()
      .closest<HTMLElement>('[data-slot=banner]');
    if (!banner) {
      throw new Error('Expected the real upgrade banner');
    }
    expect(getComputedStyle(banner).boxShadow).not.toBe('none');
    if (hovered) {
      await userEvent.hover(
        sidebarScreen.shellNav().getByRole('status').filter({ hasText: 'Unlock every feature' }),
      );
    }
    await expect.poll(() => clippingAncestors(banner)).toEqual([]);
  },
);

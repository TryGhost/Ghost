import { Component, type ReactNode } from 'react';
import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderInApp } from '@test-utils/acceptance';
import { AppsGate } from './apps-gate';

class Failed extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    return this.state.error ? <p role="alert">Screen failed</p> : this.props.children;
  }
}

it('fails the screen when the site’s config failed to load, rather than guess at apps', async () => {
  fakeAdminEndpoint(
    'GET',
    '/config/',
    () =>
      new Response(
        JSON.stringify({ errors: [{ type: 'InternalServerError', message: 'Config failed' }] }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      ),
  );

  await renderInApp(
    <Failed>
      <AppsGate>
        <p>Apps screen</p>
      </AppsGate>
    </Failed>,
  );

  await expect.element(page.getByRole('alert')).toHaveTextContent('Screen failed');
  await expect(page.getByText('Apps screen')).toHaveCount(0);
});

import { Button } from '@tryghost/shade/components';
import { useLocation } from '@tryghost/admin-x-framework';
import type { DunningState } from './use-dunning-state';
import { dismissLockQuietly, markPayNowReturnRoute } from './use-dunning-state';
import { PAY_URL } from './dunning-copy';

/**
 * The owner's "Pay now" CTA into the billing app's payment page. Following it
 * counts as seeing the message — the locked takeover stays suppressed for the
 * session (quietly, since the navigation repaints anyway) — and the clicked-from
 * route is recorded so the post-payment return lands back on it.
 */
export function PayNowButton({ size, state }: { size: 'sm' | 'lg'; state: DunningState }) {
  const location = useLocation();

  return (
    <Button size={size} asChild>
      <a
        href={PAY_URL}
        onClick={() => {
          dismissLockQuietly(state);
          markPayNowReturnRoute(location.pathname);
        }}
      >
        Pay now
      </a>
    </Button>
  );
}

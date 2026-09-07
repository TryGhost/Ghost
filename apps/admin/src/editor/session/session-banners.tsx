import { Banner, Button } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import type { SaveError, SaveEngineState } from '@/editor/engine/save-engine';

const SESSION_EXPIRED = 'Your session expired. Sign in again in a new tab, then retry.';

export interface SessionBannersProps {
  state: SaveEngineState;
  onRetryReauth: () => void;
  onDismissReauth: () => void;
  onRetrySave: () => void;
}

function saveErrorMessage(error: SaveError): string {
  switch (error.kind) {
    case 'session-invalid':
      return SESSION_EXPIRED;
    case 'transport':
      return 'Couldn’t reach the server. Your changes are still here.';
    default:
      return error.message;
  }
}

export function SessionBanners({
  state,
  onRetryReauth,
  onDismissReauth,
  onRetrySave,
}: SessionBannersProps) {
  if (state.kind === 'reauth-pending') {
    return (
      <Banner
        className="mx-4 mb-2 shrink-0"
        data-testid="editor-reauth-banner"
        role="alert"
        size="sm"
        variant="warning"
      >
        <Inline align="center" gap="sm">
          <Text>{SESSION_EXPIRED}</Text>
          <Button size="sm" variant="outline" onClick={onRetryReauth}>
            Retry
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismissReauth}>
            Dismiss
          </Button>
        </Inline>
      </Banner>
    );
  }

  if (state.kind === 'conflict') {
    return (
      <Banner
        className="mx-4 mb-2 shrink-0"
        data-testid="editor-conflict-banner"
        role="alert"
        size="sm"
        variant="destructive"
      >
        <Inline align="center" gap="sm">
          <Text>Someone else is editing this post</Text>
          <Button size="sm" variant="outline" onClick={reloadAfterConfirm}>
            Reload
          </Button>
        </Inline>
      </Banner>
    );
  }

  // A save that stopped working is never silent: the writer keeps a way to retry.
  if (state.kind === 'error') {
    return (
      <Banner
        className="mx-4 mb-2 shrink-0"
        data-testid="editor-save-error-banner"
        role="alert"
        size="sm"
        variant="destructive"
      >
        <Inline align="center" gap="sm">
          <Text>{saveErrorMessage(state.error)}</Text>
          <Button size="sm" variant="outline" onClick={onRetrySave}>
            Retry
          </Button>
        </Inline>
      </Banner>
    );
  }

  return null;
}

function reloadAfterConfirm(): void {
  if (window.confirm('Reload to get the latest version? Unsaved changes will be lost.')) {
    window.location.reload();
  }
}

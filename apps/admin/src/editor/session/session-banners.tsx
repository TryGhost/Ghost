import { Banner, Button } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import type { SaveEngineState } from '@/editor/engine/save-engine';

export interface SessionBannersProps {
  state: SaveEngineState;
  onRetryReauth: () => void;
  onDismissReauth: () => void;
}

export function SessionBanners({ state, onRetryReauth, onDismissReauth }: SessionBannersProps) {
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
          <Text>Your session expired. Sign in again in a new tab, then retry.</Text>
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

  return null;
}

function reloadAfterConfirm(): void {
  if (window.confirm('Reload to get the latest version? Unsaved changes will be lost.')) {
    window.location.reload();
  }
}

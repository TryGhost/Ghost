import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PostCardConfig } from '@/editor/card-config';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { PostSettingsSidebar } from './post-settings-sidebar';

const mocks = vi.hoisted(() => ({
  port: {},
  urlSection: vi.fn(() => null),
}));

vi.mock('./editor-settings-port', () => ({
  useEditorSettingsPort: () => mocks.port,
}));

vi.mock('./access-section', () => ({ AccessSection: () => null }));
vi.mock('./authors-section', () => ({ AuthorsSection: () => null }));
vi.mock('./code-injection-section', () => ({ CodeInjectionSection: () => null }));
vi.mock('./delete-section', () => ({ DeleteSection: () => null }));
vi.mock('./keyboard-shortcuts-section', () => ({ KeyboardShortcutsSection: () => null }));
vi.mock('./meta-data-section', () => ({ MetaDataSection: () => null }));
vi.mock('./post-history-section', () => ({ PostHistorySection: () => null }));
vi.mock('./publish-date-section', () => ({ PublishDateSection: () => null }));
vi.mock('./show-title-section', () => ({ ShowTitleSection: () => null }));
vi.mock('./social-card-section', () => ({ SocialCardSection: () => null }));
vi.mock('./tags-section', () => ({ TagsSection: () => null }));
vi.mock('./template-section', () => ({ TemplateSection: () => null }));
vi.mock('./url-section', () => ({ UrlSection: mocks.urlSection }));

const CARD_CONFIG = {} as PostCardConfig;

function handle(kind: 'idle' | 'debouncing') {
  return { state: { kind } } as EditorSessionHandle;
}

function Sidebar({ session, siteUrl }: { session: EditorSessionHandle; siteUrl: string }) {
  return (
    <PostSettingsSidebar
      cardConfig={CARD_CONFIG}
      featureImage={null}
      hasInlineExcerpt={true}
      postType="post"
      session={session}
      siteUrl={siteUrl}
    />
  );
}

describe('PostSettingsSidebar renders', () => {
  it('does not rebuild an unaffected section when only save state changes', () => {
    const { rerender } = render(<Sidebar session={handle('idle')} siteUrl="https://example.com" />);

    expect(mocks.urlSection).toHaveBeenCalledTimes(1);

    rerender(<Sidebar session={handle('debouncing')} siteUrl="https://example.com" />);

    expect(mocks.urlSection).toHaveBeenCalledTimes(1);

    // A prop the URL section reads still moves it, so the probe catches renders.
    rerender(<Sidebar session={handle('debouncing')} siteUrl="https://example.org" />);

    expect(mocks.urlSection).toHaveBeenCalledTimes(2);
  });
});

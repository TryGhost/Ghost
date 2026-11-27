import EmbedSignupPreview from '@/settings/growth/embed-signup/embed-signup-preview';
import { render, waitFor } from '@testing-library/react';

describe('EmbedSignupPreview', () => {
  it('generates the preview when its asynchronously loaded content arrives', async () => {
    const { container, rerender } = render(
      <EmbedSignupPreview backgroundColor="#08090c" html="" style="all-in-one" />,
    );

    rerender(
      <EmbedSignupPreview
        backgroundColor="#08090c"
        html={
          '<div data-preview-layout="all-in-one"><script data-background-color="#08090c" src="/signup-form.js"></script></div>'
        }
        style="all-in-one"
      />,
    );

    await waitFor(() => {
      const frames = Array.from(container.querySelectorAll('iframe'));
      expect(
        frames.some((frame) =>
          frame.contentDocument?.querySelector('script[src="/signup-form.js"]'),
        ),
      ).toBe(true);
    });
  });

  it('waits for matching markup before rebuilding a changed layout', async () => {
    const brandedHtml =
      '<div data-preview-layout="all-in-one" style="height:100vh"><script data-background-color="#08090c" src="/signup-form.js"></script></div>';
    const minimalHtml =
      '<div data-preview-layout="minimal" style="min-height:58px;width:calc(100% - 48px);position:absolute;left:50%;top:50%;transform:translate(-50%, -50%)"><script src="/signup-form.js"></script></div>';
    const { container, rerender } = render(
      <EmbedSignupPreview backgroundColor="#08090c" html={brandedHtml} style="all-in-one" />,
    );

    rerender(<EmbedSignupPreview backgroundColor="#08090c" html={brandedHtml} style="minimal" />);
    rerender(<EmbedSignupPreview backgroundColor="#08090c" html={minimalHtml} style="minimal" />);

    await waitFor(() => {
      const frames = Array.from(container.querySelectorAll('iframe'));
      expect(
        frames.some(
          (frame) =>
            frame.dataset.previewLayout === 'minimal' &&
            frame.contentDocument?.querySelector('[data-preview-layout="minimal"]'),
        ),
      ).toBe(true);
    });
  });

  it('does not rebuild when preview markup contains a stale or unknown layout', async () => {
    const staleHtml =
      '<div data-preview-layout="legacy"><script src="/signup-form.js"></script></div>';
    const { container } = render(
      <EmbedSignupPreview backgroundColor="#08090c" html={staleHtml} style="minimal" />,
    );

    await waitFor(() => {
      const frames = Array.from(container.querySelectorAll('iframe'));
      expect(
        frames.every(
          (frame) => !frame.contentDocument?.querySelector('script[src="/signup-form.js"]'),
        ),
      ).toBe(true);
    });
  });
});

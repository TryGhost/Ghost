import WelcomeEmailPreviewContent from '@/settings/email-design/welcome-email-preview-content';
import { DEFAULT_EMAIL_DESIGN } from '@/settings/email-design/types';
import { EmailDesignProvider } from '@/settings/email-design/email-design-provider';
import { LinkStyleField } from '@/settings/email-design/design-fields/link-style-field';
import { TooltipProvider } from '@tryghost/shade/components';
import { render, screen } from '@testing-library/react';

describe('Welcome email link styles', function () {
  it('labels the non-underlined non-bold link option as regular', function () {
    render(
      <EmailDesignProvider
        accentColor="#ff0088"
        settings={DEFAULT_EMAIL_DESIGN}
        onSettingsChange={() => {}}
      >
        <TooltipProvider>
          <LinkStyleField />
        </TooltipProvider>
      </EmailDesignProvider>,
    );

    expect(screen.getByRole('radio', { name: 'Regular' })).toBeTruthy();
  });

  it('does not italicize links when the regular style is selected', function () {
    render(
      <EmailDesignProvider
        accentColor="#ff0088"
        settings={{ ...DEFAULT_EMAIL_DESIGN, link_style: 'regular' }}
        onSettingsChange={() => {}}
      >
        <WelcomeEmailPreviewContent />
      </EmailDesignProvider>,
    );

    const link = screen.getByRole('link', { name: 'quick guide' });

    expect(link.classList.contains('italic')).toBe(false);
  });
});

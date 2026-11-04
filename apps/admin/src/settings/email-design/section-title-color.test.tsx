import WelcomeEmailPreviewContent from '@/settings/email-design/welcome-email-preview-content';
import { DEFAULT_EMAIL_DESIGN } from '@/settings/email-design/types';
import { DesignTab } from '@/settings/membership/member-emails/welcome-email-customize-modal';
import { EmailDesignProvider } from '@/settings/email-design/email-design-provider';
import { TooltipProvider } from '@tryghost/shade/components';
import { render, screen } from '@testing-library/react';

describe('Section title color', function () {
  it('includes a section title color control in the design tab', function () {
    render(
      <EmailDesignProvider
        accentColor="#ff0088"
        settings={DEFAULT_EMAIL_DESIGN}
        onSettingsChange={() => {}}
      >
        <TooltipProvider>
          <DesignTab />
        </TooltipProvider>
      </EmailDesignProvider>,
    );

    const label = screen.queryByText('Section title color');

    expect(label).toBeTruthy();
  });

  it('uses the configured section title color in preview headings', function () {
    render(
      <EmailDesignProvider
        accentColor="#ff0088"
        settings={{ ...DEFAULT_EMAIL_DESIGN, section_title_color: '#2255aa' }}
        onSettingsChange={() => {}}
      >
        <WelcomeEmailPreviewContent />
      </EmailDesignProvider>,
    );

    const heading = screen.getByRole('heading', { name: 'Your welcome email' });

    expect(heading.style.color).toBe('rgb(34, 85, 170)');
  });
});

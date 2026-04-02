import WelcomeEmailPreviewContent from '@src/components/settings/email-design/welcome-email-preview-content';
import assert from 'node:assert/strict';
import {DEFAULT_EMAIL_DESIGN} from '@src/components/settings/email-design/types';
import {DesignTab} from '@src/components/settings/membership/member-emails/welcome-email-customize-modal';
import {EmailDesignProvider} from '@src/components/settings/email-design/email-design-context';
import {render, screen} from '@testing-library/react';

describe('Section title color', function () {
    it('includes a section title color control in the design tab', function () {
        render(
            <EmailDesignProvider
                accentColor="#ff0088"
                settings={DEFAULT_EMAIL_DESIGN}
                onSettingsChange={() => {}}
            >
                <DesignTab />
            </EmailDesignProvider>
        );

        const label = screen.queryByText('Section title color');

        assert.ok(label);
    });

    it('uses the configured section title color in preview headings', function () {
        render(
            <EmailDesignProvider
                accentColor="#ff0088"
                settings={{...DEFAULT_EMAIL_DESIGN, section_title_color: '#2255aa'}}
                onSettingsChange={() => {}}
            >
                <WelcomeEmailPreviewContent />
            </EmailDesignProvider>
        );

        const heading = screen.getByRole('heading', {name: 'Your welcome email'});

        assert.equal(heading.style.color, 'rgb(34, 85, 170)');
    });
});

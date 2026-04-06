import WelcomeEmailPreviewContent from '@src/components/settings/email-design/welcome-email-preview-content';
import assert from 'node:assert/strict';
import {DEFAULT_EMAIL_DESIGN} from '@src/components/settings/email-design/types';
import {EmailDesignProvider} from '@src/components/settings/email-design/email-design-context';
import {LinkStyleField} from '@src/components/settings/email-design/design-fields/link-style-field';
import {render, screen} from '@testing-library/react';

describe('Welcome email link styles', function () {
    it('labels the non-underlined non-bold link option as regular', function () {
        render(
            <EmailDesignProvider
                accentColor="#ff0088"
                settings={DEFAULT_EMAIL_DESIGN}
                onSettingsChange={() => {}}
            >
                <LinkStyleField />
            </EmailDesignProvider>
        );

        assert.ok(screen.getByRole('radio', {name: 'Regular'}));
    });

    it('does not italicize links when the regular style is selected', function () {
        render(
            <EmailDesignProvider
                accentColor="#ff0088"
                settings={{...DEFAULT_EMAIL_DESIGN, link_style: 'regular'}}
                onSettingsChange={() => {}}
            >
                <WelcomeEmailPreviewContent />
            </EmailDesignProvider>
        );

        const link = screen.getByRole('link', {name: 'quick guide'});

        assert.equal(link.classList.contains('italic'), false);
    });
});

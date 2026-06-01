import {AutomationsPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Automations', () => {
    test('email design settings - saves and reloads customized values', async ({page}) => {
        const automationsPage = new AutomationsPage(page);
        const senderName = 'Automations Sender';
        const replyToEmail = 'automations-reply@example.com';
        const footerText = 'Automations footer copy';
        const colors = {
            background: '#F7F2E8',
            header: '#E5F3FF',
            sectionTitle: '#3A5A40',
            button: '#1F7A8C',
            link: '#B42318',
            divider: '#8E7DBE'
        };

        await automationsPage.goto();
        await automationsPage.waitUntilLoaded();
        await automationsPage.openEmailDesignModal();

        await automationsPage.emailDesignSenderNameInput.fill(senderName);
        await automationsPage.emailDesignReplyToEmailInput.fill(replyToEmail);
        await automationsPage.publicationTitleToggle.click();
        await automationsPage.emailDesignFooterInput.fill(footerText);
        await automationsPage.badgeToggle.click();

        await automationsPage.switchToEmailDesignTab();
        await automationsPage.setEmailDesignColor('Background color', colors.background);
        await automationsPage.chooseSelectOption(automationsPage.headingFontSelect, 'Elegant serif');
        await automationsPage.chooseSelectOption(automationsPage.headingWeightSelect, 'Regular');
        await automationsPage.chooseSelectOption(automationsPage.bodyFontSelect, 'Elegant serif');
        await automationsPage.setEmailDesignColor('Header background color', colors.header);
        await automationsPage.setEmailDesignColor('Section title color', colors.sectionTitle);
        await automationsPage.setEmailDesignColor('Button color', colors.button);
        await automationsPage.buttonStyleOutline.click();
        await automationsPage.buttonCornersPill.click();
        await automationsPage.setEmailDesignColor('Link color', colors.link);
        await automationsPage.linkStyleBold.click();
        await automationsPage.imageCornersRounded.click();
        await automationsPage.setEmailDesignColor('Divider color', colors.divider);

        await automationsPage.saveEmailDesignModal();
        await automationsPage.closeEmailDesignModal();

        await page.reload();
        await automationsPage.waitUntilLoaded();
        await automationsPage.openEmailDesignModal();

        await expect(automationsPage.emailDesignSenderNameInput).toHaveValue(senderName);
        await expect(automationsPage.emailDesignReplyToEmailInput).toHaveValue(replyToEmail);
        await expect(automationsPage.publicationTitleToggle).toHaveAttribute('aria-checked', 'false');
        await expect(automationsPage.emailDesignFooterInput).toHaveValue(footerText);
        await expect(automationsPage.badgeToggle).toHaveAttribute('aria-checked', 'false');

        await automationsPage.switchToEmailDesignTab();
        await expect(automationsPage.headingFontSelect).toContainText('Elegant serif');
        await expect(automationsPage.headingWeightSelect).toContainText('Regular');
        await expect(automationsPage.bodyFontSelect).toContainText('Elegant serif');
        await expect(automationsPage.buttonStyleOutline).toHaveAttribute('aria-checked', 'true');
        await expect(automationsPage.buttonCornersPill).toHaveAttribute('aria-checked', 'true');
        await expect(automationsPage.linkStyleBold).toHaveAttribute('aria-checked', 'true');
        await expect(automationsPage.imageCornersRounded).toHaveAttribute('aria-checked', 'true');

        await expect(await automationsPage.openEmailDesignColorPicker('Background color')).toHaveValue(new RegExp(colors.background, 'i'));
        await page.keyboard.press('Escape');
        await expect(await automationsPage.openEmailDesignColorPicker('Header background color')).toHaveValue(new RegExp(colors.header, 'i'));
        await page.keyboard.press('Escape');
        await expect(await automationsPage.openEmailDesignColorPicker('Section title color')).toHaveValue(new RegExp(colors.sectionTitle, 'i'));
        await page.keyboard.press('Escape');
        await expect(await automationsPage.openEmailDesignColorPicker('Button color')).toHaveValue(new RegExp(colors.button, 'i'));
        await page.keyboard.press('Escape');
        await expect(await automationsPage.openEmailDesignColorPicker('Link color')).toHaveValue(new RegExp(colors.link, 'i'));
        await page.keyboard.press('Escape');
        await expect(await automationsPage.openEmailDesignColorPicker('Divider color')).toHaveValue(new RegExp(colors.divider, 'i'));
    });
});

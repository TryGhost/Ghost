import {describe, expect, it} from 'vitest';

import {fakeAdminEndpoint, fakeEditSettings, fakeSettingsScreens, fakeTiers, renderAdminApp, settingsResponse, tier} from '@test-utils/acceptance';
import {settingsScreen} from '@/settings/settings.screen';

const paidTier = tier({id: 'tier-1', name: 'Premium'});
const giftSettings: Record<string, string | null> = {
    gift_page_image: null,
    gift_page_heading: null,
    gift_page_description: null,
    stripe_connect_publishable_key: 'pk_test',
    stripe_connect_secret_key: 'sk_test'
};

const imageFile = () => new File([new Uint8Array([137, 80, 78, 71])], 'gift.png', {type: 'image/png'});

async function openGiftSubscriptionsModal(settings = giftSettings) {
    fakeSettingsScreens();
    fakeTiers([paidTier]);
    await renderAdminApp('/settings', {
        boot: {browseSettings: {response: settingsResponse({settings})}}
    });
    await settingsScreen.section('gift-subscriptions').getByRole('button', {name: 'Customize'}).click();
    await expect.element(settingsScreen.giftSubscriptionsModal()).toBeVisible();
    return settingsScreen.giftSubscriptionsModal();
}

describe('Gift subscription settings', () => {
    it('saves image, heading and description changes together', async () => {
        fakeAdminEndpoint('POST', '/images/upload/', {images: [{url: 'https://example.com/gift.jpg', ref: null}]});
        const settingsApi = fakeEditSettings();
        const modal = await openGiftSubscriptionsModal();

        await expect.element(modal.getByLabelText('Heading')).toHaveAttribute('placeholder', 'Gift a membership');
        await expect.element(modal.getByLabelText('Description')).toHaveAttribute('placeholder', 'Share a full membership to Test Site with a friend or colleague');
        await modal.getByTestId('gift-page-image-upload').upload(imageFile());
        await expect.element(modal.getByAltText('Gift page image')).toHaveAttribute('src', 'https://example.com/gift.jpg');
        await modal.getByLabelText('Heading').fill('Give something brilliant');
        await modal.getByLabelText('Description').fill('A full year of independent publishing.');

        const previewUrl = (modal.getByTitle('Portal Preview').element() as HTMLIFrameElement).src;
        expect(previewUrl).toContain('giftPageHeading=Give%2520something%2520brilliant');
        expect(previewUrl).toContain('giftPageDescription=A%2520full%2520year%2520of%2520independent%2520publishing.');
        expect(previewUrl).toContain('giftPageImage=https%253A%252F%252Fexample.com%252Fgift.jpg');

        await modal.getByRole('button', {name: 'Save'}).click();
        await expect.element(modal.getByRole('button', {name: 'Saved'})).toBeVisible();
        await expect(settingsApi).toHaveEditedSettings([
            {key: 'gift_page_image', value: 'https://example.com/gift.jpg'},
            {key: 'gift_page_heading', value: 'Give something brilliant'},
            {key: 'gift_page_description', value: 'A full year of independent publishing.'}
        ]);
    });

    it('clears custom content back to Portal defaults', async () => {
        const settingsApi = fakeEditSettings();
        const modal = await openGiftSubscriptionsModal({
            ...giftSettings,
            gift_page_image: 'https://example.com/old.jpg',
            gift_page_heading: 'Old heading',
            gift_page_description: 'Old description'
        });

        await modal.getByRole('button', {name: 'Remove gift page image'}).click();
        await modal.getByLabelText('Heading').clear();
        await modal.getByLabelText('Description').clear();
        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(settingsApi).toHaveEditedSettings([
            {key: 'gift_page_image', value: null},
            {key: 'gift_page_heading', value: null},
            {key: 'gift_page_description', value: null}
        ]);
    });

    it('explains unavailable gifts and links to Portal settings', async () => {
        fakeSettingsScreens();
        await renderAdminApp('/settings');

        const section = settingsScreen.section('gift-subscriptions');
        await expect.element(section.getByRole('status')).toHaveTextContent('Portal has no paid membership options');
        await expect.element(section.getByRole('button', {name: 'Customize'})).toBeDisabled();
        await section.getByRole('button', {name: 'Portal settings'}).click();
        await expect.element(settingsScreen.portalModal()).toBeVisible();
    });

    it('shows accessible image validation and upload failures', async () => {
        const uploadApi = fakeAdminEndpoint('POST', '/images/upload/', {
            errors: [{message: 'Unsupported image', type: 'UnsupportedMediaTypeError'}]
        }, {status: 415});
        const modal = await openGiftSubscriptionsModal();

        await modal.getByTestId('gift-page-image-upload').upload(new File(['nope'], 'gift.txt', {type: 'text/plain'}));
        await expect.element(modal.getByRole('alert')).toHaveTextContent('Choose a JPG, PNG, GIF, WebP, or SVG image.');
        expect(uploadApi.requests).toHaveLength(0);

        await modal.getByTestId('gift-page-image-upload').upload(imageFile());
        await expect.element(modal.getByRole('alert')).toHaveTextContent("This file type isn't supported");
        expect(uploadApi.requests).toHaveLength(1);
    });
});

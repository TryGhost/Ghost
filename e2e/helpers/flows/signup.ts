import {Page} from '@playwright/test';
import {HomePage} from '../pages/public';
import {SignUpPage} from '../pages/portal/SignUpPage';
import {SignUpSuccessPage} from '../pages/portal/SignUpSuccessPage';
import {randomEmail, randomName} from '../utils/generators';

export async function signupViaPortal(page: Page): Promise<{email: string; name: string}> {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.openPortalViaSubscribeButton();

    const signUpPage = new SignUpPage(page);
    const email = randomEmail();
    const name = randomName();
    await signUpPage.fillAndSubmit(email, name);

    const successPage = new SignUpSuccessPage(page);
    await successPage.waitForSignUpSuccess();
    await successPage.closePortal();

    return {email, name};
}
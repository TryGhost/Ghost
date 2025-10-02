import {Page} from '@playwright/test';
import {faker} from '@faker-js/faker';
import {HomePage} from '../../pages/public';
import {SignUpPage} from '../../pages/portal/SignUpPage';
import {SignUpSuccessPage} from '../../pages/portal/SignUpSuccessPage';

export async function signupViaPortal(page: Page): Promise<{emailAddress: string; name: string}> {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.openPortalViaSubscribeButton();

    const signUpPage = new SignUpPage(page);
    const emailAddress = faker.internet.email();
    const name = faker.person.fullName();
    await signUpPage.fillAndSubmit(emailAddress, name);

    const successPage = new SignUpSuccessPage(page);
    await successPage.waitForSignUpSuccess();
    await successPage.closePortal();

    return {emailAddress, name};
}

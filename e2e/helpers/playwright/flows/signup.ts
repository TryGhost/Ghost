import {Page} from '@playwright/test';
import {faker} from '@faker-js/faker';
import {PublicPage} from '../../pages/public';
import {SignUpPage, SignUpSuccessPage} from '../../pages/portal';

export async function signupViaPortal(page: Page): Promise<{emailAddress: string; name: string}> {
    const publicPage = new PublicPage(page);
    await publicPage.openPortalViaSubscribeButton();

    const signUpPage = new SignUpPage(page);
    const emailAddress = faker.internet.email();
    const name = faker.person.fullName();
    await signUpPage.fillAndSubmit(emailAddress, name);

    const successPage = new SignUpSuccessPage(page);
    await successPage.waitForSignUpSuccess();
    await successPage.closePortal();

    return {emailAddress, name};
}

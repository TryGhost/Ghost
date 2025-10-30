import {Page} from '@playwright/test';
import {PublicPage} from '../../pages/public';
import {SignUpPage, SignUpSuccessPage} from '../../pages/portal';
import {faker} from '@faker-js/faker';

export async function signupViaPortal(page: Page): Promise<{emailAddress: string; name: string}> {
    const publicPage = new PublicPage(page);
    await publicPage.openPortalViaSubscribeButton();

    const signUpPage = new SignUpPage(page);
    const emailAddress = `test${faker.string.uuid()}@ghost.org`;
    const name = faker.person.fullName();
    await signUpPage.fillAndSubmit(emailAddress, name);

    const successPage = new SignUpSuccessPage(page);
    await successPage.waitForSignUpSuccess();
    await successPage.closePortal();

    return {emailAddress, name};
}

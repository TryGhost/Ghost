import {SSOBase} from '@tryghost/adapter-base-sso'

export default class DefaultSSOAdapter extends SSOBase<null, null> {
    async getRequestCredentials() {
        return null;
    }

    async getIdentityFromCredentials() {
        return null;
    }

    async getUserForIdentity() {
        return null;
    }
};

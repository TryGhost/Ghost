const DomainEvents = require('@tryghost/domain-events');
const {RedirectEvent} = require('@tryghost/link-redirects');

class LinkClickTrackingService {
    #initialised = false;

    async init() {
        if (this.#initialised) {
            return;
        }
        this.subscribe();
        this.#initialised = true;
    }

    /**
     * @param {import('@tryghost/link-redirects/LinkRedirect')} redirect
     * @param {string} id
     * @return {Promise<URL>}
     */
    async addTrackingToRedirect(redirect, id){
        const trackingUrl = new URL(redirect.from);
        trackingUrl.searchParams.set('m', id);
        return trackingUrl;
    }

    subscribe() {
        DomainEvents.subscribe(RedirectEvent, (event) => {
            const id = event.data.url.searchParams.get('m');
            if (typeof id !== 'string') {
                return;
            }

            const clickEvent = {
                member_id: id,
                link_id: event.data.link.link_id
            };
            // eslint-disable-next-line no-console
            console.log('Finna store a click event', clickEvent);
        });
    }
}

module.exports = LinkClickTrackingService;

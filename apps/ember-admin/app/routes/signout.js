import Route from '@ember/routing/route';

// React signs out; a second DELETE here would race its reload.
export default class SignoutRoute extends Route {
    beforeModel(transition) {
        transition.abort();
    }
}

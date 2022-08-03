// TODO: remove once bug is fixed in Ember
// see https://github.com/emberjs/ember-test-helpers/issues/332

import {visit as _visit, settled} from '@ember/test-helpers';

export async function visit(url) {
    try {
        await _visit(url);
    } catch (e) {
        if (e.message !== 'TransitionAborted') {
            throw e;
        }
    }

    await settled();
}

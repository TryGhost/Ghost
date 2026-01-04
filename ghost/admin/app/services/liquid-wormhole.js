import LiquidWormholeService from 'liquid-wormhole/services/liquid-wormhole';
import {action} from '@ember/object';
import {getOwner} from '@ember/application';
import {inject as service} from '@ember/service';

export default class CustomLiquidWormholeService extends LiquidWormholeService {
    @service feature;

    // override of the default destination to account for the new admin forward layout
    // original method: https://github.com/pzuraq/liquid-wormhole/blob/master/addon/services/liquid-wormhole.js#L59-L74
    @action
    addDefaultDestination() {
        const instance = getOwner(this);
        const destination = instance.lookup('component:-liquid-destination');
        destination.set('extraClassesString', 'default-liquid-destination');

        const adminForwardDestination = document.getElementById('ember-liquid-wormhole');

        if (this.feature.inAdminForward && adminForwardDestination) {
            destination.appendTo(adminForwardDestination);
        } else if (instance.rootElement) {
            destination.appendTo(instance.rootElement);
        } else {
            destination.appendTo(document);
        }

        this.defaultDestination = destination;

        return destination;
    }
}

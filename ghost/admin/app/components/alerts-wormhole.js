import Component from '@glimmer/component';

export default class AlertsWormholeComponent extends Component {
    get destinationElement() {
        return document.getElementById('ember-alerts-wormhole');
    }
}

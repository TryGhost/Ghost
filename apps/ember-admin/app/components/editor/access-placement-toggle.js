import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

/**
 * Switches the editor between the two access-control placements.
 *
 * Temporary by design - it exists to put the two variants side by side under
 * real writing, and goes when one of them wins.
 */
export default class AccessPlacementToggle extends Component {
    @service editorAccessPlacement;
    @service feature;
    @service session;

    // matches the chip's own visibility: a toggle for a control that isn't
    // rendered switches between nothing and nothing
    get isVisible() {
        return this.feature.paywallV2 && !this.session.user?.isContributor;
    }

    get placements() {
        return this.editorAccessPlacement.placements;
    }

    @action
    select(placement) {
        this.editorAccessPlacement.setPlacement(placement);
    }
}

import Service from '@ember/service';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

const STORAGE_KEY = 'ghost-editor-access-placement';

export const PLACEMENTS = [
    {name: 'canvas', label: 'On canvas'},
    {name: 'canvas-menu', label: 'Canvas menu'},
    {name: 'header', label: 'In header'},
    {name: 'sidebar', label: 'In sidebar'}
];

const DEFAULT_PLACEMENT = 'canvas';

/**
 * Which access-control variant the editor is currently showing.
 *
 * A prototype switch, not a setting: the variants render from three different
 * trees - the scrolling content pane, the route template's header, and the
 * settings drawer - so they have no common component to hold the choice
 * between them. A service is the only place all three can read it from.
 *
 * Persisted so the choice survives a reload - a variant you have to re-pick
 * every time you refresh isn't one you can actually live with for a day and
 * form an opinion about.
 */
export default class EditorAccessPlacementService extends Service {
    @tracked placement = this._read();

    /**
     * The one variant worth naming here. The chip works out the canvas/header
     * split itself, because that's a question about where it's mounted; this
     * one is asked from the settings drawer, which has no chip in it to ask.
     */
    get isSidebar() {
        return this.placement === 'sidebar';
    }

    get placements() {
        return PLACEMENTS.map(placement => ({
            ...placement,
            isSelected: placement.name === this.placement
        }));
    }

    @action
    setPlacement(placement) {
        this.placement = placement;
        this._write(placement);
    }

    // localStorage throws outright in Safari's private mode rather than
    // no-opping, and a prototype toggle isn't worth breaking the editor over
    _read() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return PLACEMENTS.some(({name}) => name === stored) ? stored : DEFAULT_PLACEMENT;
        } catch (e) {
            return DEFAULT_PLACEMENT;
        }
    }

    _write(placement) {
        try {
            localStorage.setItem(STORAGE_KEY, placement);
        } catch (e) {
            // the choice just won't survive the reload
        }
    }
}

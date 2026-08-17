/**
 * <ghost-labs-panel> — a floating Labs flag switcher for development.
 *
 * A framework-free custom element in a shadow root. It floats above the whole
 * admin — React screens, the Ember shell and the editor alike — and the shadow
 * root is what keeps that cheap: its styles cannot reach Ember's unlayered CSS
 * or Shade's utilities, and neither can reach in. Building it from Shade
 * components would mean a dev tool competing with the app it overlays for
 * cascade and stacking, so the switch below is written by hand to match.
 *
 * Rows show the flag key alone. It is what you grep for and what the API takes,
 * and it keeps every row one line high.
 *
 * Never registered outside development — see the import.meta.env.DEV guard at
 * the mount site in src/app.tsx.
 */

import {BETA_FLAGS, PRIVATE_FLAGS, WRITABLE_FLAGS} from './flags';
import {readLabs, writeLab, type ApiError, type LabsSettings, type SettingEntry} from './api';

type ApplyHandler = (labs: LabsSettings, settings: SettingEntry[]) => void;

const ELEMENT_NAME = 'ghost-labs-panel';
const STORAGE_KEY = 'ghost-labs-panel';

type PersistedState = {
    open: boolean;
    pinned: string[];
};

function readPersistedState(): PersistedState {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<PersistedState>;

        return {
            open: stored.open === true,
            pinned: Array.isArray(stored.pinned) ? stored.pinned.filter(flag => typeof flag === 'string') : []
        };
    } catch {
        return {open: false, pinned: []};
    }
}

/** Covers single quotes too, so a future single-quoted attribute can't open a hole. */
function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#39;'
    }[character] as string));
}

// lucide flask-conical — the icon Settings → Labs uses in its nav.
const FLASK_ICON = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
        <path d="M6.453 15h11.094" />
        <path d="M8.5 2h7" />
    </svg>
`;

// lucide pin
const PIN_ICON = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 17v5" />
        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </svg>
`;

// lucide search
const SEARCH_ICON = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m21 21-4.34-4.34" />
        <circle cx="11" cy="11" r="8" />
    </svg>
`;

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

/**
 * Events stopped at the host so nothing outside sees them.
 *
 * The panel is appended to document.body, so to any open dialog it is "outside" —
 * Radix's dismissable layer listens for pointerdown on the document and closes
 * the modal, and its focus scope would fight the search box for focus. Both of
 * those are bubble-phase document listeners, so stopping at the host reaches
 * them. Our own handlers are bound inside the shadow root and run before the
 * event gets here, so containing it costs us nothing.
 *
 * Keys are deliberately absent: Radix binds Escape with {capture: true}, and
 * capture runs document → host, so a bubble-phase stop here could never beat it.
 * keydown is contained in #onKeydown instead — see the note there. keyup is not
 * contained at all, which is fine only because nothing in the admin or Ember
 * listens for it at document level; that is worth rechecking if this ever grows
 * a keyup-driven behaviour.
 */
const CONTAINED_EVENTS = [
    'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick',
    'touchstart', 'touchend', 'focusin', 'focusout'
];

const STYLES = `
    :host {
        all: initial;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 2147483000;
        font-family: ui-sans-serif, -apple-system, "Segoe UI", sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color-scheme: light;

        /* Shade's PALETTE tokens, not its semantic ones. Custom properties
           inherit through the shadow boundary, so --color-* resolves in here.
           The semantic tokens (--primary, --input) flip under .dark while this
           panel stays light in both themes, so adopting those would turn the
           "on" switch light grey against a white row. Palette tokens are
           constants, which is what makes them safe here. */
        --surface: var(--color-white);
        --track: var(--color-gray-100);
        --border: rgb(0 0 0 / 8%);
        --divider: rgb(0 0 0 / 6%);
        --text: var(--color-black);
        --text-muted: #7f8b96;
        --switch-off: var(--color-gray-200);
        --switch-on: var(--color-black);
        --chip-bg: #fdf2f5;
        --chip-border: rgb(199 37 78 / 13%);
        --chip-text: #c7254e;
        --pill-bg: var(--color-black);
        --pill-text: var(--color-white);
        --shadow: 0 8px 28px rgb(0 0 0 / 12%), 0 1px 2px rgb(0 0 0 / 6%);
        --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
    }
    * { box-sizing: border-box; }
    button { font: inherit; cursor: pointer; }

    #bubble {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 15px 9px 13px;
        border: 0;
        border-radius: 999px;
        background: var(--pill-bg);
        color: var(--pill-text);
        font-size: 13px;
        font-weight: 500;
        line-height: 1;
        box-shadow: var(--shadow);
        transition: background-color 0.15s ${EASE};
    }
    /* Mixed from the pill's own colour rather than a second hardcoded value, so
       it stays a lightening of whatever --pill-bg is. */
    #bubble:hover { background: color-mix(in oklab, var(--pill-bg), #fff 12%); }
    /* display:block keeps the icon off the text baseline, which is what makes an
       inline SVG sit a pixel or two low next to its label. */
    #bubble svg { display: block; flex: none; width: 15px; height: 15px; color: rgb(255 255 255 / 65%); }

    #panel {
        display: flex;
        flex-direction: column;
        width: 322px;
        max-height: min(540px, calc(100vh - 72px));
        margin-bottom: 8px;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: var(--surface);
        color: var(--text);
        box-shadow: var(--shadow);
        overflow: hidden;
    }
    #panel[hidden] { display: none; }

    header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 13px 14px 11px;
    }
    header .label {
        color: var(--text-muted);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }
    #close {
        display: flex;
        margin-left: auto;
        padding: 4px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: var(--text-muted);
        line-height: 0;
    }
    #close:hover { background: var(--track); color: var(--text); }
    #close svg { display: block; width: 13px; height: 13px; }

    #search-field {
        position: relative;
        display: flex;
        align-items: center;
        margin: 0 14px 2px;
    }
    #search-field > svg {
        position: absolute;
        left: 13px;
        width: 14px;
        height: 14px;
        color: var(--text-muted);
        pointer-events: none;
    }
    #search {
        flex: 1;
        min-width: 0;
        padding: 8px 14px 8px 34px;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: transparent;
        color: var(--text);
        font-family: inherit;
        font-size: 13px;
        font-weight: 400;
    }
    #search::placeholder { color: var(--text-muted); }
    #search::-webkit-search-cancel-button { display: none; }
    #search:focus-visible { outline: 2px solid var(--track); outline-offset: 0; }

    #list { flex: 1; overflow-y: auto; padding: 6px 0; }
    .group {
        padding: 8px 14px 4px;
        color: var(--text-muted);
        font-size: 9px;
        font-weight: 600;
        letter-spacing: 0.07em;
        text-transform: uppercase;
    }
    .group + .row { border-top: 0; }
    /* Not a <label>: clicking a row shouldn't flip a flag by accident. Only the
       switch toggles, and only the pin button pins. */
    .row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 14px;
    }
    .row + .row { border-top: 1px solid var(--divider); }
    .row:hover { background: var(--track); }
    /* Inline-code chip: the key is a literal you paste into labs.js or a URL, so
       it reads as code rather than as a label. Hugs its content, with the auto
       margin pushing the pin and switch to the right edge. */
    .row code {
        order: 1;
        flex: 0 1 auto;
        min-width: 0;
        margin-right: auto;
        padding: 2px 6px;
        border: 1px solid var(--chip-border);
        border-radius: 5px;
        background: var(--chip-bg);
        color: var(--chip-text);
        font-family: var(--mono);
        font-size: 11px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        opacity: 0.65;
        transition: opacity 0.18s ${EASE};
    }
    .row input:checked ~ code { opacity: 1; }
    .empty { padding: 20px 14px; color: var(--text-muted); text-align: center; }

    .pin {
        order: 2;
        display: flex;
        flex: none;
        padding: 3px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--text-muted);
        line-height: 0;
        opacity: 0;
        transition: opacity 0.15s ${EASE}, color 0.15s ${EASE};
    }
    .pin svg { display: block; width: 13px; height: 13px; }
    .row:hover .pin, .pin:focus-visible { opacity: 1; }
    .pin[aria-pressed="true"] { opacity: 1; color: var(--text); }
    .pin:hover { background: var(--divider); color: var(--text); }

    /* Matches Shade's Switch, so the panel's rows read the same as Settings →
       Labs: 28x16 track, 12px thumb, 12px travel, primary (near-black) when on. */
    .row input {
        order: 3;
        appearance: none;
        position: relative;
        flex: none;
        width: 28px;
        height: 16px;
        margin: 0;
        border-radius: 999px;
        background: var(--switch-off);
        cursor: pointer;
        transition: background-color 0.18s ${EASE};
    }
    .row input::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #fff;
        filter: drop-shadow(0 1px 2px rgb(0 0 0 / 7%));
        transition: transform 0.18s ${EASE};
    }
    .row input:checked { background: var(--switch-on); }
    .row input:checked::after { transform: translateX(12px); }
    .row input:focus-visible { outline: 2px solid var(--text-muted); outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) {
        .row input, .row input::after, .row code { transition: none; }
    }

    /* Collapsed by default and slid down; adding .is-visible animates it up into
       place. Height, padding and border all animate so the list above gives up
       the space smoothly instead of jumping. */
    #notice {
        display: flex;
        align-items: center;
        gap: 12px;
        max-height: 0;
        padding: 0 16px;
        border-top: 1px solid transparent;
        color: var(--text-muted);
        font-size: 11px;
        opacity: 0;
        overflow: hidden;
        transform: translateY(6px);
        pointer-events: none;
        transition: max-height 0.22s ${EASE}, padding 0.22s ${EASE},
                    border-top-color 0.22s ${EASE}, opacity 0.18s ${EASE},
                    transform 0.22s ${EASE};
    }
    #notice.is-visible {
        max-height: 72px;
        padding-top: 14px;
        padding-bottom: 14px;
        border-top-color: var(--divider);
        opacity: 1;
        transform: none;
        pointer-events: auto;
    }
    /* One line, always. A wrapping message shifts the button under the pointer. */
    #notice span {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    #notice strong { color: var(--text); font-weight: 600; }
    #notice.error { color: #d64242; }
    #reload {
        flex: none;
        padding: 7px 14px;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--surface);
        color: var(--text);
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        white-space: nowrap;
        transition: background-color 0.15s ${EASE}, border-color 0.15s ${EASE};
    }
    #reload:hover { background: var(--track); border-color: rgb(0 0 0 / 16%); }
    #reload[hidden] { display: none; }
    @media (prefers-reduced-motion: reduce) {
        #notice { transition: none; }
    }
`;

const TEMPLATE = `
    <style>${STYLES}</style>
    <section id="panel" hidden>
        <header>
            <span class="label">Labs</span>
            <button id="close" type="button" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                </svg>
            </button>
        </header>
        <div id="search-field">
            ${SEARCH_ICON}
            <input id="search" type="search" placeholder="Search flags…" autocomplete="off" />
        </div>
        <div id="list"></div>
        <div id="notice" role="status" aria-live="polite">
            <span id="notice-text"></span>
            <button id="reload" type="button" hidden>Reload</button>
        </div>
    </section>
    <button id="bubble" type="button" aria-label="Labs flags" aria-expanded="false" aria-controls="panel">
        ${FLASK_ICON}<span>Labs</span>
    </button>
`;

class GhostLabsPanel extends HTMLElement {
    #root: ShadowRoot;
    #state: PersistedState;
    #labs: LabsSettings = {};
    #query = '';
    #error: string | null = null;
    // Sticky: the write landed but the page couldn't be refreshed, so this page is
    // stale until reloaded. Kept separate from #error because the remedy differs —
    // a reload fixes this one, and must not be cleared by the next toggle.
    #applyFailed = false;
    #hasData = false;
    // Serialises writes. The payload is the whole flag map, not a delta, so two
    // overlapping writes would each build from a base the other has already moved
    // on from and the later one would silently undo the earlier.
    #writes: Promise<unknown> = Promise.resolve();
    #inFlight = 0;
    #listeners: AbortController | null = null;
    // Applies a flag to the running admin — patching the caches flag-gated code
    // reads from, and telling Ember. Supplied by the mount; without it a toggle
    // would only take effect on the next reload.
    #onApplied: ApplyHandler | null = null;
    // Signature of the rows currently in the DOM. Rebuilding the list on every
    // render would replace the checkbox mid-transition and kill the switch
    // animation, so an unchanged signature updates the existing inputs in place.
    #renderedSignature = '';

    constructor() {
        super();
        this.#state = readPersistedState();
        this.#root = this.attachShadow({mode: 'open'});
        this.#root.innerHTML = TEMPLATE;
    }

    set onApplied(handler: ApplyHandler | null) {
        this.#onApplied = handler;
    }

    /**
     * Adopt flag state changed elsewhere — Settings → Labs, in practice.
     *
     * The panel holds its own snapshot and, being framework-free, subscribes to
     * no query — so without this it only ever learns about outside changes when
     * reopened. The wrapper watches the config cache and pushes here.
     *
     * Ignored while a write is in flight: the caches still hold the pre-write
     * value then, and adopting it would flip the switch back under the pointer.
     *
     * A Settings toggle landing inside that window is therefore dropped, and the
     * in-flight whole-map PUT — built without it — reverts it server-side. That
     * is inherent to two writers sharing one setting, needs a sub-second overlap
     * by one person in two places, and heals on the panel's next read.
     */
    syncLabs(labs: LabsSettings) {
        if (this.#inFlight > 0 || !this.#hasData) {
            return;
        }

        this.#labs = {...labs};
        this.#render();
    }

    connectedCallback() {
        // One controller for every listener, so disconnecting can't leave any
        // behind and re-connecting can't double them up.
        this.#listeners = new AbortController();
        const {signal} = this.#listeners;

        CONTAINED_EVENTS.forEach((type) => {
            this.addEventListener(type, (event: Event) => event.stopPropagation(), {signal});
        });

        this.#element('#bubble').addEventListener('click', () => this.#setOpen(!this.#state.open), {signal});
        this.#element('#close').addEventListener('click', () => this.#setOpen(false), {signal});
        this.#element('#reload').addEventListener('click', () => window.location.reload(), {signal});

        this.#element<HTMLInputElement>('#search').addEventListener('input', (event) => {
            this.#query = (event.target as HTMLInputElement).value.trim().toLowerCase();
            this.#renderList();
        }, {signal});

        this.#element('#list').addEventListener('change', (event) => {
            const input = event.target as HTMLInputElement;

            if (input.dataset.flag) {
                this.#toggle(input.dataset.flag, input.checked);
            }
        }, {signal});

        this.#element('#list').addEventListener('click', (event) => {
            const pin = (event.target as HTMLElement).closest<HTMLElement>('[data-pin]');

            if (pin?.dataset.pin) {
                this.#togglePin(pin.dataset.pin);
            }
        }, {signal});

        // Capture, not bubble: Radix's Escape handling is a capture-phase document
        // listener, so this is the only phase from which a key originating in the
        // panel can be kept away from it.
        //
        // Registration order is NOT relied on. It would put us ahead of any dialog
        // opened after the panel mounts, but the panel now mounts asynchronously
        // (its module is imported only once the opt-in flag reads true), so a
        // dialog already open at that point registers first and would win. See
        // #onKeydown for what makes the ordering irrelevant.
        document.addEventListener('keydown', this.#onKeydown, {signal, capture: true});

        this.#render();

        // Only when it starts open. Closed, there is nothing on screen that could
        // be wrong, and opening reads anyway.
        if (this.#state.open) {
            void this.#load();
        }
    }

    disconnectedCallback() {
        this.#listeners?.abort();
        this.#listeners = null;
    }

    #onKeydown = (event: KeyboardEvent) => {
        // Keys typed inside the panel belong to the panel. Stopping them here
        // keeps the app's global shortcuts from firing while you type in the
        // search box. Only propagation is stopped, so the field still gets text.
        if (event.composedPath().includes(this)) {
            event.stopImmediatePropagation();

            // Escape additionally gets defaultPrevented, because stopping
            // propagation only beats listeners registered after ours. Radix's
            // DismissableLayer dismisses solely `if (!event.defaultPrevented)`,
            // so this contains Escape whatever the registration order — which
            // matters now that the panel mounts asynchronously and a dialog can
            // already be open by then. Costs the search field's native
            // Escape-clears-text, which is moot when Escape closes the panel.
            if (event.key === 'Escape') {
                event.preventDefault();
            }
        }

        // Ctrl, never Cmd: ⌘L is the browser's address bar, and ⌘⇧L sits close
        // enough to it to be worth avoiding. Ctrl+Shift+L is unclaimed on macOS.
        if (event.key.toLowerCase() === 'l' && event.shiftKey && event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            this.#setOpen(!this.#state.open);
            return;
        }

        // Escape pressed elsewhere still reaches whatever else is listening: the
        // panel is not a modal and has no claim on a key it didn't receive.
        if (event.key === 'Escape' && this.#state.open) {
            this.#setOpen(false);
        }
    };

    #element<T extends HTMLElement = HTMLElement>(selector: string): T {
        return this.#root.querySelector<T>(selector)!;
    }

    #persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#state));
        } catch {
            // A dev tool losing its open/closed state is not worth a thrown error.
        }
    }

    #setOpen(open: boolean) {
        this.#state.open = open;
        this.#persist();
        this.#render();

        if (open) {
            this.#element('#search').focus();
            // Refresh on open so a toggle made in Settings → Labs is reflected.
            // Existing rows stay on screen meanwhile, so nothing flashes.
            void this.#load();
        } else {
            // Send focus back where it came from rather than dropping it on body.
            this.#element('#bubble').focus();
        }
    }

    #togglePin(flag: string) {
        const pinned = this.#state.pinned;

        this.#state.pinned = pinned.includes(flag) ? pinned.filter(item => item !== flag) : [...pinned, flag];
        this.#persist();
        this.#renderList();
    }

    /**
     * Queued behind any in-flight write, not just fired off. A read that starts
     * before a write but resolves after it would otherwise install pre-write
     * state, and the next toggle would persist that stale map — undoing the
     * write it followed.
     */
    #load(): Promise<unknown> {
        this.#writes = this.#writes.then(() => this.#fetchLabs());

        return this.#writes;
    }

    async #fetchLabs() {
        try {
            this.#labs = await readLabs();
            this.#hasData = true;
            this.#error = null;
        } catch (error) {
            const status = (error as ApiError).status;
            // Only guess at auth when the status actually says so — reading a 500
            // or a timeout as "are you signed in?" sends you hunting in the wrong
            // place.
            const hint = status === 401 || status === 403 ? ' — signed in as staff?' : '';

            this.#error = `Couldn't read flags${hint} (${(error as Error).message})`;
        }

        this.#render();
    }

    #toggle(flag: string, enabled: boolean) {
        // Optimistic, so the switch feels instant. The write is queued behind any
        // in-flight one and builds its payload from #labs at the time it runs, not
        // from a snapshot taken now — with a whole-map payload, a stale base
        // silently reverts whatever landed in between.
        this.#labs = {...this.#labs, [flag]: enabled};
        this.#error = null;
        this.#inFlight += 1;
        this.#render();

        this.#writes = this.#writes.then(() => this.#commit(flag, enabled)).finally(() => {
            this.#inFlight -= 1;
        });
    }

    async #commit(flag: string, enabled: boolean) {
        let written;

        try {
            written = await writeLab(this.#labs, flag, enabled);
            this.#labs = written.labs;
        } catch (error) {
            // Revert just this flag rather than restoring a whole snapshot, which
            // would take any concurrent change down with it.
            this.#labs = {...this.#labs, [flag]: !enabled};
            this.#error = `${flag} failed: ${(error as Error).message}`;
            this.#render();
            return;
        }

        // Applying to the live page is a separate concern from the write, and is
        // reported as such: the flag is saved either way, so a host that can't
        // refresh itself must not read as a failed toggle or roll the switch back.
        try {
            this.#onApplied?.(written.labs, written.settings);
            this.#applyFailed = false;
        } catch (error) {
            this.#applyFailed = true;
            this.#error = `${flag} saved, but this page didn't update: ${(error as Error).message}`;
        }

        this.#render();
    }

    /**
     * One list, section headers instead of tabs — with a search box over 23 flags
     * there is nothing for tabs to do, and searching covers every flag at once.
     * Pinned floats to the top from either group: the point of pinning is not
     * having to go looking for the flag you're working on.
     */
    #groups(): {label: string; flags: string[]}[] {
        const matches = (flag: string) => flag.toLowerCase().includes(this.#query);
        const available = (flags: string[]) => flags.filter(flag => matches(flag) && !this.#state.pinned.includes(flag));
        // Pins outlive the flags they point at. One for a flag since deleted or
        // graduated to GA would render a row the server refuses to write, so the
        // switch would snap back with nothing said — drop it instead.
        const pinned = this.#state.pinned.filter(flag => matches(flag) && WRITABLE_FLAGS.has(flag));

        return [
            {label: 'Pinned', flags: pinned},
            {label: 'Beta', flags: available(BETA_FLAGS)},
            {label: 'Private', flags: available(PRIVATE_FLAGS)}
        ].filter(group => group.flags.length > 0);
    }

    #renderList() {
        const list = this.#element('#list');

        if (!this.#hasData) {
            const message = this.#error ? 'Couldn’t read flags' : 'Loading…';

            this.#renderedSignature = `message:${message}`;
            list.innerHTML = `<p class="empty">${message}</p>`;
            return;
        }

        const groups = this.#groups();

        if (!groups.length) {
            this.#renderedSignature = `empty:${this.#query}`;
            list.innerHTML = `<p class="empty">No flag matches “${escapeHtml(this.#query)}”</p>`;
            return;
        }

        const signature = groups.map(group => `${group.label}:${group.flags.join(',')}`).join('|');

        if (signature === this.#renderedSignature) {
            // Same rows, so keep the elements and let CSS animate the change.
            list.querySelectorAll<HTMLInputElement>('input[data-flag]').forEach((input) => {
                input.checked = this.#labs[input.dataset.flag!] === true;
            });
            return;
        }

        this.#renderedSignature = signature;
        list.innerHTML = groups.map(group => `
            ${group.label ? `<p class="group">${escapeHtml(group.label)}</p>` : ''}
            ${group.flags.map((flag) => {
                const isPinned = this.#state.pinned.includes(flag);

                return `
                    <div class="row">
                        <input type="checkbox" role="switch" data-flag="${escapeHtml(flag)}"
                               aria-label="${escapeHtml(flag)}" ${this.#labs[flag] ? 'checked' : ''} />
                        <code>${escapeHtml(flag)}</code>
                        <button class="pin" type="button" data-pin="${escapeHtml(flag)}"
                                aria-pressed="${isPinned}" aria-label="${isPinned ? 'Unpin' : 'Pin'} ${escapeHtml(flag)}">
                            ${PIN_ICON}
                        </button>
                    </div>
                `;
            }).join('')}
        `).join('');
    }

    #render() {
        const panel = this.#element('#panel');
        const bubble = this.#element('#bubble');

        panel.hidden = !this.#state.open;
        bubble.setAttribute('aria-expanded', String(this.#state.open));

        const notice = this.#element('#notice');
        const noticeText = this.#element('#notice-text');

        // The bar only ever speaks up about a problem: a toggle that applies
        // cleanly needs no commentary, because the change is already on screen.
        notice.classList.toggle('is-visible', this.#error !== null);
        notice.classList.toggle('error', this.#error !== null);
        noticeText.textContent = this.#error ?? '';
        // The bar truncates, so keep the full text reachable on hover.
        noticeText.title = this.#error ?? '';
        // A reload is the remedy for a page left stale by a failed apply, and for
        // nothing else — a failed write changed nothing to reload for.
        this.#element('#reload').hidden = !this.#applyFailed;

        this.#renderList();
    }
}

export function defineLabsPanel() {
    if (!customElements.get(ELEMENT_NAME)) {
        customElements.define(ELEMENT_NAME, GhostLabsPanel);
    }
}

export type LabsPanelHandle = {
    /** Adopt flag state changed outside the panel. */
    sync: (labs: LabsSettings) => void;
    unmount: () => void;
};

export function mountLabsPanel(options: {onApplied?: ApplyHandler} = {}): LabsPanelHandle {
    defineLabsPanel();

    const element = document.createElement(ELEMENT_NAME) as GhostLabsPanel;

    element.onApplied = options.onApplied ?? null;
    document.body.appendChild(element);

    return {
        sync: labs => element.syncLabs(labs),
        unmount: () => element.remove()
    };
}

import wormhole from 'liquid-wormhole/transitions/wormhole';

// override liquid-wormhole's default `wormhole` transition to focus the first
// autofocus element after the transition and element swap happens

export default function () {
    let newWormholeElement;

    if (this.newElement) {
        newWormholeElement = this.newElement.find('.liquid-wormhole-element:last-child');
    }

    return wormhole.apply(this, arguments).finally(() => {
        if (this.newElement && newWormholeElement) {
            let autofocusElem = newWormholeElement[0].querySelector('[autofocus]');
            if (autofocusElem) {
                autofocusElem.focus();
            }
        }
    });
}

export function getLinkMarkupFromRange(range) {
    let {headMarker, tailMarker} = range;
    if (headMarker === tailMarker || headMarker.next === tailMarker) {
        return tailMarker.markups.findBy('tagName', 'a');
    }
}

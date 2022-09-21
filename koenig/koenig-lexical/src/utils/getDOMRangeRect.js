/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export function getDOMRangeRect(
    nativeSelection,
    rootElement,
) {
    const domRange = nativeSelection.getRangeAt(0);

    let rect;

    if (nativeSelection.anchorNode === rootElement) {
        let inner = rootElement;
        while (inner.firstElementChild != null) { // eslint-disable-line eqeqeq
            inner = inner.firstElementChild;
        }
        rect = inner.getBoundingClientRect();
    } else {
        rect = domRange.getBoundingClientRect();
    }

    return rect;
}

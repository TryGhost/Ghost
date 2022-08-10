import React from 'react';

export const useConstructor = (callback = function () {}) => {
    const hasBeenCalled = React.useRef(false);
    if (hasBeenCalled.current) {
        return;
    }
    callback();
    hasBeenCalled.current = true;
};

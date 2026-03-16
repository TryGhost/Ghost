import React from 'react';
import {useTKContext} from '../context/TKContext';

export default function TKCountPlugin({onChange}: {onChange?: (count: number) => void}) {
    const {tkCount} = useTKContext();

    React.useEffect(() => {
        if (!onChange) {
            return;
        }

        onChange(tkCount);
    }, [onChange, tkCount]);

    return null;
}

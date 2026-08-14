import {useEffect, useState} from 'react';

export function useComputedValue(varName: string, deps: unknown[] = []) {
    const [value, setValue] = useState<string>('');

    useEffect(() => {
        const root = document.querySelector('.shade') ?? document.documentElement;
        const v = getComputedStyle(root).getPropertyValue(varName).trim();
        setValue(v);
    }, [varName, ...deps]);

    return value;
}

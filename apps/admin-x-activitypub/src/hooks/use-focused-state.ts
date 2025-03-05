import {useState} from 'react';

const useFocusedState = (initialValue: boolean) => {
    const [state, setUnderlyingState] = useState(initialValue ? 1 : 0);

    const setState = (value: boolean | ((prev: number) => number)) => {
        if (value === false) {
            return setUnderlyingState(0);
        }
        setUnderlyingState((prev) => {
            return prev + 1;
        });
    };

    return [state, setState] as const;
};

export default useFocusedState;

import {useEffect, useRef} from 'react';

const useResizeObserver = ({callback, element}) => {
    const observerRef = useRef(null);

    useEffect(() => {
        observerRef.current = new ResizeObserver(callback);
    }, [callback]);

    useEffect(() => {
        observerRef.current.observe(element);

        // cleanup
        return () => {
            observerRef.current.disconnect();
        };
    }, [element]);
};

export default useResizeObserver;

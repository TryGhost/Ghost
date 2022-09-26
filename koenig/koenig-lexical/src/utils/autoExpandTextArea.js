import {useEffect} from 'react';

const useAutoExpandTextArea = ({el, value}) => {
    useEffect(() => {
        const element = el.current;
        if (element) {
            element.style.height = '0px';
            const height = element.scrollHeight;
            element.style.height = `${height}px`;
        }
    }, [el, value]);
};

export default useAutoExpandTextArea;

import React from 'react';
import '../styles/index.css';

const CountButton = () => {
    const [count, setCount] = React.useState(0);

    return (
        <button onClick={() => setCount(prevCount => prevCount + 1)}>
            count is {count}
        </button>
    );
};

export default CountButton;

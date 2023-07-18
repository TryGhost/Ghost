import PropTypes from 'prop-types';
import React from 'react';
import ReactSlider from 'react-slider';

export function Slider({dataTestId, max, min, value, onChange}) {
    return (
        // docs at https://zillow.github.io/react-slider/
        <ReactSlider
            className='h-3 w-full rounded-full py-[5px]'
            data-testid={dataTestId}
            max={max} 
            min={min} 
            thumbActiveClassName='!h-3 !w-3 border-2 border-white dark:border-black !top-[-1px] shadow-[0_0_0_2px_rgba(0,0,0,1)] dark:shadow-[0_0_0_2px_rgba(255,255,255,1)]' 
            thumbClassName='h-[1rem] w-[1rem] bg-black rounded-full top-0 transition-transform dark:bg-white' 
            trackClassName='odd:bg-black even:bg-grey-200 rounded-full h-[2px] dark:odd:bg-white dark:even:bg-grey-800'
            value={value} 
            onChange={onChange} />
    );
}

Slider.propTypes = {
    max: PropTypes.number,
    min: PropTypes.number,
    value: PropTypes.number,
    onChange: PropTypes.func
};
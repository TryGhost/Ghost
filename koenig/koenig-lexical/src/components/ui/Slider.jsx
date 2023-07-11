import PropTypes from 'prop-types';
import React from 'react';
import ReactSlider from 'react-slider';

export function Slider({dataTestId, max, min, value, onChange}) {
    return (
        // docs at https://zillow.github.io/react-slider/
        <ReactSlider
            className='h-[2px] w-full rounded-full bg-grey-200'
            data-testid={dataTestId}
            max={max} 
            min={min} 
            thumbActiveClassName='!h-3 !w-3 border-2 border-white !top-[-5px] shadow-[0_0_0_2px_rgba(0,0,0,1)]' 
            thumbClassName='h-[1rem] w-[1rem] bg-black rounded-full -top-1 transition-transform' 
            trackClassName='first-of-type:bg-black rounded-full h-[2px]'
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
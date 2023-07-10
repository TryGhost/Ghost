import PropTypes from 'prop-types';
import React from 'react';
import ReactSlider from 'react-slider';

export function Slider({dataTestId, max, min, value, onChange}) {
    return (
        // docs at https://zillow.github.io/react-slider/
        <ReactSlider
            className='h-[2px] w-full rounded-full bg-grey-200'
            data-testid={dataTestId}
            markClassName='h-2 w-2 bg-blue-500 rounded-full' 
            max={max} 
            min={min} 
            thumbActiveClassName='h-3 w-3 border-2 border-white -top-1 shadow-[0_0_0_2px_rgba(0,0,0,1)]' 
            thumbClassName='h-2 w-2 bg-black rounded-full top-[-2px] transition-transform'
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
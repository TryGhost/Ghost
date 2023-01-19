import React, {useState} from 'react';

export function Toggle() {
    const [isChecked, setChecked] = useState(false);
    const toggleChecked = () => {
        setChecked(!isChecked);
    };

    return (
        <label className="relative inline-block h-5 w-[34px] outline-none">
            <input 
                type="checkbox"
                checked={isChecked}
                className="peer absolute hidden" 
                onChange={toggleChecked}
            />
            <div className="absolute inset-0 cursor-pointer rounded-full bg-grey-300 transition-all before:absolute before:left-[2px] before:bottom-[2px] before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-all before:duration-200 peer-checked:bg-black peer-checked:before:translate-x-[14px]"></div>
        </label>
    );
}
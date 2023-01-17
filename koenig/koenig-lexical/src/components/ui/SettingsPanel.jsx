import React, {useState} from 'react';
import PropTypes from 'prop-types';

export function SettingsPanel() {
    return (
        <div className="not-kg-prose z-[9999999] m-0 w-[320px] flex-col overflow-y-auto rounded-lg bg-white bg-clip-padding font-sans shadow">
            <SettingToggle label='Loop' description='Autoplay your video on a loop without sound.' />
        </div>
    );
}

SettingsPanel.propTypes = {
    toggle: PropTypes.bool
};

SettingsPanel.defaultProps = {
    toggle: true
};

export function SettingToggle({label, description}) {
    return (
        <div className="flex w-full items-center justify-between border-b border-b-grey-200 p-6 text-[1.3rem] last-of-type:border-b-0">
            <div>
                <div className="font-bold text-grey-900">{label}</div>
                <p className="font-normal text-grey-700">{description}</p>
            </div>
            <div className="shrink-0 pl-2">
                <Toggle />
            </div>
        </div>
    );
}

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
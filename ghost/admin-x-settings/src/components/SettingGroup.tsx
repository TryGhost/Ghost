import React from 'react';

interface Props {
    name: string;
}

const SettingGroup: React.FC<Props> = ({name}) => {
    return (
        <div className="rounded border border-grey-200 p-5 md:p-7">
            <div className="flex justify-between items-start">
                <div>
                    <h5>{name}</h5>
                    <p className="text-sm">Some setting bwoy</p>
                </div>
                <div>
                    <button className="text-sm cursor-pointer text-green font-bold">Action</button>
                </div>
            </div>
        </div>
    );
}

export default SettingGroup;
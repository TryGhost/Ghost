import Heading from '../../../../admin-x-ds/global/Heading';
import React from 'react';
import {OfficialTheme} from '../../../../models/themes';
import {getGhostPaths} from '../../../../utils/helpers';
import {useOfficialThemes} from '../../../providers/ServiceProvider';

const OfficialThemes: React.FC<{
    onSelectTheme?: (theme: OfficialTheme) => void;
}> = ({
    onSelectTheme
}) => {
    const {adminRoot} = getGhostPaths();
    const officialThemes = useOfficialThemes();

    return (
        <div className='h-[calc(100vh-74px-40px)] overflow-y-auto overflow-x-hidden p-[8vmin] pt-5'>
            <Heading>Themes</Heading>
            <div className='mt-[6vmin] grid grid-cols-1 gap-[6vmin] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
                {officialThemes.map((theme) => {
                    return (
                        <div key={theme.name} className='flex cursor-pointer flex-col gap-3' onClick={() => {
                            onSelectTheme?.(theme);
                        }}>
                            {/* <img alt={theme.name} src={`${assetRoot}/${theme.image}`}/> */}
                            <div className='w-full bg-grey-100 shadow-md transition-all duration-500 hover:scale-[1.05]'>
                                <img
                                    alt="Headline Theme"
                                    className='h-full w-full object-contain'
                                    src={`${adminRoot}${theme.image}`}
                                />
                            </div>
                            <div className='mt-3'>
                                <Heading level={4}>{theme.name}</Heading>
                                <span className='text-sm text-grey-700'>{theme.category}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OfficialThemes;
import React from 'react';

export type DesktopChromeHeaderSize = 'sm' | 'md' | 'lg';

interface DesktopChromeHeaderProps {
    size?: DesktopChromeHeaderSize;
    toolbarLeft?: React.ReactNode;
    toolbarCenter?: React.ReactNode;
    toolbarRight?: React.ReactNode;
    toolbarClasses?: string;
}

const DesktopChromeHeader: React.FC<DesktopChromeHeaderProps & React.HTMLAttributes<HTMLDivElement>> = ({
    size = 'md',
    toolbarLeft = '',
    toolbarCenter = '',
    toolbarRight = '',
    toolbarClasses = '',
    ...props
}) => {
    let containerSize;

    switch (size) {
    case 'sm':
        containerSize = 'h-[32px] p-2';
        break;

    case 'md':
        containerSize = 'h-[48px] px-3 py-5';
        break;

    case 'lg':
        containerSize = 'h-[74px] px-3 py-5';
        break;

    default:
        break;
    }

    const trafficLightSize = size === 'sm' ? 'w-[6px] h-[6px]' : 'w-[10px] h-[10px]';
    const trafficLightWidth = size === 'sm' ? 36 : 56;
    let trafficLightContainerStyle = size === 'sm' ? 'gap-[5px] ' : 'gap-2 ';
    trafficLightContainerStyle += `w-[${trafficLightWidth}px]`;

    const trafficLights = (
        <div className={`absolute left-5 flex h-full items-center ${trafficLightContainerStyle}`}>
            <div className={`rounded-full bg-grey-500 ${trafficLightSize}`}></div>
            <div className={`rounded-full bg-grey-500 ${trafficLightSize}`}></div>
            <div className={`rounded-full bg-grey-500 ${trafficLightSize}`}></div>
        </div>
    );

    return (
        <header className={`relative flex shrink-0 items-center justify-center ${containerSize} ${toolbarClasses}`} {...props}>
            {toolbarLeft ?
                <div className='absolute left-5 flex h-full items-center'>
                    {toolbarLeft}
                </div>
                :
                trafficLights
            }
            <div className='flex grow justify-center'>
                {(typeof toolbarCenter === 'string') ?
                    (<span className='text-sm font-bold'>{toolbarCenter}</span>)
                    :
                    (<>{toolbarCenter}</>)
                }
            </div>
            {toolbarRight &&
                <div className='absolute right-5 flex h-full items-center'>
                    {toolbarRight}
                </div>
            }
        </header>
    );
};

export default DesktopChromeHeader;

import FakeLogo from '../../../assets/images/portal-splash-default-logo.png';
import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import UserAddIcon from '../../../assets/images/portal-splash-user-add.png';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const SignupOptionImage: React.FC<{color:string, title: string, price: string}> = ({title, color, price}) => {
    return (
        <div className='rounded-lg bg-grey-100/70 px-3 pb-3 pt-1.5'>
            <div className='font-space-grotesk text-[1.5rem] font-bold' style={{
                color: color
            }}>{title}</div>
            <div className='-mt-1 font-space-grotesk text-[1.7rem] font-bold'>{price}</div>
            <div className='mt-5 flex flex-col gap-1.5'>
                <div className='h-1.5 w-[100%] bg-grey-300/60'></div>
                <div className='h-1.5 w-[70%] bg-grey-300/60'></div>
                <div className='h-1.5 w-[90%] bg-grey-300/60'></div>
            </div>
        </div>
    );
};

const Portal: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {settings} = useGlobalData();
    const [accentColor, icon, membersSignupAccess] = getSettingValues<string>(settings, ['accent_color', 'icon', 'members_signup_access']);

    const openPreviewModal = () => {
        updateRoute('portal/edit');
    };

    const color = accentColor || '#F6414E';

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' color='clear' disabled={membersSignupAccess === 'none'} label='Customize' size='sm' onClick={openPreviewModal}/>}
            description="Customize members modal signup flow"
            keywords={keywords}
            navid='portal'
            testId='portal'
            title="Signup portal"
        >
            <div className="relative isolate -mx-5 -mb-5 hidden flex-col items-center justify-end overflow-hidden rounded-b-xl bg-grey-50 px-5 pt-6 text-black sm:!visible sm:!flex md:-mx-7 md:-mb-7">
                <div className='absolute bottom-6 right-6 flex size-12 items-center justify-center rounded-full text-white shadow-lg' style={{
                    backgroundColor: color
                }}>
                    <img className='size-6' src={UserAddIcon} />
                </div>
                <div className='grid w-full max-w-[440px] grid-cols-3 gap-5 rounded-t-xl bg-white px-9 py-6 shadow-xl'>
                    <div className='col-span-3 mb-1 flex flex-col items-center justify-center'>
                        {icon ?
                            <div className='size-6 rounded-sm bg-cover bg-center' style={{
                                backgroundImage: `url(${icon})`
                            }} />
                            // <img className='size-5' src={icon} />
                            :
                            <div className='flex aspect-square items-center justify-center overflow-hidden rounded-full p-1 text-white' style={{
                                backgroundColor: color
                            }}>
                                <img className='h-auto w-5' src={FakeLogo} />
                            </div>
                        }
                        <div className='mt-1.5 font-space-grotesk text-lg font-bold'>
                            Sign up
                        </div>
                        <div className='mt-1.5 flex h-6 w-1/2 items-center rounded border border-grey-200 p-2 text-xs text-grey-700'>
                            jamie@example.com
                        </div>
                    </div>
                    <SignupOptionImage color={color} price="$0" title="Free" />
                    <SignupOptionImage color={color} price="$5" title="Silver" />
                    <SignupOptionImage color={color} price="$10" title="Gold" />
                </div>
            </div>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Portal, 'Portal settings');

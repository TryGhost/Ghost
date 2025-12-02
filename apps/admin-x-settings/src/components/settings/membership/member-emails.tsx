import FakeLogo from '../../../assets/images/explore-default-logo.png';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import WelcomeEmailModal from './member-emails/welcome-email-modal';
import {Button, Separator, SettingGroupContent, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';

const DummyEmail: React.FC<{
    sender: string,
    title: string,
    emailType: 'free' | 'paid'
}> = ({
    sender,
    title,
    emailType
}) => {
    const {settings} = useGlobalData();
    const [accentColor, icon] = getSettingValues<string>(settings, ['accent_color', 'icon']);
    const color = accentColor || '#F6414E';

    return (
        <div className='mb-5 flex items-center justify-between gap-3 rounded-lg border border-grey-100 bg-grey-50 p-5'>
            <div className='flex items-start gap-3'>
                {icon ?
                    <div className='size-10 min-h-10 min-w-10 rounded-sm bg-cover bg-center' style={{
                        backgroundImage: `url(${icon})`
                    }} />
                    :
                    <div className='flex aspect-square size-10 items-center justify-center overflow-hidden rounded-full p-1 text-white' style={{
                        backgroundColor: color
                    }}>
                        <img className='h-auto w-8' src={FakeLogo} />
                    </div>
                }
                <div>
                    <div className='font-semibold'>{sender}</div>
                    <div className='text-sm'>{title}</div>
                </div>
            </div>
            <Button
                className='rounded-md border border-grey-200 font-semibold hover:shadow-xs'
                color='white'
                icon='pen'
                label='Edit'
                onClick={() => {
                    NiceModal.show(WelcomeEmailModal, {emailType});
                }}
            />
        </div>
    );
};

const MemberEmails: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [freeWelcomeEmailState, setFreeWelcomeEmailState] = useState(false);
    const [paidWelcomeEmailState, setPaidWelcomeEmailState] = useState(false);

    return (
        <TopLevelGroup
            description="Create and manage automated emails that are sent to your members."
            keywords={keywords}
            navid='memberemails'
            testId='memberemails'
            title='Welcome emails'
        >
            <SettingGroupContent className="!gap-y-0" columns={1}>
                <Separator />
                <Toggle
                    checked={freeWelcomeEmailState}
                    containerClasses='items-center'
                    direction='rtl'
                    gap='gap-0'
                    hint='Email new free members receive when they join your site.'
                    label='Free members welcome email'
                    labelClasses='py-4 w-full'
                    onChange={() => {
                        setFreeWelcomeEmailState(!freeWelcomeEmailState);
                    }}
                />
                {freeWelcomeEmailState &&
                    <DummyEmail
                        emailType='free'
                        sender='Publisher Weekly'
                        title='Welcome to Publisher Weekly'
                    />
                }
                <Separator />
                <Toggle
                    checked={paidWelcomeEmailState}
                    containerClasses='items-center'
                    direction='rtl'
                    gap='gap-0'
                    hint='Sent to new paid members as soon as they start their subscription.'
                    label='Paid members welcome email'
                    labelClasses='py-4 w-full'
                    onChange={() => {
                        setPaidWelcomeEmailState(!paidWelcomeEmailState);
                    }}
                />
                {paidWelcomeEmailState &&
                    <DummyEmail
                        emailType='paid'
                        sender='Publisher Weekly'
                        title='Welcome to your paid subscription'
                    />
                }
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(MemberEmails, 'MemberEmails');

import Button from '../../../admin-x-ds/global/Button';
import ConfirmationModal from '../../../admin-x-ds/global/modal/ConfirmationModal';
import NewslettersList from './newsletters/NewslettersList';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {ReactNode, useEffect, useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import useHandleError from '../../../utils/api/handleError';
import useQueryParams from '../../../hooks/useQueryParams';
import useRouting from '../../../hooks/useRouting';
import {APIError} from '../../../utils/errors';
import {useBrowseNewsletters, useVerifyNewsletterEmail} from '../../../api/newsletters';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

const NavigateToNewsletter = ({id, children}: {id: string; children: ReactNode}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();

    return <button className="text-green" type="button" onClick={() => {
        updateRoute(`newsletters/${id}`);
        modal.remove();
    }}>{children}</button>;
};

const Newsletters: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openNewsletterModal = () => {
        updateRoute('newsletters/new');
    };
    const [selectedTab, setSelectedTab] = useState('active-newsletters');
    const {data: {newsletters, meta, isEnd} = {}, fetchNextPage} = useBrowseNewsletters();

    const verifyEmailToken = useQueryParams().getParam('verifyEmail');
    const {mutateAsync: verifyEmail} = useVerifyNewsletterEmail();
    const handleError = useHandleError();

    useEffect(() => {
        if (!verifyEmailToken) {
            return;
        }

        const verify = async () => {
            try {
                const {newsletters: [updatedNewsletter]} = await verifyEmail({token: verifyEmailToken});

                NiceModal.show(ConfirmationModal, {
                    title: 'Email address verified',
                    prompt: <>Success! From address for newsletter <NavigateToNewsletter id={updatedNewsletter.id}>{updatedNewsletter.name}</NavigateToNewsletter> changed to <strong>{updatedNewsletter.sender_email}</strong></>,
                    okLabel: 'Close',
                    cancelLabel: '',
                    onOk: confirmModal => confirmModal?.remove()
                });
            } catch (e) {
                let prompt = 'There was an error verifying your email address. Please try again.';

                if (e instanceof APIError && e.message === 'Token expired') {
                    prompt = 'The verification link has expired. Please try again.';
                }
                NiceModal.show(ConfirmationModal, {
                    title: 'Error verifying email address',
                    prompt: prompt,
                    okLabel: 'Close',
                    cancelLabel: '',
                    onOk: confirmModal => confirmModal?.remove()
                });
                handleError(e, {withToast: false});
            }
        };
        verify();
    }, [verifyEmailToken, handleError, verifyEmail]);

    const buttons = (
        <Button color='green' label='Add newsletter' link linkWithPadding onClick={() => {
            openNewsletterModal();
        }} />
    );

    const tabs = [
        {
            id: 'active-newsletters',
            title: 'Active',
            contents: (<NewslettersList newsletters={newsletters?.filter(newsletter => newsletter.status === 'active') || []} />)
        },
        {
            id: 'archived-newsletters',
            title: 'Archived',
            contents: (<NewslettersList newsletters={newsletters?.filter(newsletter => newsletter.status !== 'active') || []} />)
        }
    ];

    return (
        <SettingGroup
            customButtons={buttons}
            keywords={keywords}
            navid='newsletters'
            testId='newsletters'
            title='Newsletters'
        >
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
            {isEnd === false && <Button
                label={`Load more (showing ${newsletters?.length || 0}/${meta?.pagination.total || 0} newsletters)`}
                link
                onClick={() => fetchNextPage()}
            />}
        </SettingGroup>
    );
};

export default withErrorBoundary(Newsletters, 'Newsletters');

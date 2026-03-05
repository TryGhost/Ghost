import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {Modal} from '@tryghost/admin-x-design-system';
import {useBrowseCampaignActivity} from '@tryghost/admin-x-framework/api/automated-emails';
import type {CampaignActivityEntry} from '@tryghost/admin-x-framework/api/automated-emails';

const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const StatusBadge: React.FC<{status: string | null}> = ({status}) => {
    const colors: Record<string, string> = {
        active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        exited: 'bg-grey-100 text-grey-800 dark:bg-grey-900 dark:text-grey-300'
    };
    const colorClass = colors[status || ''] || colors.active;
    return (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
            {status || 'n/a'}
        </span>
    );
};

const ActivityRow: React.FC<{entry: CampaignActivityEntry}> = ({entry}) => (
    <tr className='border-b border-grey-100 dark:border-grey-900'>
        <td className='py-2 pr-3'>
            <div className='text-sm font-medium'>{entry.member_name || 'Unknown'}</div>
            <div className='text-xs text-grey-700 dark:text-grey-500'>{entry.member_email}</div>
        </td>
        <td className='px-3 py-2'>
            <div className='text-sm'>{entry.step_name}</div>
            <div className='text-xs text-grey-700 dark:text-grey-500'>Step {entry.step_order ?? 0}</div>
        </td>
        <td className='px-3 py-2 text-sm'>{entry.subject}</td>
        <td className='px-3 py-2 text-sm text-grey-700 dark:text-grey-500'>{formatDate(entry.sent_at)}</td>
        <td className='py-2 pl-3'><StatusBadge status={entry.enrollment_status} /></td>
    </tr>
);

const CampaignActivityModal: React.FC = () => {
    const modal = useModal();
    const {data, isLoading} = useBrowseCampaignActivity();
    const activity = data?.activity || [];

    return (
        <Modal
            cancelLabel='Close'
            footer={false}
            size='lg'
            title='Campaign activity'
            onOk={() => modal.remove()}
        >
            <div className='-mx-8 max-h-[70vh] overflow-y-auto px-8'>
                {isLoading ? (
                    <div className='py-8 text-center text-sm text-grey-700'>Loading activity...</div>
                ) : activity.length === 0 ? (
                    <div className='py-8 text-center text-sm text-grey-700'>No campaign emails sent yet.</div>
                ) : (
                    <table className='w-full text-left'>
                        <thead>
                            <tr className='border-b border-grey-200 dark:border-grey-800'>
                                <th className='pb-2 pr-3 text-xs font-semibold uppercase text-grey-700 dark:text-grey-500'>Member</th>
                                <th className='px-3 pb-2 text-xs font-semibold uppercase text-grey-700 dark:text-grey-500'>Step</th>
                                <th className='px-3 pb-2 text-xs font-semibold uppercase text-grey-700 dark:text-grey-500'>Subject</th>
                                <th className='px-3 pb-2 text-xs font-semibold uppercase text-grey-700 dark:text-grey-500'>Sent</th>
                                <th className='pb-2 pl-3 text-xs font-semibold uppercase text-grey-700 dark:text-grey-500'>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activity.map(entry => (
                                <ActivityRow key={entry.id} entry={entry} />
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Modal>
    );
};

export default NiceModal.create(CampaignActivityModal);

import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {Modal} from '@tryghost/admin-x-design-system';
import {useBrowseCampaignActivity} from '@tryghost/admin-x-framework/api/automated-emails';
import type {CampaignActivityEntry} from '@tryghost/admin-x-framework/api/automated-emails';

import {
    Button,
    cn
} from '@tryghost/shade';

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
    const styles: Record<string, string> = {
        active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        exited: 'bg-grey-100 text-grey-600 dark:bg-grey-800 dark:text-grey-400'
    };
    const colorClass = styles[status || ''] || styles.active;
    return (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
            {status || 'n/a'}
        </span>
    );
};

const ActivityRow: React.FC<{entry: CampaignActivityEntry}> = ({entry}) => (
    <tr className='border-gray-100 dark:border-gray-900 border-b last:border-b-0'>
        <td className='py-3 pr-4'>
            <div className='text-sm font-medium'>{entry.member_name || 'Unknown'}</div>
            <div className='text-gray-500 dark:text-gray-400 text-xs'>{entry.member_email}</div>
        </td>
        <td className='px-4 py-3'>
            <div className='text-sm'>{entry.step_name}</div>
        </td>
        <td className='text-gray-600 dark:text-gray-400 px-4 py-3 text-sm'>{entry.subject}</td>
        <td className='text-gray-500 dark:text-gray-400 px-4 py-3 text-sm'>{formatDate(entry.sent_at)}</td>
        <td className='py-3 pl-4 text-right'><StatusBadge status={entry.enrollment_status} /></td>
    </tr>
);

const CampaignActivityModal: React.FC = () => {
    const modal = useModal();
    const {data, isLoading} = useBrowseCampaignActivity();
    const activity = data?.activity || [];

    return (
        <Modal
            backDropClick={false}
            footer={false}
            header={false}
            padding={false}
            scrolling={false}
            size='full'
            width='full'
        >
            <div
                className={cn(
                    'flex h-full w-full flex-col gap-0 overflow-hidden rounded-xl bg-gray-100 p-0',
                    'dark:bg-gray-975'
                )}
            >
                <div className='border-gray-200 dark:border-gray-900 dark:bg-gray-975 sticky top-0 flex shrink-0 items-center justify-between border-b bg-white px-5 py-3'>
                    <h3 className='text-xl font-semibold'>Campaign activity</h3>
                    <Button variant='outline' onClick={() => modal.remove()}>Close</Button>
                </div>
                <div className='flex min-h-0 grow flex-col overflow-y-auto p-6'>
                    <div className='border-gray-200 dark:border-gray-900 dark:bg-gray-950 mx-auto w-full max-w-[960px] grow rounded-lg border bg-white shadow-sm dark:shadow-none'>
                        {isLoading ? (
                            <div className='text-gray-500 py-12 text-center text-sm'>Loading activity...</div>
                        ) : activity.length === 0 ? (
                            <div className='text-gray-500 py-12 text-center text-sm'>No campaign emails sent yet.</div>
                        ) : (
                            <table className='w-full text-left'>
                                <thead>
                                    <tr className='border-gray-200 dark:border-gray-800 border-b'>
                                        <th className='text-gray-500 dark:text-gray-400 px-4 py-3 text-xs font-medium uppercase tracking-wide'>Member</th>
                                        <th className='text-gray-500 dark:text-gray-400 px-4 py-3 text-xs font-medium uppercase tracking-wide'>Step</th>
                                        <th className='text-gray-500 dark:text-gray-400 px-4 py-3 text-xs font-medium uppercase tracking-wide'>Subject</th>
                                        <th className='text-gray-500 dark:text-gray-400 px-4 py-3 text-xs font-medium uppercase tracking-wide'>Sent</th>
                                        <th className='text-gray-500 dark:text-gray-400 px-4 py-3 text-right text-xs font-medium uppercase tracking-wide'>Status</th>
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
                </div>
            </div>
        </Modal>
    );
};

export default NiceModal.create(CampaignActivityModal);

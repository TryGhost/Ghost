import NiceModal from '@ebay/nice-modal-react';
import WebhookModal from './WebhookModal';
import {Button, ConfirmationModal, Table, TableCell, TableHead, TableRow, showToast} from '@tryghost/admin-x-design-system';
import {Integration} from '@tryghost/admin-x-framework/api/integrations';
import {getWebhookEventLabel} from './webhookEventOptions';
import {useDeleteWebhook} from '@tryghost/admin-x-framework/api/webhooks';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const WebhooksTable: React.FC<{integration: Integration}> = ({integration}) => {
    const {mutateAsync: deleteWebhook} = useDeleteWebhook();
    const handleError = useHandleError();

    const handleDelete = (id: string) => {
        NiceModal.show(ConfirmationModal, {
            title: 'Are you sure?',
            prompt: 'Deleting this webhook may prevent the integration from functioning.',
            okColor: 'red',
            okLabel: 'Delete Webhook',
            onOk: async (confirmModal) => {
                try {
                    await deleteWebhook(id);
                    confirmModal?.remove();
                    showToast({
                        message: 'Webhook deleted',
                        type: 'info'
                    });
                } catch (e) {
                    handleError(e);
                }
            }
        });
    };

    return (<div>
        <Table>
            <TableRow bgOnHover={false}>
                <TableHead>{integration.webhooks?.length || 0} {integration.webhooks?.length === 1 ? 'webhook' : 'webhooks'}</TableHead>
                <TableHead>Last triggered</TableHead>
            </TableRow>
            {integration.webhooks?.map(webhook => (
                <TableRow action={
                    <Button color='red' label='Delete' link onClick={(e) => {
                        e?.stopPropagation();
                        handleDelete(webhook.id);
                    }} />
                }
                bgOnHover={false}
                hideActions
                onClick={() => {
                    NiceModal.show(WebhookModal, {
                        webhook,
                        integrationId:
                        integration.id
                    });
                }}
                >
                    <TableCell className='w-3/4'>
                        <div className='text-sm font-semibold'>{webhook.name}</div>
                        <div className='grid grid-cols-[max-content_1fr] gap-x-1 text-xs leading-snug'>
                            <span className='text-grey-600'>Event:</span>
                            <span>{getWebhookEventLabel(webhook.event)}</span>
                            <span className='text-grey-600'>URL:</span>
                            <span className='line-clamp-3 break-all' title={webhook.target_url}>
                                {webhook.target_url}
                            </span>
                        </div>
                    </TableCell>
                    <TableCell className='w-1/4 text-sm'>
                        {webhook.last_triggered_at && new Date(webhook.last_triggered_at).toLocaleString('default', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        })}
                    </TableCell>
                </TableRow>
            ))}
        </Table>
        <div className='mt-5'>
            <Button
                color='green'
                icon='add'
                iconColorClass='text-green'
                label='Add webhook'
                size='sm'
                link
                onClick={() => {
                    NiceModal.show(WebhookModal, {
                        integrationId: integration.id
                    });
                }} />
        </div>
    </div>);
};

export default WebhooksTable;

import Button from '../../../../admin-x-ds/global/Button';
import ConfirmationModal from '../../../../admin-x-ds/global/modal/ConfirmationModal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import Table from '../../../../admin-x-ds/global/Table';
import TableCell from '../../../../admin-x-ds/global/TableCell';
import TableHead from '../../../../admin-x-ds/global/TableHead';
import TableRow from '../../../../admin-x-ds/global/TableRow';
import WebhookModal from './WebhookModal';
import {Integration} from '../../../../api/integrations';
import {getWebhookEventLabel} from './webhookEventOptions';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {useDeleteWebhook} from '../../../../api/webhooks';

const WebhooksTable: React.FC<{integration: Integration}> = ({integration}) => {
    const {mutateAsync: deleteWebhook} = useDeleteWebhook();
    const modal = useModal();

    const handleDelete = (id: string) => {
        NiceModal.show(ConfirmationModal, {
            title: 'Are you sure?',
            prompt: 'Deleting this webhook may prevent the integration from functioning.',
            okColor: 'red',
            okLabel: 'Delete Webhook',
            onOk: async (confirmModal) => {
                await deleteWebhook(id);
                confirmModal?.remove();
                modal.show({
                    integration: {
                        ...integration,
                        webhooks: integration.webhooks?.filter(webhook => webhook.id !== id)
                    }
                });
                showToast({
                    message: 'Webhook deleted',
                    type: 'success'
                });
            }
        });
    };

    return <Table>
        <TableRow bgOnHover={false}>
            <TableHead>{integration.webhooks?.length || 0} {integration.webhooks?.length === 1 ? 'webhook' : 'webhooks'}</TableHead>
            <TableHead>Last triggered</TableHead>
            <TableHead />
        </TableRow>
        {integration.webhooks?.map(webhook => (
            <TableRow
                action={
                    <Button color='red' label='Delete' link onClick={(e) => {
                        e?.stopPropagation();
                        handleDelete(webhook.id);
                    }} />
                }
                hideActions
                onClick={() => {
                    NiceModal.show(WebhookModal, {
                        webhook,
                        integrationId:
                        integration.id,
                        onSaved: ({webhooks: [updated]}) => modal.show({
                            integration: {
                                ...integration,
                                webhooks: integration.webhooks?.map(current => (current.id === updated.id ? updated : current))
                            }
                        })
                    });
                }}
            >
                <TableCell className='w-1/2'>
                    <div className='text-sm font-semibold'>{webhook.name}</div>
                    <div className='grid grid-cols-[max-content_1fr] gap-x-1 text-xs leading-snug'>
                        <span className='text-grey-600'>Event:</span>
                        <span>{getWebhookEventLabel(webhook.event)}</span>
                        <span className='text-grey-600'>URL:</span>
                        <span>{webhook.target_url}</span>
                    </div>
                </TableCell>
                <TableCell className='w-1/2 text-sm'>
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
        <TableRow bgOnHover={false} separator={false}>
            <TableCell colSpan={3}>
                <Button
                    color='green'
                    icon='add'
                    iconColorClass='text-green'
                    label='Add webhook'
                    size='sm'
                    link
                    onClick={() => {
                        NiceModal.show(WebhookModal, {
                            integrationId: integration.id,
                            onSaved: ({webhooks: [added]}) => modal.show({
                                integration: {
                                    ...integration,
                                    webhooks: (integration.webhooks || []).concat(added)
                                }
                            })
                        });
                    }} />
            </TableCell>
        </TableRow>
    </Table>;
};

export default WebhooksTable;

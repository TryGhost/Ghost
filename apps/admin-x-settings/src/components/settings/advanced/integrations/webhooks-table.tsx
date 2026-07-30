import ConfirmationModal from '../../../confirmation-modal';
import NiceModal from '@ebay/nice-modal-react';
import WebhookModal from './webhook-modal';
import {Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {type Integration} from '@tryghost/admin-x-framework/api/integrations';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {getWebhookEventLabel} from './webhook-event-options';
import {toast} from 'sonner';
import {useDeleteWebhook} from '@tryghost/admin-x-framework/api/webhooks';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const WebhooksTable: React.FC<{integration: Integration}> = ({integration}) => {
    const {mutateAsync: deleteWebhook} = useDeleteWebhook();
    const handleError = useHandleError();

    const handleDelete = (id: string) => {
        NiceModal.show(ConfirmationModal, {
            title: 'Are you sure?',
            prompt: 'Deleting this webhook may prevent the integration from functioning.',
            okVariant: 'destructive',
            okLabel: 'Delete Webhook',
            onOk: async (confirmModal) => {
                try {
                    await deleteWebhook(id);
                    confirmModal?.remove();
                    toast.info('Webhook deleted');
                } catch (e) {
                    handleError(e);
                }
            }
        });
    };

    return (<div>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{formatNumber(integration.webhooks?.length || 0)} {integration.webhooks?.length === 1 ? 'webhook' : 'webhooks'}</TableHead>
                    <TableHead>Last triggered</TableHead>
                    <TableHead><span className='sr-only'>Actions</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {integration.webhooks?.map(webhook => (
                    <TableRow key={webhook.id} className='cursor-pointer' onClick={() => {
                        NiceModal.show(WebhookModal, {
                            webhook,
                            integrationId: integration.id
                        });
                    }}>
                        <TableCell className='w-3/4 py-3 pr-6'>
                            <div className='font-semibold'>{webhook.name}</div>
                            <div className='mt-1 grid grid-cols-[max-content_1fr] gap-1 text-sm leading-snug'>
                                <span className='text-muted-foreground'>Event:</span>
                                <span>{getWebhookEventLabel(webhook.event)}</span>
                                <span className='text-muted-foreground'>URL:</span>
                                <span className='line-clamp-3 break-all' title={webhook.target_url}>
                                    {webhook.target_url}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell className='w-1/4 py-3 pr-6 text-sm'>
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
                        <TableCell className='w-0 text-right'>
                            <Button className='text-destructive hover:text-destructive' size='sm' type='button' variant='ghost' onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(webhook.id);
                            }}>Delete</Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        <div className='mt-5'>
            <Button
                className='h-auto p-0 text-green hover:text-green'
                size='sm'
                type='button'
                variant='link'
                onClick={() => {
                    NiceModal.show(WebhookModal, {
                        integrationId: integration.id
                    });
                }}><LucideIcon.Plus />Add webhook</Button>
        </div>
    </div>);
};

export default WebhooksTable;

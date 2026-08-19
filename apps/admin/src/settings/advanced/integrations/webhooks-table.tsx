import WebhookModal from './webhook-modal';
import {useState} from 'react';
import {Button, EmptyIndicator, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {Inline, Stack} from '@tryghost/shade/primitives';
import {type Integration} from '@tryghost/admin-x-framework/api/integrations';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {getWebhookEventLabel} from './webhook-event-options';
import {toast} from 'sonner';
import {useConfirmation} from '@/settings/providers/confirmation-context';
import {type Webhook, useDeleteWebhook} from '@tryghost/admin-x-framework/api/webhooks';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const WebhooksTable: React.FC<{integration: Integration}> = ({integration}) => {
    const {mutateAsync: deleteWebhook} = useDeleteWebhook();
    const handleError = useHandleError();
    const {confirm} = useConfirmation();
    const webhooks = integration.webhooks || [];
    const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
    const [isAddingWebhook, setIsAddingWebhook] = useState(false);

    const showAddWebhookModal = () => {
        setIsAddingWebhook(true);
    };

    const closeWebhookModal = () => {
        setIsAddingWebhook(false);
        setEditingWebhook(null);
    };

    const webhookModal = isAddingWebhook
        ? <WebhookModal integrationId={integration.id} onClose={closeWebhookModal} />
        : editingWebhook && <WebhookModal key={editingWebhook.id} integrationId={integration.id} webhook={editingWebhook} onClose={closeWebhookModal} />;

    const handleDelete = (id: string) => {
        confirm({
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

    if (webhooks.length === 0) {
        return (
            <Stack gap='none'>
                <Separator />
                <EmptyIndicator
                    actions={(
                        <Button type='button' variant='outline' onClick={showAddWebhookModal}>
                            <LucideIcon.Plus /> Add webhook
                        </Button>
                    )}
                    className='py-8'
                    description='Add a webhook to send Ghost events to another service.'
                    title='No webhooks'
                >
                    <LucideIcon.Webhook />
                </EmptyIndicator>
                <Separator />
                {webhookModal}
            </Stack>
        );
    }

    return (<Stack gap='none'>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{formatNumber(integration.webhooks?.length || 0)} {integration.webhooks?.length === 1 ? 'webhook' : 'webhooks'}</TableHead>
                    <TableHead>Last triggered</TableHead>
                    <TableHead><span className='sr-only'>Actions</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {webhooks.map(webhook => (
                    <TableRow key={webhook.id} className='cursor-pointer' onClick={() => setEditingWebhook(webhook)}>
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
        <Inline className='py-4' justify='center'>
            <Button
                size='sm'
                type='button'
                variant='outline'
                onClick={showAddWebhookModal}
            >
                <LucideIcon.Plus /> Add webhook
            </Button>
        </Inline>
        <Separator />
        {webhookModal}
    </Stack>);
};

export default WebhooksTable;

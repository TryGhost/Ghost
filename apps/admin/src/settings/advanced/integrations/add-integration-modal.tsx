import { type FormEvent, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
} from '@tryghost/shade/components';
import { HostLimitError } from '@tryghost/admin-x-framework/errors';
import { useConfirmation } from '@/settings/providers/confirmation-context';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';
import { useUpgradeRoute } from '@/settings/hooks/use-upgrade-route';
import { useCreateIntegration } from '@tryghost/admin-x-framework/api/integrations';
import { useHandleError, useLimiter } from '@tryghost/admin-x-framework/hooks';
import { LucideIcon } from '@tryghost/shade/utils';

function AddIntegrationModal() {
  const { updateRoute } = useSettingsNavigation();
  const upgradeRoute = useUpgradeRoute();
  const [name, setName] = useState('');
  const [errors, setErrors] = useState({ name: '' });
  const { mutateAsync: createIntegration, isPending: isAdding } = useCreateIntegration();
  const limiter = useLimiter();
  const handleError = useHandleError();
  const { showLimit } = useConfirmation();

  useEffect(() => {
    if (limiter?.isLimited('customIntegrations')) {
      limiter.errorIfWouldGoOverLimit('customIntegrations').catch((error) => {
        if (error instanceof HostLimitError) {
          showLimit({
            prompt: error.message || `Your current plan doesn't support more custom integrations.`,
            onOk: () => updateRoute({ route: upgradeRoute, isExternal: true }),
          });
          updateRoute('integrations');
        }
      });
    }
  }, [limiter, showLimit, updateRoute, upgradeRoute]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isAdding) {
      return;
    }

    if (!name) {
      setErrors({ name: 'Name is required' });
      return;
    }

    try {
      const data = await createIntegration({ name });
      updateRoute({ route: `integrations/${data.integrations[0].id}` });
    } catch (e) {
      handleError(e);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          updateRoute('integrations');
        }
      }}
    >
      <DialogContent aria-describedby={undefined} data-testid="add-integration-modal" asChild>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>Add integration</DialogTitle>
          </DialogHeader>
          <DialogClose asChild>
            <Button
              aria-label="Close modal"
              className="absolute top-6 right-6 -m-2 opacity-50 hover:opacity-100 md:hidden"
              size="icon"
              type="button"
              variant="ghost"
            >
              <LucideIcon.X />
            </Button>
          </DialogClose>
          <FieldGroup className="gap-8">
            <Field data-invalid={Boolean(errors.name) || undefined}>
              <FieldLabel htmlFor="integration-name">Name</FieldLabel>
              <Input
                aria-invalid={Boolean(errors.name) || undefined}
                id="integration-name"
                maxLength={191}
                placeholder="Custom integration"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onInput={() => errors.name && setErrors({ name: '' })}
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => updateRoute('integrations')}>
              Cancel
            </Button>
            <Button disabled={isAdding} type="submit">
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddIntegrationModal;

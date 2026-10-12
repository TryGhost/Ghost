import FeatureToggle from './feature-toggle';
import LabItem from './lab-item';
import React, { useRef, useState } from 'react';
import YamlFileEditorModal from './yaml-file-editor-modal';
import {
  ActionList,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Link,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { downloadRedirects, useUploadRedirects } from '@tryghost/admin-x-framework/api/redirects';
import { downloadRoutes, useUploadRoutes } from '@tryghost/admin-x-framework/api/routes';
import { getSettingValue } from '@tryghost/admin-x-framework/api/settings';
import { toast } from 'sonner';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { DialogPortal } from '@/settings/providers/dialog-portal';

const IS_AUTOMATIONS_BETA_ACTIVE = true;

const YamlFileActions: React.FC<{
  kind: 'redirects' | 'routes';
  uploading: boolean;
  onEdit: () => void;
  onUpload: (file: File) => void;
  onDownload: () => void;
}> = ({ kind, uploading, onEdit, onUpload, onDownload }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Inline gap="sm">
      <Button size="sm" type="button" variant="secondary" onClick={onEdit}>
        Edit
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`More ${kind} actions`}
            disabled={uploading}
            size="icon-sm"
            type="button"
            variant="secondary"
          >
            <LucideIcon.Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        {/* legacy SettingsModal overlay is z-[1000]; keep the portalled menu above it */}
        <DropdownMenuContent align="end" className="z-[9999]">
          <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
            Upload file
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDownload}>Download file</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={inputRef}
        className="hidden"
        id={`upload-${kind}`}
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            onUpload(file);
          }
        }}
      />
    </Inline>
  );
};

const BetaFeatures: React.FC = () => {
  const { settings } = useGlobalData();
  const { mutateAsync: uploadRedirects } = useUploadRedirects();
  const { mutateAsync: uploadRoutes } = useUploadRoutes();
  const handleError = useHandleError();
  const [redirectsUploading, setRedirectsUploading] = useState<boolean>(false);
  const [routesUploading, setRoutesUploading] = useState<boolean>(false);
  const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}') as Record<
    string,
    boolean | undefined
  >;
  const isAutomationsEnabled = !!labs.automations;
  const [openEditor, setOpenEditor] = useState<'redirects' | 'routes' | null>(null);

  const uploadRedirectsFile = async (file: File) => {
    try {
      setRedirectsUploading(true);
      await uploadRedirects(file);
      toast.success('Redirects uploaded');
    } catch (e) {
      handleError(e);
    } finally {
      setRedirectsUploading(false);
    }
  };

  const uploadRoutesFile = async (file: File) => {
    try {
      setRoutesUploading(true);
      await uploadRoutes(file);
      toast.success('Routes uploaded');
    } catch (e) {
      handleError(e);
    } finally {
      setRoutesUploading(false);
    }
  };

  const openRedirectsEditor = () => setOpenEditor('redirects');
  const openRoutesEditor = () => setOpenEditor('routes');
  const closeEditor = () => setOpenEditor(null);

  return (
    <>
      <ActionList>
        {IS_AUTOMATIONS_BETA_ACTIVE ? (
          <LabItem
            action={
              <FeatureToggle
                confirmation={{
                  title: 'Automations (beta)',
                  prompt:
                    "This is a one-way street. Once enabled, the automations beta can't be turned off. Existing welcome emails will move into your automations automatically.",
                  okLabel: 'Enable',
                  okRunningLabel: 'Enabling...',
                }}
                disabled={isAutomationsEnabled}
                flag="automations"
                label="Automations (beta)"
              />
            }
            detail={
              <>
                Build automated email flows for your members, and get early access to new automation
                features as they ship.{' '}
                <Link href="https://ghost.org/help/automations-beta" external>
                  Learn more
                </Link>
              </>
            }
            title="Automations (beta)"
          />
        ) : null}
        <LabItem
          action={<FeatureToggle flag="superEditors" />}
          detail={
            <>
              Allows newly-assigned editors to manage members and comments in addition to regular
              roles.
            </>
          }
          title="Enhanced Editor role (beta)"
        />
        <LabItem
          action={<FeatureToggle flag="editorExcerpt" />}
          detail={<>Adds the excerpt input below the post title in the editor</>}
          title="Show post excerpt inline"
        />
        <LabItem
          action={<FeatureToggle flag="additionalPaymentMethods" />}
          detail={
            <>
              Enable support for CashApp, iDEAL, Bancontact, and others.{' '}
              <Link href="https://ghost.org/help/payment-methods" external>
                Learn more
              </Link>
            </>
          }
          title="Additional payment methods"
        />
        <LabItem
          action={<FeatureToggle flag="navigationIcons" />}
          detail={
            <>
              Add icons and member-visibility controls to navigation menu items. Requires theme
              support to render icons.
            </>
          }
          title="Navigation icons & visibility"
        />
        <LabItem
          action={
            <YamlFileActions
              kind="redirects"
              uploading={redirectsUploading}
              onDownload={() => downloadRedirects()}
              onEdit={openRedirectsEditor}
              onUpload={(file) => void uploadRedirectsFile(file)}
            />
          }
          detail={
            <>
              Configure redirects for old or moved content, more info in the{' '}
              <Link href="https://ghost.org/tutorials/implementing-redirects/" external>
                docs
              </Link>
            </>
          }
          testId="redirects"
          title="Redirects"
        />
        <LabItem
          action={
            <YamlFileActions
              kind="routes"
              uploading={routesUploading}
              onDownload={() => downloadRoutes()}
              onEdit={openRoutesEditor}
              onUpload={(file) => void uploadRoutesFile(file)}
            />
          }
          detail="Configure dynamic routing by modifying the routes.yaml file"
          testId="routes"
          title="Routes"
        />
      </ActionList>
      {openEditor === 'redirects' && (
        <DialogPortal>
          <YamlFileEditorModal
            downloadPath="/redirects/download/"
            hint={
              <>
                Configure redirects for old or moved content. See the{' '}
                <Link href="https://ghost.org/tutorials/implementing-redirects/" external>
                  docs
                </Link>{' '}
                for the file format.
              </>
            }
            successMessage="Redirects updated"
            testId="modal-redirects-editor"
            title="Redirects"
            uploadFilename="redirects.yaml"
            onClose={closeEditor}
            onUpload={(file: File) => uploadRedirects(file)}
          />
        </DialogPortal>
      )}
      {openEditor === 'routes' && (
        <DialogPortal>
          <YamlFileEditorModal
            downloadPath="/settings/routes/yaml/"
            hint={
              <>
                Configure dynamic routing by editing the routes.yaml file. See the{' '}
                <Link href="https://docs.ghost.org/themes/routing/" external>
                  docs
                </Link>{' '}
                for the file format.
              </>
            }
            successMessage="Routes updated"
            testId="modal-routes-editor"
            title="Routes"
            uploadFilename="routes.yaml"
            onClose={closeEditor}
            onUpload={(file: File) => uploadRoutes(file)}
          />
        </DialogPortal>
      )}
    </>
  );
};

export default BetaFeatures;

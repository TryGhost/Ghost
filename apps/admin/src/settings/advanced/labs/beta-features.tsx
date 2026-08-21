import FeatureToggle from './feature-toggle';
import LabItem from './lab-item';
import React, { useState } from 'react';
import YamlFileEditorModal from './yaml-file-editor-modal';
import { ActionList, Button, Dropzone } from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { downloadRedirects, useUploadRedirects } from '@tryghost/admin-x-framework/api/redirects';
import { downloadRoutes, useUploadRoutes } from '@tryghost/admin-x-framework/api/routes';
import { getSettingValue } from '@tryghost/admin-x-framework/api/settings';
import { toast } from 'sonner';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { DialogPortal } from '@/settings/providers/dialog-portal';

const IS_AUTOMATIONS_BETA_ACTIVE = true;

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
                <a
                  className="text-green"
                  href="https://ghost.org/help/automations-beta"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Learn more &rarr;
                </a>
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
              <a
                className="text-green"
                href="https://ghost.org/help/payment-methods"
                rel="noopener noreferrer"
                target="_blank"
              >
                Learn more &rarr;
              </a>
            </>
          }
          title="Additional payment methods"
        />
        <LabItem
          action={
            <Stack align="end" gap="xs">
              <Inline gap="sm">
                <Dropzone
                  inputId="upload-redirects"
                  variant="buttonSecondary"
                  onDropAccepted={([file]) => void uploadRedirectsFile(file)}
                >
                  {redirectsUploading ? 'Uploading ...' : 'Upload redirects file'}
                </Dropzone>
                <Button size="sm" type="button" variant="secondary" onClick={openRedirectsEditor}>
                  Edit
                </Button>
              </Inline>
              <Button
                className="h-auto p-0 text-green hover:text-green"
                size="sm"
                type="button"
                variant="link"
                onClick={() => downloadRedirects()}
              >
                Download current redirects
              </Button>
            </Stack>
          }
          detail={
            <>
              Configure redirects for old or moved content, <br /> more info in the{' '}
              <a
                className="text-green"
                href="https://ghost.org/tutorials/implementing-redirects/"
                rel="noopener noreferrer"
                target="_blank"
              >
                docs
              </a>
            </>
          }
          testId="redirects"
          title="Redirects"
        />
        <LabItem
          action={
            <Stack align="end" gap="xs">
              <Inline gap="sm">
                <Dropzone
                  inputId="upload-routes"
                  variant="buttonSecondary"
                  onDropAccepted={([file]) => void uploadRoutesFile(file)}
                >
                  {routesUploading ? 'Uploading ...' : 'Upload routes file'}
                </Dropzone>
                <Button size="sm" type="button" variant="secondary" onClick={openRoutesEditor}>
                  Edit
                </Button>
              </Inline>
              <Button
                className="h-auto p-0 text-green hover:text-green"
                size="sm"
                type="button"
                variant="link"
                onClick={() => downloadRoutes()}
              >
                Download current routes
              </Button>
            </Stack>
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
                <a
                  className="text-green"
                  href="https://ghost.org/tutorials/implementing-redirects/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  docs
                </a>{' '}
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
                <a
                  className="text-green"
                  href="https://docs.ghost.org/themes/routing/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  docs
                </a>{' '}
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

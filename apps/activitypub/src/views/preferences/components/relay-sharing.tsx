import Layout from '@src/components/layout';
import React, { useState } from 'react';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { H2 } from '@tryghost/shade/primitives';
import { Navigate } from '@tryghost/admin-x-framework';
import { toast } from 'sonner';
import {
  useAccountForUser,
  useDisableRelaySharingMutationForUser,
  useEnableRelaySharingMutationForUser,
} from '@hooks/use-activity-pub-queries';
import { useAppBasePath } from '@src/hooks/use-app-base-path';

const RelaySharing: React.FC = () => {
  const { data: account, isLoading: isLoadingAccount } = useAccountForUser('index', 'me');
  const basePath = useAppBasePath();
  const [loading, setLoading] = useState(false);
  const enableRelaySharingMutation = useEnableRelaySharingMutationForUser('index');
  const disableRelaySharingMutation = useDisableRelaySharingMutationForUser('index');

  const handleEnable = async () => {
    setLoading(true);
    try {
      await enableRelaySharingMutation.mutateAsync();
      toast.success('Relay sharing enabled');
    } catch {
      toast.error('Something went wrong, please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await disableRelaySharingMutation.mutateAsync();
      toast.success('Relay sharing disabled');
    } catch {
      toast.error('Something went wrong, please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingAccount) {
    return (
      <Layout>
        <div className="mx-auto max-w-[620px] py-[min(4vh,48px)]">
          <div className="flex items-center justify-between gap-8">
            <H2>Relay sharing</H2>
          </div>
          <div className="mt-6 flex justify-center">
            <LoadingIndicator size="md" />
          </div>
        </div>
      </Layout>
    );
  }

  if (account?.relaySharingEnabled === undefined) {
    return <Navigate to={`${basePath}/preferences`} replace />;
  }

  const relayHosts = (account.relayHosts ?? []).join(', ');

  return (
    <Layout>
      <div className="mx-auto max-w-[620px] py-[min(4vh,48px)]">
        <div className="flex items-center justify-between gap-8">
          <H2>Relay sharing</H2>
          {account.relaySharingEnabled && (
            <Button
              className="group w-24 translate-y-1 px-2 hover:bg-red/5! hover:text-red"
              disabled={loading}
              size="default"
              variant="outline"
              onClick={handleDisable}
            >
              <span className="size-2 rounded-full bg-green group-hover:hidden"></span>
              <span className="group-hover:hidden">Enabled</span>
              <span className="hidden group-hover:visible! group-hover:inline!">Disable</span>
            </Button>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-5">
          <p className="text-base">
            {account.relaySharingEnabled
              ? `Your public posts, but not your replies, are sent to ${relayHosts}. Turning this off stops sending posts and changes to them. Posts already sent stay there.`
              : `Turning this on sends your public posts, but not your replies, to ${relayHosts}. People on other servers who follow hashtags or topics there can then find them.`}
          </p>
          {!account.relaySharingEnabled && (
            <Button
              className="h-10 text-base"
              disabled={loading}
              variant="secondary"
              onClick={handleEnable}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <LoadingIndicator size="sm" />
                  <span>Enabling relay sharing...</span>
                </div>
              ) : (
                'Enable relay sharing'
              )}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default RelaySharing;

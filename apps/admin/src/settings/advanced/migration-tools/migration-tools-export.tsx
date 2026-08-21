import ExportAllModal, { type ExportMode } from './export-all-modal';
import React from 'react';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { blobDownloadFromEndpoint } from '@tryghost/admin-x-framework/helpers';
import { downloadAllContent } from '@tryghost/admin-x-framework/api/db';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useFeatureFlag, useHandleError } from '@tryghost/admin-x-framework/hooks';

const MigrationToolsExport: React.FC = () => {
  const [isExportingPosts, setIsExportingPosts] = React.useState(false);
  const [exportAllOpen, setExportAllOpen] = React.useState(false);
  const handleError = useHandleError();

  const hasSelfServeArchives = useFeatureFlag('selfServeArchives');
  const { data: configData } = useBrowseConfig();
  const mode: ExportMode = configData?.config.hostSettings?.export?.generate_archive_url
    ? 'async'
    : 'sync';

  const exportPosts = async () => {
    if (isExportingPosts) {
      return;
    }

    setIsExportingPosts(true);

    try {
      await blobDownloadFromEndpoint('/posts/export/?limit=1000', 'posts.analytics.csv');
    } catch (e) {
      handleError(e);
    } finally {
      setIsExportingPosts(false);
    }
  };

  if (hasSelfServeArchives) {
    return (
      <>
        <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 lg:grid-cols-3">
          <Button
            className="h-9 font-semibold"
            data-testid="export-all-button"
            type="button"
            variant="secondary"
            onClick={() => setExportAllOpen(true)}
          >
            <LucideIcon.PackageOpen />
            Export data
          </Button>
        </div>
        <ExportAllModal mode={mode} open={exportAllOpen} onOpenChange={setExportAllOpen} />
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 lg:grid-cols-3">
      <Button
        className="h-9 font-semibold"
        type="button"
        variant="secondary"
        onClick={() => downloadAllContent()}
      >
        <LucideIcon.Download />
        Content &amp; settings
      </Button>
      <Button
        className="h-9 font-semibold"
        data-testid="post-analytics-export-button"
        disabled={isExportingPosts}
        type="button"
        variant="secondary"
        onClick={() => void exportPosts()}
      >
        {isExportingPosts ? (
          <>
            <LoadingIndicator size="sm" />
            <span className="sr-only">Loading...</span>
          </>
        ) : (
          <>
            <LucideIcon.TrendingUp />
            Post analytics
          </>
        )}
      </Button>
    </div>
  );
};

export default MigrationToolsExport;

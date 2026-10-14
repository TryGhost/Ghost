import { GhostLogo, Link, Separator } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';
import { SettingsModal } from '@tryghost/shade/patterns';
import { linkToGitHubReleases } from '@/settings/utils/link-to-github-releases';
import { showDatabaseWarning } from '@/settings/utils/show-database-warning';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useUpgradeStatus } from '@/settings/providers/settings-app-context';

const adminBuildVersion = import.meta.env.GHOST_BUILD_VERSION;

function VersionLink({ label, version }: { label: string; version: string }) {
  const link = linkToGitHubReleases(version);
  return (
    <div>
      <strong>{label}:</strong>{' '}
      {link ? (
        <Link href={link} external>
          {version}
        </Link>
      ) : (
        version
      )}
    </div>
  );
}

function AboutModal() {
  const { updateRoute } = useSettingsNavigation();
  const globalData = useGlobalData();
  const config = globalData.config;
  const upgradeStatus = useUpgradeStatus();

  function copyrightYear(): number {
    const date = new Date();
    return date.getFullYear();
  }

  function hasDeveloperExperiments(): boolean {
    if (config.enableDeveloperExperiments) {
      return true;
    } else {
      return false;
    }
  }

  function showSystemInfo(): boolean {
    const isPro = !!config.hostSettings?.siteId;

    if (isPro) {
      return false;
    }

    return true;
  }

  return (
    <SettingsModal
      cancelLabel=""
      footer={<></>}
      topRightContent="close"
      width={540}
      onClose={() => {
        updateRoute('');
      }}
    >
      <div className="flex flex-col gap-4 pb-7">
        <GhostLogo className="h-auto w-[120px] dark:invert" />
        <div className="mt-3 flex flex-col gap-1.5">
          {upgradeStatus?.message && (
            <div className="mb-4 rounded-sm border border-green p-5 [&_a]:text-foreground [&_a]:underline [&_a]:decoration-border-strong [&_a]:underline-offset-4">
              <strong>Update available!</strong>
              <div dangerouslySetInnerHTML={{ __html: upgradeStatus.message }} />
            </div>
          )}
          {adminBuildVersion ? (
            <>
              <VersionLink label="Server" version={config.version} />
              <VersionLink label="Admin" version={adminBuildVersion} />
            </>
          ) : (
            <VersionLink label="Version" version={config.version} />
          )}
          {showSystemInfo() && (
            <>
              <div>
                <strong>Environment:</strong> {config.environment}
              </div>
              <div>
                <strong>Database:</strong> {config.database}
              </div>
              <div>
                <strong>Mail:</strong> {config.mail ? config.mail : 'Native'}
              </div>
            </>
          )}
          {hasDeveloperExperiments() && (
            <div>
              <strong>Developer experiments:</strong> Enabled
            </div>
          )}

          {showSystemInfo() && showDatabaseWarning(config.environment, config.database) && (
            <div className="text-red-500 dark:text-red-400">
              You are running an unsupported database in production. Please{' '}
              <Link href="https://docs.ghost.org/faq/supported-databases/" external>
                upgrade to MySQL 8
              </Link>
              .
            </div>
          )}
        </div>
        <Separator />
        <div className="flex flex-col gap-1.5">
          <a
            className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-gray-400"
            href="https://docs.ghost.org/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <LucideIcon.BookOpen className="size-4" /> User documentation
          </a>
          <a
            className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-gray-400"
            href="https://forum.ghost.org/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <LucideIcon.CircleHelp className="size-4" /> Get help with Ghost
          </a>
          <a
            className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-gray-400"
            href="https://docs.ghost.org/contributing/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <LucideIcon.Code className="size-4" /> Get involved
          </a>
        </div>
        <Separator />
        <p className="max-w-[460px] text-sm">
          Copyright © 2013 &ndash; {copyrightYear()} Ghost Foundation, released under the{' '}
          <Link href="https://github.com/TryGhost/Ghost/blob/main/LICENSE" external>
            MIT license
          </Link>
          .{' '}
          <Link href="https://ghost.org/" external>
            Ghost
          </Link>{' '}
          is a registered trademark of{' '}
          <Link href="https://ghost.org/trademark/" external>
            Ghost Foundation Ltd
          </Link>
          .
        </p>
      </div>
    </SettingsModal>
  );
}

export default AboutModal;

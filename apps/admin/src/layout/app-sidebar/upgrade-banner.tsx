import { Fragment } from 'react';
import { Banner, Button } from '@tryghost/shade/components';
import { formatNumber } from '@tryghost/shade/utils';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';

import ghostProLogo from '@/assets/images/ghost-pro-logo.png';
import ghostProLogoDark from '@/assets/images/ghost-pro-logo-dark.png';

const DAYS_PLACEHOLDER = '{{days}}';

const DEFAULT_TITLE = 'Unlock every feature';
const DEFAULT_MESSAGE = `Choose a plan to access the full power of Ghost right away, you have ${DAYS_PLACEHOLDER} free trial remaining.`;
const DEFAULT_UPGRADE_URL = '#/pro/billing/plans';
const DEFAULT_LOGO_ALT = 'Ghost Pro';

function UpgradeBanner({ trialDaysRemaining }: { trialDaysRemaining: number }) {
  const { data: config } = useBrowseConfig();
  const bannerConfig = config?.config.hostSettings?.billing?.upgradeBanner;

  const messageParts = (bannerConfig?.message || DEFAULT_MESSAGE).split(DAYS_PLACEHOLDER);

  const logo = bannerConfig?.logo || ghostProLogo;
  const logoDark = bannerConfig?.logoDark || bannerConfig?.logo || ghostProLogoDark;
  // A host's own logo is not the Ghost(Pro) logo, so fall back to decorative rather than mislabelling it
  const logoAlt =
    bannerConfig?.logoAlt ?? (bannerConfig?.logo || bannerConfig?.logoDark ? '' : DEFAULT_LOGO_ALT);

  return (
    <Banner className="mx-2 flex flex-col items-stretch" size="lg" variant="gradient">
      <div>
        <img alt={logoAlt} className="max-h-[33px] dark:hidden" src={logo} />
        <img alt={logoAlt} className="hidden max-h-[33px] dark:block" src={logoDark} />
      </div>
      <div className="mt-3 text-base font-semibold">{bannerConfig?.title || DEFAULT_TITLE}</div>
      <div className="mt-2 mb-4 text-sm text-gray-700">
        {messageParts.map((part, index) => (
          // These fragments are positional interpolation segments and never reorder.
          // eslint-disable-next-line react/no-array-index-key
          <Fragment key={index}>
            {index > 0 && (
              <span className="font-semibold text-foreground">
                {formatNumber(trialDaysRemaining)} days
              </span>
            )}
            {part}
          </Fragment>
        ))}
      </div>
      <Button asChild>
        <a href={bannerConfig?.upgradeUrl || DEFAULT_UPGRADE_URL}>Upgrade now</a>
      </Button>
    </Banner>
  );
}

export default UpgradeBanner;

import { Fragment } from 'react';
import { Banner, Button } from '@tryghost/shade/components';
import { Box, Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

import ghostProLogo from '@/assets/images/ghost-pro-logo.png';
import ghostProLogoDark from '@/assets/images/ghost-pro-logo-dark.png';

const DAYS_PLACEHOLDER = '{{days}}';

const DEFAULT_TITLE = 'Unlock every feature';
const DEFAULT_MESSAGE = `Choose a plan to access the full power of Ghost right away, you have ${DAYS_PLACEHOLDER} free trial remaining.`;
const DEFAULT_UPGRADE_URL = '#/pro/billing/plans';
const DEFAULT_LOGO_ALT = 'Ghost Pro';

function UpgradeBanner({ trialDaysRemaining }: { trialDaysRemaining: number }) {
  const { data: config } = useBrowseConfig();
  const admin7Design = useFeatureFlag('admin7Design');
  const bannerConfig = config?.config.hostSettings?.billing?.upgradeBanner;

  const messageParts = (bannerConfig?.message || DEFAULT_MESSAGE).split(DAYS_PLACEHOLDER);

  const logo = bannerConfig?.logo || ghostProLogo;
  const logoDark = bannerConfig?.logoDark || bannerConfig?.logo || ghostProLogoDark;
  const upgradeUrl = bannerConfig?.upgradeUrl || DEFAULT_UPGRADE_URL;
  // A host's own logo is not the Ghost(Pro) logo, so fall back to decorative rather than mislabelling it
  const logoAlt =
    bannerConfig?.logoAlt ?? (bannerConfig?.logo || bannerConfig?.logoDark ? '' : DEFAULT_LOGO_ALT);

  const branding = (
    <Box className={admin7Design ? '[@media(max-height:600px)]:hidden' : undefined}>
      <img alt={logoAlt} className="max-h-[33px] dark:hidden" src={logo} />
      <img alt={logoAlt} className="hidden max-h-[33px] dark:block" src={logoDark} />
    </Box>
  );
  const message = messageParts.map((part, index) => (
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
  ));
  const upgradeLink = (
    <Button className={admin7Design ? 'w-full' : undefined} asChild>
      <a className={admin7Design ? undefined : 'after:absolute after:inset-0'} href={upgradeUrl}>
        Upgrade now
      </a>
    </Button>
  );

  return (
    <Banner
      className={
        admin7Design
          ? 'mx-2 border-0 shadow-none hover:shadow-none'
          : 'mx-2 flex flex-col items-stretch'
      }
      size="lg"
      variant={admin7Design ? 'default' : 'gradient'}
    >
      {/* Separate the card's pointer target from the sticky action's containing block. */}
      {admin7Design && (
        <a aria-hidden="true" className="absolute inset-0" href={upgradeUrl} tabIndex={-1} />
      )}
      {admin7Design ? (
        <Stack gap="sm">
          {branding}
          <Stack gap="sm">
            <Text className="text-base tracking-tight" weight="bold">
              {bannerConfig?.title || DEFAULT_TITLE}
            </Text>
            <Text size="sm" tone="secondary">
              {message}
            </Text>
          </Stack>
          {/* Keep the action above scrolling copy when the footer has little height. */}
          <Box className="relative z-10 bg-surface-panel [@media(max-height:600px)]:sticky [@media(max-height:600px)]:bottom-0">
            {upgradeLink}
          </Box>
        </Stack>
      ) : (
        <>
          {branding}
          <div className="mt-3 text-base font-semibold">{bannerConfig?.title || DEFAULT_TITLE}</div>
          <div className="mt-2 mb-4 text-sm text-gray-700">{message}</div>
          {upgradeLink}
        </>
      )}
    </Banner>
  );
}

export default UpgradeBanner;

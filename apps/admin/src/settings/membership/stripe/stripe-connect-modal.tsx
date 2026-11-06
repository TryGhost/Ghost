import BookmarkThumb from '@/settings/assets/images/stripe-thumb.jpg';
import GhostLogo from '@/settings/assets/images/orb-squircle.png';
import GhostLogoPink from '@/settings/assets/images/orb-pink.png';
import React, { useEffect, useRef, useState } from 'react';
import StripeButton from '@/settings/components/stripe-button';
import StripeLogo from '@/settings/assets/images/stripe-emblem.svg';
import StripeVerifiedBadge from '@/settings/assets/images/stripe-verified.svg';
import useSettingGroup from '@/settings/hooks/use-setting-group';
import {
  Button,
  Field,
  FieldGroup,
  FieldLabel,
  Input,
  Link,
  Switch,
} from '@tryghost/shade/components';
import { HostLimitError, JSONError } from '@tryghost/admin-x-framework/errors';
import { LucideIcon } from '@tryghost/shade/utils';
import { SettingsModal } from '@tryghost/shade/patterns';
import { Text } from '@tryghost/shade/primitives';
import {
  checkStripeEnabled,
  getSettingValue,
  getSettingValues,
  useDeleteStripeSettings,
  useEditSettings,
} from '@tryghost/admin-x-framework/api/settings';
import { getGhostPaths } from '@tryghost/admin-x-framework/helpers';
import { toast } from 'sonner';
import { useBrowseMembers } from '@tryghost/admin-x-framework/api/members';
import { useBrowseTiers, useEditTier } from '@tryghost/admin-x-framework/api/tiers';
import { useConfirmation } from '@/settings/providers/confirmation-context';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useHandleError, useLimiter } from '@tryghost/admin-x-framework/hooks';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';
import { useUpgradeRoute } from '@/settings/hooks/use-upgrade-route';
import { navigateTo } from '@/utils/navigation';
import {
  connectionStartedHere,
  deliveredSecureKey,
  describeSecureKey,
  forgetDeliveredSecureKey,
  markConnectionStarted,
} from './delivered-secure-key';

const RETRY_PRODUCT_SAVE_POLL_LENGTH = 1000;
const RETRY_PRODUCT_SAVE_MAX_POLL = 15 * RETRY_PRODUCT_SAVE_POLL_LENGTH;

const Start: React.FC<{ onNext?: () => void }> = ({ onNext }) => {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Text as="h3" className="md:text-2xl" leading="heading" size="xl" weight="bold">
          Getting paid
        </Text>
        <img alt="Stripe Verified Partner Badge" src={StripeVerifiedBadge} />
      </div>
      <div className="mt-6 mb-7 text-pretty">
        Stripe is our exclusive direct payments partner. Ghost collects <strong>no fees</strong> on
        any payments! If you don’t have a Stripe account yet, you can{' '}
        <Link href="https://stripe.com" external>
          sign up for Stripe
        </Link>
        .
      </div>
      <StripeButton label={<>I have a Stripe account, let&apos;s go &rarr;</>} onClick={onNext} />
    </div>
  );
};

/**
 * Saves the secure key account.ghost.org delivers, then sets up the default
 * prices and Portal plans. Resolves to an error to show, or '' on success.
 */
const useSaveStripeConnection = () => {
  const { refetch: fetchActiveTiers } = useBrowseTiers({
    searchParams: { filter: 'type:paid+active:true' },
    enabled: false,
  });
  const { mutateAsync: editTier } = useEditTier();
  const { mutateAsync: editSettings } = useEditSettings();
  const handleError = useHandleError();

  const saveTier = async () => {
    const { data } = await fetchActiveTiers();
    const tier = data?.pages[0].tiers[0];

    if (tier) {
      tier.monthly_price = 500;
      tier.yearly_price = 5000;
      tier.currency = 'USD';

      let pollTimeout = 0;
      /** To allow Stripe config to be ready in backend, we poll the save tier request */
      while (pollTimeout < RETRY_PRODUCT_SAVE_MAX_POLL) {
        await new Promise((resolve) => {
          setTimeout(resolve, RETRY_PRODUCT_SAVE_POLL_LENGTH);
        });

        try {
          await editTier(tier);
          break;
        } catch (e) {
          if (e instanceof JSONError && e.data?.errors?.[0].code === 'STRIPE_NOT_CONFIGURED') {
            pollTimeout += RETRY_PRODUCT_SAVE_POLL_LENGTH;
            // no-op: will try saving again as stripe is not ready
            continue;
          } else {
            handleError(e);
            return;
          }
        }
      }
    }
  };

  return async (secureKey: string) => {
    try {
      await editSettings([{ key: 'stripe_connect_integration_token', value: secureKey }]);
    } catch (e) {
      if (e instanceof JSONError && e.data?.errors) {
        return 'Stripe couldn’t be connected. The connection may have expired or been started in another browser. Connect with Stripe to try again.';
      }
      handleError(e);
      return 'Stripe couldn’t be connected. Connect with Stripe to try again.';
    }
    await saveTier();
    try {
      await editSettings([
        { key: 'portal_plans', value: JSON.stringify(['free', 'monthly', 'yearly']) },
      ]);
    } catch (e) {
      handleError(e);
    }
    return '';
  };
};

const Connect: React.FC<{ error?: string }> = ({ error }) => {
  const [testMode, setTestMode] = useState(false);

  const { apiRoot } = getGhostPaths();
  const stripeConnectUrl = `${apiRoot}/members/stripe_connect?mode=${testMode ? 'test' : 'live'}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Text as="h3" className="md:text-2xl" leading="heading" size="xl" weight="bold">
          Connect with Stripe
        </Text>
        <Field className="w-auto" orientation="horizontal">
          <FieldLabel
            className={testMode ? 'text-orange' : 'text-muted-foreground'}
            htmlFor="stripe-test-mode"
          >
            Test mode
          </FieldLabel>
          <Switch
            checked={testMode}
            className="data-[state=checked]:bg-orange!"
            id="stripe-test-mode"
            onCheckedChange={setTestMode}
          />
        </Field>
      </div>
      {error && (
        <Text as="p" className="mb-4 text-red" role="alert">
          {error}
        </Text>
      )}
      <div className="mb-4">
        Click on the <strong>“Connect with Stripe”</strong> button to connect your Ghost site with
        Stripe. You’ll come back here once Stripe is connected.
      </div>
      <StripeButton href={stripeConnectUrl} onClick={markConnectionStarted} />
    </div>
  );
};

/**
 * A delivered key that this tab didn't ask for: it came in a link, so the
 * admin checks which account it connects before it's saved.
 */
const ConfirmAccount: React.FC<{
  account: { name: string; id: string; livemode: boolean };
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ account, onConfirm, onCancel }) => (
  <div>
    <Text as="h3" className="md:text-2xl" leading="heading" size="xl" weight="bold">
      Connect this Stripe account?
    </Text>
    <div className="mt-6 mb-2 text-lg font-semibold">
      {account.name || 'Unnamed account'}
      {!account.livemode && <span className="ml-2 text-orange">Test mode</span>}
    </div>
    <div className="mb-6 text-muted-foreground">{account.id}</div>
    <div className="mb-7 text-pretty">
      This link didn’t come from a connection started in this browser tab. Only connect the account
      if you just connected it in Stripe yourself.
    </div>
    <div className="flex items-center gap-3">
      <StripeButton label="Connect this account" onClick={onConfirm} />
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  </div>
);

/** Saves a key account.ghost.org delivered, without a click. */
const Connecting: React.FC<{ secureKey: string; onFailed: (error: string) => void }> = ({
  secureKey,
  onFailed,
}) => {
  const save = useSaveStripeConnection();
  const started = useRef(false);

  useEffect(() => {
    // The key's state works once, so a second effect run must not save again.
    if (started.current) {
      return;
    }
    started.current = true;
    void save(secureKey).then((error) => {
      if (error) {
        onFailed(error);
      }
    });
  }, [save, secureKey, onFailed]);

  return (
    <Text as="h3" className="md:text-2xl" leading="heading" size="xl" weight="bold">
      Connecting Stripe…
    </Text>
  );
};

const Connected: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { settings } = useGlobalData();
  const [stripeConnectAccountName, stripeConnectLivemode] = getSettingValues(settings, [
    'stripe_connect_display_name',
    'stripe_connect_livemode',
  ]);

  const { refetch: fetchMembers, isFetching: isFetchingMembers } = useBrowseMembers({
    searchParams: { filter: 'status:paid', limit: '0' },
    enabled: false,
  });

  const { mutateAsync: deleteStripeSettings } = useDeleteStripeSettings();
  const handleError = useHandleError();
  const { confirm } = useConfirmation();

  const openDisconnectStripeModal = async () => {
    const { data } = await fetchMembers();
    const hasActiveStripeSubscriptions = Boolean(data?.meta?.pagination.total);

    // const hasActiveStripeSubscriptions = false; //...
    // this.ghostPaths.url.api('/members/') + '?filter=status:paid&limit=0';
    confirm({
      title: 'Disconnect Stripe',
      prompt: hasActiveStripeSubscriptions ? (
        'Cannot disconnect while there are members with active Stripe subscriptions.'
      ) : (
        <>
          You&lsquo;re about to disconnect your Stripe account {stripeConnectAccountName} from this
          site. This will automatically turn off paid memberships on this site.
        </>
      ),
      okLabel: hasActiveStripeSubscriptions ? '' : 'Disconnect',
      onOk: async (modal) => {
        try {
          await deleteStripeSettings(null);
          modal?.remove();
          onClose?.();
        } catch (e) {
          handleError(e);
        }
      },
    });
  };

  return (
    <section>
      <div className="flex items-center justify-between">
        <Button
          disabled={isFetchingMembers}
          type="button"
          variant="destructive-ghost"
          onClick={() => void openDisconnectStripeModal()}
        >
          <LucideIcon.Unlink />
          Disconnect
        </Button>
        <Button aria-label="Close" size="icon" type="button" variant="ghost" onClick={onClose}>
          <LucideIcon.X />
        </Button>
      </div>
      <div className="my-20 flex flex-col items-center">
        <div className="relative h-20 w-[200px]">
          <img alt="Ghost Logo" className="absolute left-10 size-16" src={GhostLogo} />
          <img
            alt="Stripe Logo"
            className="absolute right-10 size-16 rounded-2xl shadow-[-1.5px_0_0_1.5px_#fff] dark:shadow-[-1.5px_0_0_1.5px_black]"
            src={StripeLogo}
          />
        </div>
        <Text as="h3" className="text-center md:text-2xl" leading="heading" size="xl" weight="bold">
          You are connected with Stripe!{stripeConnectLivemode ? null : ' (Test mode)'}
        </Text>
        <div className="mt-1">
          Connected to{' '}
          <strong>{stripeConnectAccountName ? stripeConnectAccountName : 'Test mode'}</strong>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <Text as="h6" className="text-base" weight="semibold">
          Read next
        </Text>
        <a
          className="mt-5 flex w-full flex-col items-stretch justify-between overflow-hidden rounded-md border border-gray-200 transition-all hover:border-gray-400 md:flex-row dark:border-gray-900"
          href="https://ghost.org/resources/managing-your-stripe-account/?ref=admin"
          rel="noopener noreferrer"
          target="_blank"
        >
          <div className="order-2 p-4 md:order-1">
            <div className="text-md font-semibold">How to setup and manage your Stripe account</div>
            <div className="mt-2 text-gray-800 dark:text-gray-500">
              Learn how to configure your Stripe account to work with Ghost, from custom branding to
              payment receipt emails.
            </div>
            <div className="mt-3 flex items-center gap-1 text-gray-800 dark:text-gray-500">
              <img alt="Ghost Logo" className="size-4" src={GhostLogoPink} />
              <span className="font-semibold">Ghost Resources</span>
            </div>
          </div>
          <div className="order-1 hidden w-[200px] shrink-0 items-center justify-center overflow-hidden md:visible! md:order-2 md:flex!">
            <img
              alt="Bookmark Thumb"
              className="min-h-full min-w-full shrink-0"
              src={BookmarkThumb}
            />
          </div>
        </a>
      </div>
    </section>
  );
};

const Direct: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { localSettings, updateSetting, handleSave, saveState } = useSettingGroup();
  const [publishableKey, secretKey] = getSettingValues(localSettings, [
    'stripe_publishable_key',
    'stripe_secret_key',
  ]);

  const onSubmit = async () => {
    try {
      toast.dismiss();
      await handleSave();
      onClose();
    } catch (e) {
      if (e instanceof JSONError) {
        toast.error('Failed to save settings', {
          description: 'Check you copied both keys correctly',
        });
        return;
      }

      throw e;
    }
  };

  return (
    <div>
      <Text as="h3" className="md:text-2xl" leading="heading" size="xl" weight="bold">
        Connect Stripe
      </Text>
      <FieldGroup className="mt-10 gap-8">
        <Field>
          <FieldLabel htmlFor="stripe-publishable-key">Publishable key</FieldLabel>
          <Input
            id="stripe-publishable-key"
            value={publishableKey?.toString() ?? ''}
            onChange={(e) => updateSetting('stripe_publishable_key', e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="stripe-secure-key">Secure key</FieldLabel>
          <Input
            id="stripe-secure-key"
            value={secretKey?.toString() ?? ''}
            onChange={(e) => updateSetting('stripe_secret_key', e.target.value)}
          />
        </Field>
        <Button
          className="mt-5"
          disabled={saveState === 'saving'}
          type="button"
          onClick={() => void onSubmit()}
        >
          Save Stripe settings
        </Button>
      </FieldGroup>
    </div>
  );
};

const StripeConnectModal: React.FC = () => {
  const { config, settings } = useGlobalData();
  const stripeConnectAccountId = getSettingValue(settings, 'stripe_connect_account_id');
  const { updateRoute } = useSettingsNavigation();
  const upgradeRoute = useUpgradeRoute();
  // A key account.ghost.org delivered (see delivered-secure-key.ts) counts
  // only if this modal can connect it now, and only for this modal: it's
  // forgotten as the modal opens, whichever screen it shows. It's saved
  // straight away when this tab started the connection, and confirmed first
  // otherwise. If saving fails, the user connects again from here.
  const canConnect =
    !config?.stripeDirect &&
    !checkStripeEnabled(settings || [], config || {}) &&
    !stripeConnectAccountId;
  const [secureKey, setSecureKey] = useState(() => (canConnect ? deliveredSecureKey() : ''));
  const [startedHere] = useState(connectionStartedHere);
  const [account] = useState(() => (secureKey ? describeSecureKey(secureKey) : null));
  const [confirmed, setConfirmed] = useState(false);
  const [connectError, setConnectError] = useState(() =>
    secureKey && !startedHere && !account
      ? 'This link isn’t a Stripe connection. Connect with Stripe to try again.'
      : '',
  );
  const [step, setStep] = useState<'start' | 'connect'>(secureKey ? 'connect' : 'start');
  useEffect(() => {
    forgetDeliveredSecureKey();
  }, []);
  const limiter = useLimiter();
  const { showLimit } = useConfirmation();

  // Extract specific values needed for checkStripeEnabled, so not to
  // cause unnecessary re-renders by passing the whole settings object
  const stripeEnabled = checkStripeEnabled(settings, config);
  const hasStripeConnectLimit = limiter?.isDisabled('limitStripeConnect');

  useEffect(() => {
    const checkLimit = async () => {
      // Allow Stripe despite the limit when it's already connected, so it's
      // possible to disconnect or update the settings.
      if (hasStripeConnectLimit && !stripeEnabled) {
        try {
          await limiter?.errorIfWouldGoOverLimit('limitStripeConnect');
        } catch (error) {
          if (error instanceof HostLimitError) {
            updateRoute('tiers');
            showLimit({
              prompt: error.message || `Your current plan doesn't support Stripe Connect.`,
              onOk: () => {
                navigateTo(upgradeRoute);
              },
            });
          }
        }
      }
    };

    void checkLimit();
  }, [limiter, updateRoute, stripeEnabled, hasStripeConnectLimit, showLimit, upgradeRoute]);

  const startFlow = () => {
    setStep('connect');
  };

  const close = () => {
    updateRoute('tiers');
  };

  let contents;

  if (
    config?.stripeDirect ||
    // Still show Stripe Direct to allow disabling the keys if the config was turned off but stripe direct is still set up
    (checkStripeEnabled(settings || [], config || {}) && !stripeConnectAccountId)
  ) {
    contents = <Direct onClose={close} />;
  } else if (stripeConnectAccountId) {
    contents = <Connected onClose={close} />;
  } else if (step === 'start') {
    contents = <Start onNext={startFlow} />;
  } else if (secureKey && !connectError && (startedHere || confirmed)) {
    contents = <Connecting secureKey={secureKey} onFailed={setConnectError} />;
  } else if (secureKey && !connectError && account) {
    contents = (
      <ConfirmAccount
        account={account}
        onCancel={() => setSecureKey('')}
        onConfirm={() => setConfirmed(true)}
      />
    );
  } else {
    contents = <Connect error={connectError} />;
  }

  return (
    <SettingsModal
      cancelLabel=""
      footer={<div className="mt-8"></div>}
      testId="stripe-modal"
      title=""
      width={stripeConnectAccountId ? 740 : 520}
      hideXOnMobile
      onClose={() => {
        updateRoute('tiers');
      }}
    >
      {contents}
    </SettingsModal>
  );
};

export default StripeConnectModal;

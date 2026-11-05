import App from '../src/app';
import setupGhostApi from '../src/utils/api';
import {
  offer as FixtureOffer,
  site as FixtureSite,
  member as FixtureMember,
} from './utils/test-fixtures';
import { appRender, fireEvent, waitFor, within } from './utils/test-utils';

type PortalOptions = {
  member?: typeof FixtureMember.free | typeof FixtureMember.paid | null;
  offer?: typeof FixtureOffer | null;
  offerError?: boolean;
};

const realLocation = window.location;
const locationAssign = vi.fn<(url: string) => void>();
const site = { ...FixtureSite.singleTier.basic, url: 'https://portal.localhost/blog/' };
const offerUrl = `${site.url}#/portal/offers/${FixtureOffer.id}`;

function setLocation(url: string) {
  const location = Object.assign(new URL(url), { assign: locationAssign });
  Object.defineProperty(window, 'location', { value: location, writable: true });
}

async function openPortal({
  member = null,
  offer = FixtureOffer,
  offerError = false,
}: PortalOptions = {}) {
  const api = setupGhostApi({ siteUrl: site.url, apiUrl: '', apiKey: '' });
  api.init = vi.fn().mockResolvedValue({ site, member });
  api.site.offer = offerError
    ? vi.fn().mockRejectedValue(new Error('Offer not found'))
    : vi.fn().mockResolvedValue({ offers: offer ? [offer] : [] });
  api.member.getIntegrityToken = vi.fn().mockResolvedValue('testtoken');
  const sendMagicLink = vi
    .spyOn(api.member, 'sendMagicLink')
    .mockResolvedValue({ otc_ref: 'offer-signin-ref' });
  api.member.verifyOTC = vi.fn().mockResolvedValue({ redirectUrl: offerUrl });
  const utils = appRender(<App api={api} showPopup={false} />);
  await utils.findByTitle(/portal-trigger/i);
  return { ...utils, api, sendMagicLink };
}

function getPopupBody(frame: HTMLElement) {
  if (!(frame instanceof HTMLIFrameElement) || !frame.contentDocument) {
    throw new Error('Portal must render in an accessible iframe');
  }
  return frame.contentDocument.body;
}

describe('Signing in from an offer', () => {
  beforeEach(() => {
    locationAssign.mockReset();
    setLocation(offerUrl);
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: realLocation, writable: true });
    vi.restoreAllMocks();
  });

  describe.each(['magic link', 'code'])('%s', (authMethod) => {
    test.each<[string, PortalOptions]>([
      ['free member', { member: FixtureMember.free }],
      ['paid member', { member: FixtureMember.paid }],
      [
        'archived offer',
        { member: FixtureMember.free, offer: { ...FixtureOffer, status: 'archived' } },
      ],
      ['expired offer', { member: FixtureMember.free, offerError: true }],
      ['removed offer', { member: FixtureMember.free, offer: null }],
    ])('rechecks the offer after authentication for a %s', async (scenario, returnState) => {
      const initial = await openPortal();
      const popup = await initial.findByTitle(/portal-popup/i);
      const portal = within(getPopupBody(popup));
      await portal.findByText(FixtureOffer.display_title);

      fireEvent.click(portal.getByRole('button', { name: 'Sign in' }));
      await portal.findByRole('heading', { name: 'Sign in' });
      fireEvent.change(portal.getByLabelText(/email/i), {
        target: { value: FixtureMember.free.email },
      });
      fireEvent.click(portal.getByRole('button', { name: 'Continue' }));
      await portal.findByText(/Now check your email/i);

      expect(initial.sendMagicLink).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'signin',
          redirect: offerUrl,
        }),
      );
      if (authMethod === 'code') {
        fireEvent.change(portal.getByLabelText(/Code/i), { target: { value: '123456' } });
        await waitFor(() => expect(locationAssign).toHaveBeenCalledWith(offerUrl));
        expect(initial.api.member.verifyOTC).toHaveBeenCalledWith({
          otc: '123456',
          otcRef: 'offer-signin-ref',
          redirect: offerUrl,
          integrityToken: 'testtoken',
        });
      }

      // Authentication reloads Portal at the return URL with a fresh member and offer.
      initial.unmount();
      setLocation(offerUrl);
      const returned = await openPortal(returnState);
      if (scenario === 'free member') {
        const returnedPopup = await returned.findByTitle(/portal-popup/i);
        const returnedPortal = within(getPopupBody(returnedPopup));
        expect(await returnedPortal.findByText(FixtureOffer.display_title)).toBeInTheDocument();
        expect(returnedPortal.getByLabelText(/email/i)).toHaveValue(FixtureMember.free.email);
        expect(returnedPortal.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
        expect(returned.api.site.offer).toHaveBeenCalledWith({ offerId: FixtureOffer.id });
      } else if (scenario === 'paid member') {
        const notification = await returned.findByTitle(/portal-notification/i);
        expect(
          within(getPopupBody(notification)).getByText('You already have an active subscription.'),
        ).toBeInTheDocument();
        expect(returned.queryByTitle(/portal-popup/i)).not.toBeInTheDocument();
        expect(returned.api.site.offer).not.toHaveBeenCalled();
      } else {
        await waitFor(() =>
          expect(returned.api.site.offer).toHaveBeenCalledWith({ offerId: FixtureOffer.id }),
        );
        expect(returned.queryByTitle(/portal-popup/i)).not.toBeInTheDocument();
      }
    });
  });
});

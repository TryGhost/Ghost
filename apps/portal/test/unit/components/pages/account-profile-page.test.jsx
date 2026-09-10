import { render, fireEvent } from '../../../utils/test-utils';
import { getSiteData, getMemberData } from '../../../../src/utils/fixtures-generator';
import { COUNTRY_CODES } from '@tryghost/metafield-types/countries';
import AccountProfilePage from '../../../../src/components/pages/account-profile-page';

const setup = (overrides = {}) => {
  const { mockDoActionFn, context, ...utils } = render(<AccountProfilePage />, {
    overrideContext: {
      ...overrides,
    },
  });
  const emailInputEl = utils.getByLabelText('Email');
  const nameInputEl = utils.getByLabelText('Name');
  const saveBtn = utils.queryByRole('button', { name: 'Save' });
  return {
    emailInputEl,
    nameInputEl,
    saveBtn,
    mockDoActionFn,
    context,
    ...utils,
  };
};

describe('Account Profile Page', () => {
  test('renders', () => {
    const { emailInputEl, nameInputEl, saveBtn } = setup();

    expect(emailInputEl).toBeInTheDocument();
    expect(nameInputEl).toBeInTheDocument();
    expect(saveBtn).toBeInTheDocument();
  });

  test('can call save', () => {
    const { mockDoActionFn, saveBtn, context } = setup();

    fireEvent.click(saveBtn);
    const { email, name } = context.member;
    expect(mockDoActionFn).toHaveBeenCalledWith('updateProfile', { email, name });
  });

  test('orders Back before Close in keyboard navigation', () => {
    const { getByRole } = setup({ lastPage: 'accountHome' });

    const backBtn = getByRole('button', { name: 'Back' });
    const closeBtn = getByRole('button', { name: 'Close popup' });

    expect(
      backBtn.compareDocumentPosition(closeBtn) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test('uses the accent color for Back and Close', () => {
    const { getByRole, getByTestId } = setup({
      brandColor: '#ff0099',
      lastPage: 'accountHome',
    });

    const backBtn = getByRole('button', { name: 'Back' });
    const closeIcon = getByTestId('close-popup').querySelector('.gh-portal-closeicon');

    expect(backBtn).toHaveStyle({ color: '#ff0099' });
    expect(closeIcon).toHaveStyle({ color: '#ff0099' });
  });

  describe('Custom fields', () => {
    const site = getSiteData({ labs: { membersCustomFields: true } });
    const nickname = {
      key: 'nickname',
      name: 'Nickname',
      type: 'short_text',
      access: { member: 'write' },
    };
    const bio = { key: 'bio', name: 'Bio', type: 'long_text', access: { member: 'write' } };
    const address = {
      key: 'shipping_address',
      name: 'Shipping address',
      type: 'address',
      access: { member: 'read' },
    };
    const member = {
      ...getMemberData({ name: 'Jamie Larson', email: 'jamie@example.com' }),
      metafields: { custom: { nickname: 'Jam', shipping_address: { city: 'Berlin' } } },
    };
    test('shows the opened fields, editable or read-only as the publisher chose', () => {
      const customFields = [nickname, bio, address];
      const { getByLabelText, getByText } = setup({ site, member, customFields });

      const nicknameInput = getByLabelText('Nickname');
      expect(nicknameInput).toHaveValue('Jam');
      expect(nicknameInput).toBeEnabled();
      expect(getByLabelText('Bio').tagName).toBe('TEXTAREA');

      expect(getByText('Shipping address')).toBeInTheDocument();
      const city = getByLabelText('City');
      expect(city).toHaveValue('Berlin');
      expect(city).toHaveAttribute('readonly');
      expect(getByLabelText('Address line 1')).toHaveAttribute('readonly');
      // The part names stay as placeholders either way: they are what tells the
      // parts of an address apart once their labels are hidden.
      expect(getByLabelText('Postal code')).toHaveAttribute('placeholder', 'Postal code');
    });

    test('leaves out a field of a type this build cannot draw', () => {
      const customFields = [nickname, { ...nickname, key: 'when', name: 'When', type: 'date' }];
      const { queryByLabelText } = setup({ site, member, customFields });

      expect(queryByLabelText('When')).not.toBeInTheDocument();
    });

    test('saves only the writable fields the member changed', () => {
      const customFields = [nickname, address];
      const { getByLabelText, saveBtn, mockDoActionFn } = setup({ site, member, customFields });

      fireEvent.change(getByLabelText('Nickname'), { target: { value: 'Jamie' } });
      fireEvent.click(saveBtn);

      expect(mockDoActionFn).toHaveBeenCalledWith('updateProfile', {
        email: member.email,
        name: member.name,
        metafields: { custom: { nickname: 'Jamie' } },
      });
    });

    test('saves a long text field', () => {
      const { getByLabelText, saveBtn, mockDoActionFn } = setup({
        site,
        member,
        customFields: [bio],
      });

      fireEvent.change(getByLabelText('Bio'), { target: { value: 'Runs. Eats rice.' } });
      fireEvent.click(saveBtn);

      expect(mockDoActionFn).toHaveBeenCalledWith(
        'updateProfile',
        expect.objectContaining({ metafields: { custom: { bio: 'Runs. Eats rice.' } } }),
      );
    });

    test('never sends a field the member may only read, even when its input changed', () => {
      const { getByLabelText, saveBtn, mockDoActionFn } = setup({
        site,
        member,
        customFields: [address],
      });

      fireEvent.change(getByLabelText('City'), { target: { value: 'Munich' } });
      fireEvent.click(saveBtn);

      expect(mockDoActionFn).toHaveBeenCalledWith('updateProfile', {
        email: member.email,
        name: member.name,
      });
    });

    test('offers the country as a list of the countries an address may name', () => {
      const editable = { ...address, access: { member: 'write' } };
      const { getByLabelText, saveBtn, mockDoActionFn } = setup({
        site,
        member,
        customFields: [editable],
      });

      const country = getByLabelText('Country');
      expect(country.tagName).toBe('SELECT');
      const labels = Array.from(country.options).map((option) => option.textContent);
      expect(labels).toContain('Finland');
      expect(labels).toContain('Germany');
      expect(labels).toContain('Iran');
      // Every country, plus the placeholder option.
      expect(labels).toHaveLength(COUNTRY_CODES.length + 1);

      fireEvent.change(country, { target: { value: 'FI' } });
      fireEvent.click(saveBtn);

      expect(mockDoActionFn).toHaveBeenCalledWith(
        'updateProfile',
        expect.objectContaining({
          metafields: { custom: { shipping_address: { country: 'FI' } } },
        }),
      );
    });

    test('shows a stored country the list does not hold rather than nothing', () => {
      const editable = { ...address, access: { member: 'write' } };
      // Stripe's "unknown region" code: a checkout can store it, the list never offers it.
      const stored = { ...member, metafields: { custom: { shipping_address: { country: 'ZZ' } } } };
      const { getByLabelText, saveBtn, mockDoActionFn } = setup({
        site,
        member: stored,
        customFields: [editable],
      });

      const country = getByLabelText('Country');
      expect(country).toHaveValue('ZZ');
      // Named the way Admin names it, rather than shown as the bare code.
      expect(country.options[country.selectedIndex]).toHaveTextContent('Unknown Region');
      fireEvent.click(saveBtn);
      expect(mockDoActionFn).toHaveBeenCalledWith('updateProfile', {
        email: stored.email,
        name: stored.name,
      });
    });

    test('renders a view-only country as a disabled select', () => {
      const { getByLabelText } = setup({ site, member, customFields: [address] });

      const country = getByLabelText('Country');
      expect(country.tagName).toBe('SELECT');
      expect(country).toBeDisabled();
    });

    test('clears a country through the empty option', () => {
      const editable = { ...address, access: { member: 'write' } };
      const stored = {
        ...member,
        metafields: { custom: { shipping_address: { city: 'Berlin', country: 'DE' } } },
      };
      const { getByLabelText, saveBtn, mockDoActionFn } = setup({
        site,
        member: stored,
        customFields: [editable],
      });

      const country = getByLabelText('Country');
      // With a country chosen the empty option is offered as the way to clear it.
      expect(country.options[0]).toHaveTextContent('(None)');
      expect(country.options[0]).not.toBeDisabled();
      fireEvent.change(country, { target: { value: '' } });
      fireEvent.click(saveBtn);

      expect(mockDoActionFn).toHaveBeenCalledWith(
        'updateProfile',
        expect.objectContaining({ metafields: { custom: { shipping_address: { country: '' } } } }),
      );
    });

    test('sends only the parts of an address the member changed', () => {
      const editable = { ...address, access: { member: 'write' } };
      const { getByLabelText, saveBtn, mockDoActionFn } = setup({
        site,
        member,
        customFields: [editable],
      });

      fireEvent.change(getByLabelText('Postal code'), { target: { value: '10115' } });
      fireEvent.click(saveBtn);

      expect(mockDoActionFn).toHaveBeenCalledWith(
        'updateProfile',
        expect.objectContaining({
          metafields: { custom: { shipping_address: { postal_code: '10115' } } },
        }),
      );
    });

    test('clears an address the member emptied rather than sending it empty', () => {
      const editable = { ...address, access: { member: 'write' } };
      const { getByLabelText, saveBtn, mockDoActionFn } = setup({
        site,
        member,
        customFields: [editable],
      });

      fireEvent.change(getByLabelText('City'), { target: { value: '' } });
      fireEvent.click(saveBtn);

      expect(mockDoActionFn).toHaveBeenCalledWith(
        'updateProfile',
        expect.objectContaining({ metafields: { custom: { shipping_address: null } } }),
      );
    });

    test('leaves custom fields out of the save when nothing changed', () => {
      const customFields = [nickname, address];
      const { saveBtn, mockDoActionFn } = setup({ site, member, customFields });

      fireEvent.click(saveBtn);

      expect(mockDoActionFn).toHaveBeenCalledWith('updateProfile', {
        email: member.email,
        name: member.name,
      });
    });

    test('asks for the fields when arriving without them', () => {
      const { mockDoActionFn } = setup({ site, member, customFields: null });
      expect(mockDoActionFn).toHaveBeenCalledWith('loadCustomFields');
    });

    test('does not ask again once the fields are known', () => {
      const { mockDoActionFn } = setup({ site, member, customFields: [] });
      expect(mockDoActionFn).not.toHaveBeenCalledWith('loadCustomFields');
    });
  });
});

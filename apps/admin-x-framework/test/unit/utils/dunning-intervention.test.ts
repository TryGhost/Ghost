import { decideDunningIntervention } from '../../../src/utils/dunning-intervention';

const ownerInput = {
  isGrace: true,
  paymentAttempts: 3,
  forceUpgrade: false,
  audience: 'owner' as const,
  modalDismissed: false,
};

describe('decideDunningIntervention', () => {
  it('shows the pre-lock reminder when Billing reports grace', () => {
    expect(decideDunningIntervention(ownerInput)).toEqual({
      reminderModalVisible: true,
      copyVariant: 'owner-counted',
      visiblePaymentAttempts: 3,
      showBillingAction: true,
    });
  });

  it.each([undefined, null, false, '', 0, 'true'])(
    'does not intervene for non-true Billing grace value %s',
    (isGrace) => {
      expect(decideDunningIntervention({ ...ownerInput, isGrace })).toEqual({
        reminderModalVisible: false,
        copyVariant: null,
        visiblePaymentAttempts: null,
        showBillingAction: false,
      });
    },
  );

  it('suppresses the reminder and its Billing action after the shared gate activates', () => {
    expect(
      decideDunningIntervention({ ...ownerInput, paymentAttempts: 5, forceUpgrade: true }),
    ).toEqual({
      reminderModalVisible: false,
      copyVariant: 'owner-counted',
      visiblePaymentAttempts: 5,
      showBillingAction: false,
    });
  });

  it('uses the shared gate rather than the attempt count during config convergence', () => {
    expect(
      decideDunningIntervention({ ...ownerInput, paymentAttempts: 5, forceUpgrade: false }),
    ).toMatchObject({
      reminderModalVisible: true,
      showBillingAction: true,
    });
  });

  it('keeps the reminder dismissed for the current Admin session', () => {
    expect(decideDunningIntervention({ ...ownerInput, modalDismissed: true })).toMatchObject({
      reminderModalVisible: false,
      showBillingAction: false,
    });
  });

  it.each([undefined, null, 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '3'])(
    'uses generic owner copy for invalid attempt count %s',
    (paymentAttempts) => {
      expect(decideDunningIntervention({ ...ownerInput, paymentAttempts })).toMatchObject({
        copyVariant: 'owner-generic',
        visiblePaymentAttempts: null,
      });
    },
  );

  it('never exposes attempt data or a pre-lock Billing action to staff', () => {
    expect(decideDunningIntervention({ ...ownerInput, audience: 'staff' })).toEqual({
      reminderModalVisible: true,
      copyVariant: 'staff',
      visiblePaymentAttempts: null,
      showBillingAction: false,
    });
  });

  it('suppresses the reminder for staff after the shared gate activates', () => {
    expect(
      decideDunningIntervention({ ...ownerInput, audience: 'staff', forceUpgrade: true }),
    ).toMatchObject({
      reminderModalVisible: false,
      visiblePaymentAttempts: null,
      showBillingAction: false,
    });
  });
});

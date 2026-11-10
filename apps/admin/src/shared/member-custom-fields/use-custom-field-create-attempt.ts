import {
  APIError,
  HostLimitError,
  JSONError,
  ValidationError,
  getErrorMessage,
} from '@tryghost/admin-x-framework/errors';
import {
  type MemberCustomField,
  type NewMemberCustomField,
  useCreateMemberCustomField,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { useCallback, useState } from 'react';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';

/** One attempt to create a field from a form outside Settings, as the form shows it. */
export type CreateAttempt =
  | { readonly state: 'idle' }
  | { readonly state: 'saving' }
  | {
      readonly state: 'refused';
      /** On the name input, for a refusal the publisher can answer by typing; below the form otherwise. */
      readonly on: 'name' | 'form';
      readonly message: string;
      /**
       * False once nothing the publisher changes can help, such as a site at its field ceiling,
       * so the form stops inviting the same doomed request.
       */
      readonly canRetry: boolean;
    };

const IDLE: CreateAttempt = { state: 'idle' };

/** The refusal a failed create shows, and whether it is a fault error tracking should see. */
function refusalOf(error: unknown): { attempt: CreateAttempt; isFault: boolean } {
  const apiError = error instanceof JSONError ? error.data?.errors?.[0] : null;
  if (error instanceof ValidationError && apiError?.property === 'name') {
    return {
      attempt: {
        state: 'refused',
        on: 'name',
        message: getErrorMessage(error, 'Invalid name'),
        canRetry: true,
      },
      isFault: false,
    };
  }
  // The server's own sentence wherever there is one: for the site's field ceiling it is the only
  // thing that explains the refusal. The fallback covers the errors carrying no API body at all
  // (maintenance, timeout, unreachable), whose class message is the text.
  const message = getErrorMessage(
    error,
    error instanceof APIError
      ? error.message
      : 'Could not create the custom field, please try again.',
  );
  // The ceiling is an expected answer rather than a fault; everything else reaching here (a 500,
  // a timeout, an expired session) should be visible to us.
  const isHostLimit = error instanceof HostLimitError;
  return {
    attempt: {
      state: 'refused',
      on: 'form',
      message,
      canRetry: !isHostLimit && apiError?.type !== 'NoPermissionError',
    },
    isFault: !isHostLimit,
  };
}

/**
 * Creates a custom field from a form outside Settings, such as a custom field picker or the
 * members import, and holds the attempt the form shows: saving, or refused and where.
 *
 * The attempt turns to saving as Save is pressed, not when the request reports itself pending,
 * which it does only a moment later. Until then the form could still be put away, leaving its
 * answer nowhere to show, or saved a second time.
 *
 * What the new field means is the caller's business: `create` resolves with the field, or with
 * nothing once the attempt shows why there is none.
 */
export function useCustomFieldCreateAttempt({
  createdUnusable,
}: {
  /**
   * Shown when the site answers without the field. It may well have been made, so this says
   * so rather than inviting a second one.
   */
  createdUnusable: string;
}) {
  const { mutateAsync } = useCreateMemberCustomField();
  const handleError = useHandleError();
  const [attempt, setAttempt] = useState<CreateAttempt>(IDLE);

  const create = async (newField: NewMemberCustomField): Promise<MemberCustomField | null> => {
    // Each save gets its own answer: the last attempt's refusal goes as this one starts.
    setAttempt({ state: 'saving' });
    let field: MemberCustomField | undefined;
    try {
      const response = await mutateAsync(newField);
      field = response.members_metafields?.[0];
    } catch (error) {
      const refusal = refusalOf(error);
      // Shown in the form, an inch above the button they pressed, so no toast.
      if (refusal.isFault) {
        handleError(error, { withToast: false });
      }
      setAttempt(refusal.attempt);
      return null;
    }
    if (!field) {
      handleError(new Error('Custom field create returned no field'), { withToast: false });
      setAttempt({ state: 'refused', on: 'form', message: createdUnusable, canRetry: false });
      return null;
    }
    setAttempt(IDLE);
    return field;
  };

  /** Forgets the last attempt's refusal, which was about a form that has changed or gone. */
  const reset = useCallback(() => setAttempt(IDLE), []);

  return { attempt, create, reset };
}

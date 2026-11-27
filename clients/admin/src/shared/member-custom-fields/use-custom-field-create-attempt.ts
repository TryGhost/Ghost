import {
  HostLimitError,
  JSONError,
  MaintenanceError,
  getErrorMessage,
} from '@tryghost/admin-x-framework/errors';
import {
  type CustomFieldErrors,
  type CustomFieldValues,
  newFieldOf,
  refusalErrors,
} from '@/shared/member-custom-fields/custom-field-values';
import {
  type MemberCustomField,
  useCreateMemberCustomField,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useState } from 'react';

/** One attempt to create a field from a form outside Settings, as the form shows it. */
export type CreateAttempt =
  | { readonly state: 'idle' }
  | { readonly state: 'saving' }
  /** Refused over what was typed: shown beside the inputs that set it, and answered by changing them. */
  | { readonly state: 'refused'; readonly errors: CustomFieldErrors }
  /** Failed for a reason no input explains: shown below the form. */
  | {
      readonly state: 'failed';
      readonly message: string;
      /**
       * False once nothing the publisher changes can help, such as a site at its field ceiling,
       * so the form stops inviting the same doomed request.
       */
      readonly canRetry: boolean;
    };

/** What a form says about a create that failed for a reason no input explains. */
export interface CreateFailure {
  readonly message: string;
  readonly canRetry: boolean;
  /** Whether error tracking should see it, as opposed to an answer the site meant to give. */
  readonly isFault: boolean;
}

const IDLE: CreateAttempt = { state: 'idle' };

const UNEXPECTED = 'An unexpected error occurred, please try again.';

/**
 * What a form says about a create that failed for a reason no input explains.
 *
 * The site's own words are shown only where it deliberately writes them for publishers: a host
 * limit, whose sentence is the only thing that explains it. A missing permission and maintenance
 * get Admin's own. Anything else, from a 500 to a refusal Admin's form should never have sent, is a
 * fault: its wording is for whoever investigates it, so the form says something went wrong and lets
 * them try again.
 */
export function failureOf(error: unknown): CreateFailure {
  // Nothing the publisher changes moves a limit or a permission, so neither invites a retry.
  if (error instanceof HostLimitError) {
    return { message: getErrorMessage(error, UNEXPECTED), canRetry: false, isFault: false };
  }
  const apiError = error instanceof JSONError ? error.data?.errors?.[0] : null;
  if (apiError?.type === 'NoPermissionError') {
    return {
      message: "You don't have permission to create custom fields.",
      canRetry: false,
      isFault: false,
    };
  }
  // Admin's requests wait out a short maintenance on their own, so one that reaches here is still
  // under way, and it says to try again later.
  if (error instanceof MaintenanceError) {
    return { message: error.message, canRetry: true, isFault: false };
  }
  return { message: UNEXPECTED, canRetry: true, isFault: true };
}

/**
 * Creates a custom field from a form outside Settings, such as a custom field picker or the
 * members import, and holds the attempt the form shows: saving, refused beside an input, or
 * failed.
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

  // Shown in the form, an inch above the button they pressed, so no toast.
  const fail = (error: unknown, { message, canRetry, isFault }: CreateFailure) => {
    if (isFault) {
      handleError(error, { withToast: false, displayedMessage: message });
    }
    setAttempt({ state: 'failed', message, canRetry });
  };

  const create = async (values: CustomFieldValues): Promise<MemberCustomField | null> => {
    // Each save gets its own answer: the last attempt's goes as this one starts.
    setAttempt({ state: 'saving' });
    let field: MemberCustomField | undefined;
    try {
      const response = await mutateAsync(newFieldOf(values));
      field = response.members_metafields?.[0];
    } catch (error) {
      // As Settings shows it: beside the input that set what was refused, such as the name or
      // one of a list's options.
      const errors = refusalErrors(error, values);
      if (errors) {
        setAttempt({ state: 'refused', errors });
      } else {
        fail(error, failureOf(error));
      }
      return null;
    }
    if (!field) {
      fail(new Error('Custom field create returned no field'), {
        message: createdUnusable,
        canRetry: false,
        isFault: true,
      });
      return null;
    }
    setAttempt(IDLE);
    return field;
  };

  /** Forgets the last attempt's answer, which was about a form that has changed or gone. */
  const reset = () => setAttempt(IDLE);

  return { attempt, create, reset };
}

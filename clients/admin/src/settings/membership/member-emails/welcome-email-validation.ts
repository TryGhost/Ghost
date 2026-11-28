import { isEmptyLexical } from '@/utils/is-empty-lexical';

export type WelcomeEmailDraft = {
  subject: string;
  lexical: string;
};

export const getWelcomeEmailValidationErrors = (
  state: WelcomeEmailDraft,
): Record<string, string> => {
  const newErrors: Record<string, string> = {};

  if (!state.subject?.trim()) {
    newErrors.subject = 'A subject is required';
  }

  if (isEmptyLexical(state.lexical)) {
    newErrors.lexical = 'Email content is required';
  }

  return newErrors;
};

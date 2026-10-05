import {
  type FocusEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { formatUrl } from '@/settings/utils/format-url';

type UseUrlInputOptions = {
  baseUrl?: string;
  nullable?: boolean;
  transformPathWithoutSlash?: boolean;
  value: string | null;
  onChange: (value: string | null) => void;
};

const useUrlInput = ({
  baseUrl,
  nullable,
  transformPathWithoutSlash,
  value,
  onChange,
}: UseUrlInputOptions) => {
  const [displayValue, setDisplayValue] = useState('');

  // The value last saved by `setDraftValue`. When it comes back as `value`,
  // re-syncing the display would reformat what the user is still typing
  // ('/con' is saved as '/con/' and displayed as 'https://site.com/con/')
  const draftValue = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (draftValue.current !== undefined && value === draftValue.current) {
      return;
    }
    draftValue.current = undefined;
    setDisplayValue(formatUrl(value || '', baseUrl, nullable).display);
  }, [baseUrl, nullable, value]);

  const resolveUrls = useCallback(
    (text: string) => {
      let urls = formatUrl(text, baseUrl, nullable);

      if (transformPathWithoutSlash && !urls.display.includes('//') && (text || !nullable)) {
        const candidate = formatUrl(`/${text}`, baseUrl, nullable);

        if (candidate.display.includes('//')) {
          urls = candidate;
        }
      }

      return urls;
    },
    [baseUrl, nullable, transformPathWithoutSlash],
  );

  const commitValue = useCallback(() => {
    const urls = resolveUrls(displayValue);

    setDisplayValue(urls.display);
    if (urls.save !== value) {
      onChange(urls.save);
    }
  }, [displayValue, onChange, resolveUrls, value]);

  // Saves as the user types, so the form is dirty straight away, while
  // leaving the text as typed until `commitValue` normalizes it
  const setDraftValue = useCallback(
    (text: string) => {
      setDisplayValue(text);

      const { save } = resolveUrls(text);
      if (save !== value) {
        draftValue.current = save;
        onChange(save);
      }
    },
    [onChange, resolveUrls, value],
  );

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      if (displayValue === baseUrl) {
        setTimeout(() =>
          event.target.setSelectionRange(event.target.value.length, event.target.value.length),
        );
      }
    },
    [baseUrl, displayValue],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (displayValue === baseUrl && ['Backspace', 'Delete'].includes(event.key)) {
        setDisplayValue('');
      }
    },
    [baseUrl, displayValue],
  );

  return {
    commitValue,
    displayValue,
    handleFocus,
    handleKeyDown,
    setDisplayValue,
    setDraftValue,
  };
};

export default useUrlInput;

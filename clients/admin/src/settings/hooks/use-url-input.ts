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

  // What `setDraftValue` last saved. When it comes back as `value`, the display
  // is left alone, or the URL would be reformatted mid-typing ('/con' would
  // jump to 'https://site.com/con/')
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

  // Saves on every keystroke, so the form knows about the change straight
  // away, but leaves the text as typed until `commitValue` tidies it
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

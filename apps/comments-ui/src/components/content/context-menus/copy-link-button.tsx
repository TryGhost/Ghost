import CheckIcon from '../../../images/icons/check.svg?react';
import LinkIcon from '../../../images/icons/link.svg?react';
import React, { useEffect, useRef, useState } from 'react';
import { type Comment, useAppContext } from '../../../app-context';
import { buildCommentShareUrl } from '../../../utils/helpers';

type Props = {
  comment: Comment;
  close: () => void;
  className: string;
  iconClassName: string;
};

// Keep the menu open long enough for the confirmation to be read
const CLOSE_DELAY_MS = 1000;

const CopyLinkButton: React.FC<Props> = ({ comment, close, className, iconClassName }) => {
  const { t } = useAppContext();
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const closeTimeout = useRef<number>();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      window.clearTimeout(closeTimeout.current);
    };
  }, []);

  const copyLink = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const url = buildCommentShareUrl(comment.id, window.location.href);
    // The menu renders inside the comments iframe, which holds focus and the
    // click's user activation, so write through that frame's clipboard
    const frameWindow = event.currentTarget.ownerDocument.defaultView || window;

    let copied = false;
    try {
      await frameWindow.navigator.clipboard.writeText(url);
      copied = true;
    } catch (e) {
      console.error('[Comments] Failed to copy comment link:', e); // eslint-disable-line no-console
    }

    // The menu may have closed while the clipboard write was pending; a
    // late timer would otherwise close it again after it's reopened
    if (!isMounted.current) {
      return;
    }

    setStatus(copied ? 'copied' : 'failed');
    window.clearTimeout(closeTimeout.current);
    closeTimeout.current = window.setTimeout(close, CLOSE_DELAY_MS);
  };

  let label = t('Copy link');
  if (status === 'copied') {
    label = t('Link copied');
  } else if (status === 'failed') {
    label = t('Could not copy link');
  }

  return (
    <button className={className} data-testid="copy-link-button" type="button" onClick={copyLink}>
      {status === 'copied' ? (
        <CheckIcon
          aria-hidden="true"
          className={`${iconClassName} text-green-600 dark:text-green-500`}
        />
      ) : (
        <LinkIcon aria-hidden="true" className={iconClassName} />
      )}
      <span aria-live="polite">{label}</span>
    </button>
  );
};

export default CopyLinkButton;

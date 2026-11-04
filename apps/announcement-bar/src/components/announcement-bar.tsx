import './announcement-bar.css';
import { CloseIcon } from '../icons/close-icon';
import { useEffect, useState } from 'preact/hooks';
import type { AnnouncementSettings } from '../utils/api';

type AnnouncementBarProps = {
  settings?: AnnouncementSettings;
};

export function AnnouncementBar({ settings = {} }: AnnouncementBarProps) {
  const [visible, setVisible] = useState(() => shouldShowBar(settings.announcement));

  useEffect(() => {
    if (!settings.announcement) {
      return;
    }

    if (shouldShowBar(settings.announcement)) {
      setVisible(true);
    }
  }, [settings.announcement]);

  const handleButtonClick = () => {
    setVisible(false);
    setBarVisibility(false);
  };

  if (!visible) {
    return null;
  }

  if (!settings.announcement) {
    return null;
  }

  const className = 'gh-announcement-bar ' + settings.announcement_background;
  return (
    <div className={className}>
      <div
        dangerouslySetInnerHTML={{ __html: settings.announcement }}
        className="gh-announcement-bar-content"
      ></div>
      <button aria-label="close" type="button" onClick={handleButtonClick}>
        <CloseIcon />
      </button>
    </div>
  );
}

const BAR_VISIBILITY_STORAGE_KEY = 'isAnnouncementBarVisible';
const BAR_CONTENT_STORAGE_KEY = 'announcementBarContent';

function shouldShowBar(content: string | undefined) {
  if (content && isContentChanged(content)) {
    setBarVisibility(true);
    setContent(content);

    return true;
  }

  const isBarVisible = getBarVisibility();
  return !!isBarVisible;
}

// Storage can throw when the visitor's browser blocks site data, so treat it as empty
// rather than letting it stop the bar from rendering; dismissals then last until reload
function readStorage(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
    }
  } catch {
    // Nothing to persist to
  }
}

function setContent(content: string) {
  writeStorage(BAR_CONTENT_STORAGE_KEY, content);
}

function isContentChanged(content: string) {
  const prevContent = readStorage(BAR_CONTENT_STORAGE_KEY);

  return content !== prevContent;
}

function setBarVisibility(state: boolean) {
  writeStorage(BAR_VISIBILITY_STORAGE_KEY, state ? String(state) : null);
}

function getBarVisibility() {
  return readStorage(BAR_VISIBILITY_STORAGE_KEY);
}

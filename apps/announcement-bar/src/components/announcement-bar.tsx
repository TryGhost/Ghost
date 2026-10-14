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

function setContent(content: string) {
  sessionStorage.setItem(BAR_CONTENT_STORAGE_KEY, content);
}

function isContentChanged(content: string) {
  const prevContent = sessionStorage.getItem(BAR_CONTENT_STORAGE_KEY);

  return content !== prevContent;
}

function setBarVisibility(state: boolean) {
  if (state) {
    sessionStorage.setItem(BAR_VISIBILITY_STORAGE_KEY, String(state));
  } else {
    sessionStorage.removeItem(BAR_VISIBILITY_STORAGE_KEY);
  }
}

function getBarVisibility() {
  return sessionStorage.getItem(BAR_VISIBILITY_STORAGE_KEY);
}

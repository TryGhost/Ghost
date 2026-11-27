import { App } from './app';
import { render } from 'preact';
import type { AnnouncementSettings } from './utils/api';

const ROOT_DIV_ID = 'announcement-bar-root';

type SiteData = {
  apiUrl?: string;
  previewData?: AnnouncementSettings | null;
};

function addRootDiv() {
  if (document.getElementById(ROOT_DIV_ID)) {
    return;
  }

  const elem = document.createElement('div');
  elem.id = ROOT_DIV_ID;
  document.body.prepend(elem);
}

function getSiteData(): SiteData {
  const scriptTag = document.querySelector<HTMLElement>('script[data-announcement-bar]');
  if (scriptTag) {
    const apiUrl = scriptTag.dataset.apiUrl;
    return { apiUrl, previewData: getPreviewData(scriptTag) };
  }
  return {};
}

function getPreviewData(scriptTag: HTMLElement): AnnouncementSettings | null {
  if (scriptTag.dataset.preview) {
    const announcement = scriptTag.dataset.announcement;
    const announcementBackground = scriptTag.dataset.announcementBackground;

    return { announcement, announcement_background: announcementBackground };
  }

  return null;
}

function setup() {
  addRootDiv();
}

function init() {
  const { apiUrl, previewData } = getSiteData();
  setup();
  const root = document.getElementById(ROOT_DIV_ID)!;
  // Preact's render() keeps existing children, so clear anything a theme left in the root
  root.replaceChildren();
  render(<App apiUrl={apiUrl} previewData={previewData} />, root);
}

init();

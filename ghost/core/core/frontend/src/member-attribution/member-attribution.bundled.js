"use strict";
(() => {
  // core/frontend/src/utils/url-attribution.js
  function parseReferrer(url) {
    const currentUrl = new URL(url || window.location.href);
    const refParam = currentUrl.searchParams.get("ref");
    const sourceParam = currentUrl.searchParams.get("source");
    const utmSourceParam = currentUrl.searchParams.get("utm_source");
    const utmMediumParam = currentUrl.searchParams.get("utm_medium");
    const referrerSource = refParam || sourceParam || utmSourceParam || null;
    if (!referrerSource && currentUrl.hash && currentUrl.hash.includes("#/portal")) {
      return parsePortalHash(currentUrl);
    }
    return {
      source: referrerSource,
      medium: utmMediumParam || null,
      url: window.document.referrer || null
    };
  }
  function parsePortalHash(url) {
    const hashUrl = new URL(url.href.replace("/#/portal", ""));
    const refParam = hashUrl.searchParams.get("ref");
    const sourceParam = hashUrl.searchParams.get("source");
    const utmSourceParam = hashUrl.searchParams.get("utm_source");
    const utmMediumParam = hashUrl.searchParams.get("utm_medium");
    return {
      source: refParam || sourceParam || utmSourceParam || null,
      medium: utmMediumParam || null,
      url: window.document.referrer || null
    };
  }

  // core/frontend/src/member-attribution/member-attribution.js
  var STORAGE_KEY = "ghost-history";
  var TIMEOUT = 24 * 60 * 60 * 1e3;
  var LIMIT = 15;
  (async function() {
    try {
      const storage = window.localStorage;
      const historyString = storage.getItem(STORAGE_KEY);
      const currentTime = (/* @__PURE__ */ new Date()).getTime();
      let history = [];
      if (historyString) {
        try {
          history = JSON.parse(historyString);
        } catch (error) {
          console.warn("[Member Attribution] Error while parsing history", error);
        }
      }
      const firstNotExpiredIndex = history.findIndex((item) => {
        if (!item.time || typeof item.time !== "number") {
          return false;
        }
        const difference = currentTime - item.time;
        if (isNaN(item.time) || difference > TIMEOUT) {
          return false;
        }
        return true;
      });
      if (firstNotExpiredIndex > 0) {
        history.splice(0, firstNotExpiredIndex);
      } else if (firstNotExpiredIndex === -1) {
        history = [];
      }
      let referrerData = {};
      try {
        referrerData = parseReferrer(window.location.href);
      } catch (e) {
        console.error("[Member Attribution] Parsing referrer failed", e);
      }
      const referrerSource = referrerData.source || null;
      const referrerMedium = referrerData.medium || null;
      const referrerUrl = referrerData.url || null;
      try {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        if (params.get("attribution_id") && params.get("attribution_type")) {
          history.push({
            time: currentTime,
            id: params.get("attribution_id"),
            type: params.get("attribution_type"),
            referrerSource,
            referrerMedium,
            referrerUrl
          });
          params.delete("attribution_id");
          params.delete("attribution_type");
          url.search = "?" + params.toString();
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
      } catch (error) {
        console.error("[Member Attribution] Parsing attribution from querystring failed", error);
      }
      const currentPath = window.location.pathname;
      if (history.length === 0 || history[history.length - 1].path !== currentPath) {
        history.push({
          path: currentPath,
          time: currentTime,
          referrerSource,
          referrerMedium,
          referrerUrl
        });
      } else if (history.length > 0) {
        history[history.length - 1].time = currentTime;
        if (referrerSource) {
          history[history.length - 1].referrerSource = referrerSource;
          history[history.length - 1].referrerMedium = referrerMedium;
        }
        if (referrerUrl) {
          history[history.length - 1].referrerUrl = referrerUrl;
        }
      }
      if (history.length > LIMIT) {
        history = history.slice(-LIMIT);
      }
      storage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("[Member Attribution] Failed with error", error);
    }
  })();
})();

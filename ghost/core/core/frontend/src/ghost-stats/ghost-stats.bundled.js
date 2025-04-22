"use strict";
(() => {
  // ../../node_modules/uuid/dist/esm-browser/rng.js
  var getRandomValues;
  var rnds8 = new Uint8Array(16);
  function rng() {
    if (!getRandomValues) {
      getRandomValues = typeof crypto !== "undefined" && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);
      if (!getRandomValues) {
        throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
      }
    }
    return getRandomValues(rnds8);
  }

  // ../../node_modules/uuid/dist/esm-browser/stringify.js
  var byteToHex = [];
  for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 256).toString(16).slice(1));
  }
  function unsafeStringify(arr, offset = 0) {
    return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
  }

  // ../../node_modules/uuid/dist/esm-browser/native.js
  var randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
  var native_default = {
    randomUUID
  };

  // ../../node_modules/uuid/dist/esm-browser/v4.js
  function v4(options, buf, offset) {
    if (native_default.randomUUID && !buf && !options) {
      return native_default.randomUUID();
    }
    options = options || {};
    const rnds = options.random || (options.rng || rng)();
    rnds[6] = rnds[6] & 15 | 64;
    rnds[8] = rnds[8] & 63 | 128;
    if (buf) {
      offset = offset || 0;
      for (let i = 0; i < 16; ++i) {
        buf[offset + i] = rnds[i];
      }
      return buf;
    }
    return unsafeStringify(rnds);
  }
  var v4_default = v4;

  // node_modules/@tryghost/timezone-data/es/timezone-data.js
  var timezoneData = [
    {
      name: "Pacific/Pago_Pago",
      label: "(GMT -11:00) Midway Island, Samoa"
    },
    {
      name: "Pacific/Honolulu",
      label: "(GMT -10:00) Hawaii"
    },
    {
      name: "America/Anchorage",
      label: "(GMT -9:00) Alaska"
    },
    {
      name: "America/Tijuana",
      label: "(GMT -8:00) Chihuahua, La Paz, Mazatlan"
    },
    {
      name: "America/Los_Angeles",
      label: "(GMT -8:00) Pacific Time (US & Canada); Tijuana"
    },
    {
      name: "America/Phoenix",
      label: "(GMT -7:00) Arizona"
    },
    {
      name: "America/Denver",
      label: "(GMT -7:00) Mountain Time (US & Canada)"
    },
    {
      name: "America/Costa_Rica",
      label: "(GMT -6:00) Central America"
    },
    {
      name: "America/Chicago",
      label: "(GMT -6:00) Central Time (US & Canada)"
    },
    {
      name: "America/Mexico_City",
      label: "(GMT -6:00) Guadalajara, Mexico City, Monterrey"
    },
    {
      name: "America/Regina",
      label: "(GMT -6:00) Saskatchewan"
    },
    {
      name: "America/Bogota",
      label: "(GMT -5:00) Bogota, Lima, Quito"
    },
    {
      name: "America/New_York",
      label: "(GMT -5:00) Eastern Time (US & Canada)"
    },
    {
      name: "America/Fort_Wayne",
      label: "(GMT -5:00) Indiana (East)"
    },
    {
      name: "America/Caracas",
      label: "(GMT -4:00) Caracas, La Paz"
    },
    {
      name: "America/Halifax",
      label: "(GMT -4:00) Atlantic Time (Canada); Greenland"
    },
    {
      name: "America/Santiago",
      label: "(GMT -4:00) Santiago"
    },
    {
      name: "America/St_Johns",
      label: "(GMT -3:30) Newfoundland"
    },
    {
      name: "America/Argentina/Buenos_Aires",
      label: "(GMT -3:00) Buenos Aires, Brasilia, Georgetown"
    },
    {
      name: "America/Noronha",
      label: "(GMT -2:00) Fernando de Noronha"
    },
    {
      name: "Atlantic/Azores",
      label: "(GMT -1:00) Azores"
    },
    {
      name: "Atlantic/Cape_Verde",
      label: "(GMT -1:00) Cape Verde Is."
    },
    {
      name: "Etc/UTC",
      label: "(GMT) UTC"
    },
    {
      name: "Africa/Casablanca",
      label: "(GMT +0:00) Casablanca, Monrovia"
    },
    {
      name: "Europe/Dublin",
      label: "(GMT +0:00) Dublin, Edinburgh, London"
    },
    {
      name: "Europe/Amsterdam",
      label: "(GMT +1:00) Amsterdam, Berlin, Rome, Stockholm, Vienna"
    },
    {
      name: "Europe/Prague",
      label: "(GMT +1:00) Belgrade, Bratislava, Budapest, Prague"
    },
    {
      name: "Europe/Paris",
      label: "(GMT +1:00) Brussels, Copenhagen, Madrid, Paris"
    },
    {
      name: "Europe/Warsaw",
      label: "(GMT +1:00) Sarajevo, Skopje, Warsaw, Zagreb"
    },
    {
      name: "Africa/Lagos",
      label: "(GMT +1:00) West Central Africa"
    },
    {
      name: "Europe/Athens",
      label: "(GMT +2:00) Athens, Beirut, Bucharest"
    },
    {
      name: "Africa/Cairo",
      label: "(GMT +2:00) Cairo, Egypt"
    },
    {
      name: "Africa/Maputo",
      label: "(GMT +2:00) Harare"
    },
    {
      name: "Europe/Kiev",
      // Changing name to 'Europe/Kiev', and keeping the UI with Kyiv. Change this once we are passed the moment lib update.
      label: "(GMT +2:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius"
    },
    {
      name: "Asia/Jerusalem",
      label: "(GMT +2:00) Jerusalem"
    },
    {
      name: "Africa/Johannesburg",
      label: "(GMT +2:00) Pretoria"
    },
    {
      name: "Asia/Baghdad",
      label: "(GMT +3:00) Baghdad"
    },
    {
      name: "Asia/Riyadh",
      label: "(GMT +3:00) Kuwait, Nairobi, Riyadh"
    },
    {
      name: "Europe/Istanbul",
      label: "(GMT +3:00) Istanbul, Ankara"
    },
    {
      name: "Europe/Moscow",
      label: "(GMT +3:00) Moscow, St. Petersburg, Volgograd"
    },
    {
      name: "Asia/Tehran",
      label: "(GMT +3:30) Tehran"
    },
    {
      name: "Asia/Dubai",
      label: "(GMT +4:00) Abu Dhabi, Muscat"
    },
    {
      name: "Asia/Baku",
      label: "(GMT +4:00) Baku, Tbilisi, Yerevan"
    },
    {
      name: "Asia/Kabul",
      label: "(GMT +4:30) Kabul"
    },
    {
      name: "Asia/Karachi",
      label: "(GMT +5:00) Islamabad, Karachi, Tashkent"
    },
    {
      name: "Asia/Yekaterinburg",
      label: "(GMT +5:00) Yekaterinburg"
    },
    {
      name: "Asia/Kolkata",
      label: "(GMT +5:30) Chennai, Calcutta, Mumbai, New Delhi"
    },
    {
      name: "Asia/Kathmandu",
      label: "(GMT +5:45) Katmandu"
    },
    {
      name: "Asia/Almaty",
      label: "(GMT +6:00) Almaty, Novosibirsk"
    },
    {
      name: "Asia/Dhaka",
      label: "(GMT +6:00) Astana, Dhaka, Sri Jayawardenepura"
    },
    {
      name: "Asia/Rangoon",
      label: "(GMT +6:30) Rangoon"
    },
    {
      name: "Asia/Bangkok",
      label: "(GMT +7:00) Bangkok, Hanoi, Jakarta"
    },
    {
      name: "Asia/Krasnoyarsk",
      label: "(GMT +7:00) Krasnoyarsk"
    },
    {
      name: "Asia/Hong_Kong",
      label: "(GMT +8:00) Beijing, Chongqing, Hong Kong, Urumqi"
    },
    {
      name: "Asia/Irkutsk",
      label: "(GMT +8:00) Irkutsk, Ulaan Bataar"
    },
    {
      name: "Asia/Singapore",
      label: "(GMT +8:00) Kuala Lumpur, Perth, Singapore, Taipei"
    },
    {
      name: "Asia/Tokyo",
      label: "(GMT +9:00) Osaka, Sapporo, Tokyo"
    },
    {
      name: "Asia/Seoul",
      label: "(GMT +9:00) Seoul"
    },
    {
      name: "Asia/Yakutsk",
      label: "(GMT +9:00) Yakutsk"
    },
    {
      name: "Australia/Adelaide",
      label: "(GMT +9:30) Adelaide"
    },
    {
      name: "Australia/Darwin",
      label: "(GMT +9:30) Darwin"
    },
    {
      name: "Australia/Brisbane",
      label: "(GMT +10:00) Brisbane, Guam, Port Moresby"
    },
    {
      name: "Australia/Sydney",
      label: "(GMT +10:00) Canberra, Hobart, Melbourne, Sydney, Vladivostok"
    },
    {
      name: "Asia/Magadan",
      label: "(GMT +11:00) Magadan, Soloman Is., New Caledonia"
    },
    {
      name: "Pacific/Auckland",
      label: "(GMT +12:00) Auckland, Wellington"
    },
    {
      name: "Pacific/Fiji",
      label: "(GMT +12:00) Fiji, Kamchatka, Marshall Is."
    },
    {
      name: "Pacific/Kwajalein",
      label: "(GMT +12:00) International Date Line West"
    }
  ];

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
  function getFinalReferrer(referrerData) {
    const { source, medium, url } = referrerData;
    const finalReferrer = source || medium || url || null;
    if (finalReferrer) {
      try {
        const referrerHost = new URL(finalReferrer).hostname;
        const currentHost = window.location.hostname;
        if (referrerHost === currentHost) {
          return null;
        }
      } catch (e) {
        return finalReferrer;
      }
    }
    return finalReferrer;
  }
  function getReferrer(url) {
    const referrerData = parseReferrer(url);
    return getFinalReferrer(referrerData);
  }

  // core/frontend/src/utils/session-storage.js
  function getSessionId(key, storage) {
    const serializedItem = storage.getItem(key);
    if (!serializedItem) {
      return null;
    }
    let item = null;
    try {
      item = JSON.parse(serializedItem);
    } catch (error) {
      return null;
    }
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const now = /* @__PURE__ */ new Date();
    if (now.getTime() > item.expiry) {
      storage.removeItem(key);
      return null;
    }
    return item.value;
  }
  function setSessionId(key, storage, ttlHours = 4) {
    const sessionId = getSessionId(key, storage) || v4_default();
    const now = /* @__PURE__ */ new Date();
    const item = {
      value: sessionId,
      expiry: now.getTime() + ttlHours * 3600 * 1e3
    };
    storage.setItem(key, JSON.stringify(item));
    return sessionId;
  }
  function getStorageObject(method) {
    return method === "localStorage" ? localStorage : sessionStorage;
  }

  // core/frontend/src/utils/privacy.js
  var SENSITIVE_ATTRIBUTES = [
    "username",
    "user",
    "user_id",
    "userid",
    "password",
    "pass",
    "pin",
    "passcode",
    "token",
    "api_token",
    "email",
    "address",
    "phone",
    "sex",
    "gender",
    "order",
    "order_id",
    "orderid",
    "payment",
    "credit_card"
  ];
  function maskSensitiveData(payload, attributesToMask = SENSITIVE_ATTRIBUTES) {
    let payloadStr = JSON.stringify(payload);
    attributesToMask.forEach((attr) => {
      payloadStr = payloadStr.replace(
        new RegExp(`("${attr}"):(".+?"|\\d+)`, "mgi"),
        '$1:"********"'
      );
    });
    return payloadStr;
  }
  function processPayload(payload, globalAttributes = {}, stringify = true) {
    if (stringify) {
      const maskedStr = maskSensitiveData(payload);
      const processed = Object.assign({}, JSON.parse(maskedStr), globalAttributes);
      return JSON.stringify(processed);
    } else {
      const processed = Object.assign({}, payload, globalAttributes);
      const maskedStr = maskSensitiveData(processed);
      return JSON.parse(maskedStr);
    }
  }

  // core/frontend/src/ghost-stats/ghost-stats.js
  (function() {
    const STORAGE_KEY = "session-id";
    const DEFAULT_DATASOURCE = "analytics_events";
    const storageMethods = {
      localStorage: "localStorage",
      sessionStorage: "sessionStorage"
    };
    let config = {
      host: null,
      token: null,
      domain: null,
      datasource: DEFAULT_DATASOURCE,
      storageMethod: storageMethods.localStorage,
      stringifyPayload: true,
      globalAttributes: {}
    };
    const isTestEnv = !!(typeof window !== "undefined" && (window.__nightmare || window.navigator.webdriver || window.Cypress));
    function _initConfig() {
      if (!document.currentScript) {
        return false;
      }
      config.host = document.currentScript.getAttribute("data-host");
      config.token = document.currentScript.getAttribute("data-token");
      config.domain = document.currentScript.getAttribute("data-domain");
      config.datasource = document.currentScript.getAttribute("data-datasource") || config.datasource;
      config.storageMethod = document.currentScript.getAttribute("data-storage") || config.storageMethod;
      config.stringifyPayload = document.currentScript.getAttribute("data-stringify-payload") !== "false";
      for (const attr of document.currentScript.attributes) {
        if (attr.name.startsWith("tb_")) {
          config.globalAttributes[attr.name.slice(3)] = attr.value;
        }
      }
      return !!(config.host && config.token);
    }
    async function _sendEvent(name, payload) {
      try {
        if (!config.host || !config.token) {
          throw new Error("Missing required configuration (host or token)");
        }
        setSessionId(STORAGE_KEY, getStorageObject(config.storageMethod));
        const url = `${config.host}?name=${config.datasource}&token=${config.token}`;
        const processedPayload = processPayload(payload, config.globalAttributes, config.stringifyPayload);
        const session_id = getSessionId(STORAGE_KEY, getStorageObject(config.storageMethod)) || v4_default();
        const data = {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          action: name,
          version: "1",
          session_id,
          payload: processedPayload
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5e3);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response;
      } catch (error) {
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
          console.error("Ghost Stats error:", error);
        }
        return null;
      }
    }
    function _getLocationInfo() {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const country = timezone ? timezoneData[timezone] : null;
        const locale = navigator.languages?.[0] || navigator.language || "en";
        return { country, locale };
      } catch (error) {
        return { country: null, locale: "en" };
      }
    }
    function _trackPageHit() {
      if (isTestEnv) {
        return;
      }
      const { country, locale } = _getLocationInfo();
      setTimeout(() => {
        _sendEvent("page_hit", {
          "user-agent": window.navigator.userAgent,
          locale,
          location: country,
          referrer: getReferrer(),
          pathname: window.location.pathname,
          href: window.location.href
        });
      }, 300);
    }
    function _init() {
      if (isTestEnv) {
        return false;
      }
      const configInitialized = _initConfig();
      if (!configInitialized) {
        console.warn("Ghost Stats: Missing required configuration");
        return false;
      }
      window.Tinybird = {
        trackEvent: _sendEvent,
        _trackPageHit
      };
      window.addEventListener("hashchange", _trackPageHit);
      const originalPushState = window.history.pushState;
      if (originalPushState) {
        window.history.pushState = function() {
          originalPushState.apply(this, arguments);
          _trackPageHit();
        };
        window.addEventListener("popstate", _trackPageHit);
      }
      if (document.visibilityState !== "hidden") {
        _trackPageHit();
      } else {
        document.addEventListener("visibilitychange", function onVisibilityChange() {
          if (document.visibilityState === "visible") {
            _trackPageHit();
            document.removeEventListener("visibilitychange", onVisibilityChange);
          }
        });
      }
      return true;
    }
    _init();
  })();
})();

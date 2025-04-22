import { v4 as uuidv4 } from 'uuid';
import timezoneData from '@tryghost/timezone-data';
import { getReferrer } from '../utils/url-attribution';
import { getSessionId, setSessionId, getStorageObject } from '../utils/session-storage';
import { processPayload } from '../utils/privacy';

(function(){
    const STORAGE_KEY = 'session-id'
    let DATASOURCE = 'analytics_events'
    const storageMethods = {
      localStorage: 'localStorage',
      sessionStorage: 'sessionStorage',
    }
    let STORAGE_METHOD = storageMethods.localStorage
    let globalAttributes = {}
    let stringifyPayload = true

    let token, host, domain
    if (document.currentScript) {
      host = document.currentScript.getAttribute('data-host')
      token = document.currentScript.getAttribute('data-token')
      domain = document.currentScript.getAttribute('data-domain')
      DATASOURCE =
        document.currentScript.getAttribute('data-datasource') || DATASOURCE
      STORAGE_METHOD =
        document.currentScript.getAttribute('data-storage') || STORAGE_METHOD
      stringifyPayload = document.currentScript.getAttribute('data-stringify-payload') !== 'false'
      for (const attr of document.currentScript.attributes) {
        if (attr.name.startsWith('tb_')) {
          globalAttributes[attr.name.slice(3)] = attr.value
        }
      }
    }

    /**
     * Send event to endpoint
     *
     * @param  { string } name Event name
     * @param  { object } payload Event payload
     * @return { Promise<any> } request response
     */
    async function _sendEvent(name, payload) {
      // Set or update session ID
      setSessionId(STORAGE_KEY, getStorageObject(STORAGE_METHOD));
      const url = `${host}?name=${DATASOURCE}&token=${token}`

      // Process the payload, masking sensitive data
      const processedPayload = processPayload(payload, globalAttributes, stringifyPayload);
      const session_id = getSessionId(STORAGE_KEY, getStorageObject(STORAGE_METHOD)) || uuidv4();

      const request = new XMLHttpRequest()
      request.open('POST', url, true)
      request.setRequestHeader('Content-Type', 'application/json')
      request.send(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          action: name,
          version: '1',
          session_id,
          payload: processedPayload,
        })
      )
    }

    /**
     * Track page hit
     */
    function _trackPageHit() {
      // If test environment
      if (window.__nightmare || window.navigator.webdriver || window.Cypress)
        return

      let country, locale
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        country = timezoneData[timezone]
        locale =
          navigator.languages && navigator.languages.length
            ? navigator.languages[0]
            : navigator.userLanguage ||
              navigator.language ||
              navigator.browserLanguage ||
              'en'
      } catch (error) {
        // ignore error
      }

      // Wait a bit for SPA routers
      setTimeout(() => {
        _sendEvent('page_hit', {
          'user-agent': window.navigator.userAgent,
          locale,
          location: country,
          referrer: getReferrer(),
          pathname: window.location.pathname,
          href: window.location.href,
        })
      }, 300)
    }

    // Client
    window.Tinybird = { 
      trackEvent: _sendEvent,
      _trackPageHit: _trackPageHit
    }

    // Event listener
    window.addEventListener('hashchange', _trackPageHit)
    const his = window.history
    if (his.pushState) {
      const originalPushState = his['pushState']
      his.pushState = function () {
        originalPushState.apply(this, arguments)
        _trackPageHit()
      }
      window.addEventListener('popstate', _trackPageHit)
    }

    let lastPage
    function handleVisibilityChange() {
      if (!lastPage && document.visibilityState === 'visible') {
        _trackPageHit()
      }
    }

    if (document.visibilityState === 'prerender') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    } else {
      _trackPageHit()
    }
})(); 
// @ts-check
(function(){
    /** @type {string} */
    const STORAGE_KEY = 'session-id'
    /** @type {string} */
    let DATASOURCE = 'analytics_events'
    /** @type {Object.<string, string>} */
    const storageMethods = {
        cookie: 'cookie',
        localStorage: 'localStorage',
        sessionStorage: 'sessionStorage',
    }
    /** @type {string} */
    let STORAGE_METHOD = storageMethods.cookie
    /** @type {Object.<string, any>} */
    let globalAttributes = {}
    /** @type {boolean} */
    let stringifyPayload = true

    /** @type {string|undefined} */
    let proxy, token, host, domain
    if (document.currentScript) {
        host = document.currentScript.getAttribute('data-host')
        proxy = document.currentScript.getAttribute('data-proxy')
        token = document.currentScript.getAttribute('data-token')
        domain = document.currentScript.getAttribute('data-domain')
        DATASOURCE = document.currentScript.getAttribute('data-datasource') || DATASOURCE
        STORAGE_METHOD = document.currentScript.getAttribute('data-storage') || STORAGE_METHOD
        stringifyPayload = document.currentScript.getAttribute('data-stringify-payload') !== 'false'
        for (const attr of document.currentScript.attributes) {
            if (attr.name.startsWith('tb_')) {
                globalAttributes[attr.name.slice(3)] = attr.value
            }
        }
    }

    /**
     * Generate uuid to identify the session. Random, not data-derived
     * @returns {string}
     */
    function _uuidv4() {
        const template = '10000000-1000-4000-8000-100000000000'
        return template.replace(/[018]/g, c => {
            const random = crypto.getRandomValues(new Uint8Array(1))[0]
            return (parseInt(c) ^ (random & (15 >> (parseInt(c) / 4)))).toString(16)
        })
    }

    /**
     * Get session ID from cookie
     * @returns {string|null}
     */
    function _getSessionIdFromCookie() {
        /** @type {Object.<string, string>} */
        const cookie = {}
        document.cookie.split(';').forEach(function (el) {
            const [key, value] = el.split('=')
            cookie[key.trim()] = value
        })
        return cookie[STORAGE_KEY] || null
    }

    /**
     * Get session ID from storage
     * @returns {string|null}
     */
    function _getSessionId() {
        if ([storageMethods.localStorage, storageMethods.sessionStorage].includes(STORAGE_METHOD)) {
            const storage = STORAGE_METHOD === storageMethods.localStorage ? localStorage : sessionStorage
            const serializedItem = storage.getItem(STORAGE_KEY)

            if (!serializedItem) {
                return null
            }

            /** @type {{value: string, expiry: number} | null} */
            let item = null
            try {
                item = JSON.parse(serializedItem)
            } catch (error) {
                return null
            }

            if(typeof item !== 'object' || item === null) {
                return null
            }

            const now = new Date()
            if (now.getTime() > item.expiry) {
                storage.removeItem(STORAGE_KEY)
                return null
            }

            return item.value
        }

        return _getSessionIdFromCookie()
    }

    /**
     * Set session ID in cookie
     * @param {string} sessionId
     */
    function _setSessionIdFromCookie(sessionId) {
        let cookieValue = `${STORAGE_KEY}=${sessionId}; Max-Age=1800; path=/; secure`
        if (domain) {
            cookieValue += `; domain=${domain}`
        }
        document.cookie = cookieValue
    }

    /**
     * Set session ID in storage
     * @returns {boolean}
     */
    function _setSessionId() {
        const sessionId = _getSessionId() || _uuidv4()
        if ([storageMethods.localStorage, storageMethods.sessionStorage].includes(STORAGE_METHOD)) {
            const now = new Date()
            const item = {
                value: sessionId,
                expiry: now.getTime() + 1800 * 1000,
            }
            const value = JSON.stringify(item)
            const storage = STORAGE_METHOD === storageMethods.localStorage ? localStorage : sessionStorage
            storage.setItem(STORAGE_KEY, value)
            return true
        }
        _setSessionIdFromCookie(sessionId)
        return true
    }

    /**
     * Try to mask PPI and potential sensible attributes
     * @param {Object} payload
     * @returns {string}
     */
    const _maskSuspiciousAttributes = payload => {
        const attributesToMask = [
            'username', 'user', 'user_id', 'userid', 'password', 'pass', 'pin',
            'passcode', 'token', 'api_token', 'email', 'address', 'phone', 'sex',
            'gender', 'order', 'order_id', 'orderid', 'payment', 'credit_card'
        ]

        let _payload = JSON.stringify(payload)
        attributesToMask.forEach(attr => {
            _payload = _payload.replace(
                new RegExp(`("${attr}"):(".+?"|\\d+)`, 'mgi'),
                '$1:"********"'
            )
        })

        return _payload
    }

    /**
     * Send event to endpoint
     * @param {string} name
     * @param {Object} payload
     */
    async function _sendEvent(name, payload) {
        _setSessionId()
        
        let processedPayload
        if (stringifyPayload) {
            processedPayload = _maskSuspiciousAttributes(payload)
            processedPayload = Object.assign({}, JSON.parse(processedPayload), globalAttributes)
            processedPayload = JSON.stringify(processedPayload)
        } else {
            processedPayload = Object.assign({}, payload, globalAttributes)
            const maskedStr = _maskSuspiciousAttributes(processedPayload)
            processedPayload = JSON.parse(maskedStr)
        }
        
        const data = {
            timestamp: new Date().toISOString(),
            action: name,
            version: '1',
            session_id: _getSessionId() || _uuidv4(),
            payload: processedPayload,
        }

        console.log(`data`, data);

        const request = new XMLHttpRequest()
        request.open('POST', '/metrics', true)
        request.setRequestHeader('Content-Type', 'application/json')
        request.send(JSON.stringify(data))
    }

    /**
     * Track page hit
     */
    function _trackPageHit() {
        // @ts-ignore
        if (window.__nightmare || window.navigator.webdriver || window.Cypress) return

        let locale
        try {
            locale = navigator.languages && navigator.languages.length
                ? navigator.languages[0]
                : navigator.language || 'en'
        } catch (error) {
            // ignore error
        }

        setTimeout(() => {
            _sendEvent('page_hit', {
                'user-agent': window.navigator.userAgent,
                locale,
                referrer: document.referrer,
                pathname: window.location.pathname,
                href: window.location.href,
            })
        }, 300)
    }

    // Client
    // @ts-ignore
    window.Analytics = { track: _sendEvent }

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

    // @ts-ignore
    if (document.visibilityState === 'prerender') {
        document.addEventListener('visibilitychange', handleVisibilityChange)
    } else {
        _trackPageHit()
    }
})()
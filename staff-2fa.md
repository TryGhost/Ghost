# Ghost Staff Two-Factor Authentication (2FA) System

## Overview

Ghost implements a comprehensive two-factor authentication system for staff users that provides enhanced security through email-based verification codes. The system operates in two distinct modes:

1. **Device Verification Mode**: Triggered when a user signs in from a new device/location
2. **Mandatory 2FA Mode**: Enforced site-wide when the `require_email_mfa` setting is enabled

The system uses Time-based One-Time Passwords (TOTP) with 6-digit verification codes sent via email, providing a balance between security and usability.

## System Architecture

### Core Components

#### Backend Services
- **SessionService** ([`ghost/core/core/server/services/auth/session/session-service.js`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/session-service.js))
  - Manages session creation, verification, and TOTP generation
  - Handles device tracking and geolocation
  - Integrates with email service for code delivery

- **Session Middleware** ([`ghost/core/core/server/services/auth/session/middleware.js`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/middleware.js))
  - Express middleware for authentication flow
  - Manages session verification state
  - Handles login, logout, and code verification

#### Frontend Controllers
- **SigninController** ([`ghost/admin/app/controllers/signin.js`](https://github.com/TryGhost/Ghost/blob/main/ghost/admin/app/controllers/signin.js))
  - Handles initial login form and authentication
  - Redirects to verification flow when 2FA is required

- **SigninVerifyController** ([`ghost/admin/app/controllers/signin-verify.js`](https://github.com/TryGhost/Ghost/blob/main/ghost/admin/app/controllers/signin-verify.js))
  - Manages 6-digit code input and validation
  - Handles resend functionality with countdown timer
  - Provides user feedback for verification attempts

#### API Endpoints
```
POST   /ghost/api/admin/session           - Initial authentication
DELETE /ghost/api/admin/session           - Logout
POST   /ghost/api/admin/session/verify    - Resend verification code
PUT    /ghost/api/admin/session/verify    - Verify code and complete login
```

#### Database Schema
```sql
-- Sessions table stores verification state
sessions {
    id: string(24) PRIMARY KEY
    session_id: string(32) UNIQUE
    user_id: string(24)
    session_data: string(2000)  -- Contains verification status
    created_at: datetime
}

-- Users table (existing structure, no 2FA-specific fields)
users {
    id: string(24) PRIMARY KEY
    email: string(191) UNIQUE
    -- ... other user fields
}
```

### Settings Integration
- **`require_email_mfa`**: Boolean setting to enforce 2FA for all staff users
- **`admin_session_secret`**: Used as TOTP secret base combined with user ID

### Configuration Integration
- **`security.staffDeviceVerification`**: Boolean config flag to globally enable/disable device verification ([`defaults.json:17`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/shared/config/defaults.json#L17))
  - Default: `true` (device verification enabled)
  - When `false`: All device verification is bypassed regardless of other settings
  - Implemented in [`index.js:50-53`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/index.js#L50-L53)

## Authentication Flow

### Initial Login Process

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User enters   │    │   Backend        │    │   Session       │
│ credentials in  │───▶│ validates user   │───▶│ created with    │
│  signin form    │    │   and password   │    │ verified=false  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ 2FA required?   │    │  Generate TOTP   │    │   Send email    │
│ (new device or  │───▶│ code and send    │───▶│ with 6-digit    │
│  setting=true)  │    │   to user        │    │  verification   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 2FA Verification Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ User redirected │    │ SigninVerify     │    │   User enters   │
│   to verify     │───▶│ controller       │───▶│    6-digit      │
│     page        │    │   renders        │    │     code        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Session marked │    │   TOTP code      │    │ Code validated  │
│  as verified,   │◀───│   verified       │◀───│  against user   │
│  login complete │    │ successfully     │    │   + secret      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Decision Matrix

| Condition | Action |
|-----------|--------|
| `security.staffDeviceVerification = false` | Skip all 2FA verification (config override) |
| `require_email_mfa = true` | Always require 2FA verification |
| `require_email_mfa = false` + new device | Require 2FA verification |
| `require_email_mfa = false` + known device | Skip 2FA verification |

## Technical Implementation Details

### TOTP Configuration

[`session-service.js:11-16`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/session-service.js#L11-L16)

```javascript
const {totp} = require('otplib');
totp.options = {
    digits: 6,
    step: 60,        // 60-second time window
    window: [10, 10] // Allow ±10 steps (±10 minutes tolerance)
};
```

### Stateless TOTP Implementation

Ghost uses a **stateless TOTP approach** where verification codes are never stored in the database. This design provides security and scalability benefits.

#### Token Generation Process
```javascript
// https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/session-service.js#L156-L161
async function generateAuthCodeForUser(req, res) {
    const session = await getSession(req, res);
    const secret = getSettingsCache('admin_session_secret') + session.user_id;
    const token = totp.generate(secret);
    return token;
}
```

**Key Components:**
- **Secret**: Combination of `admin_session_secret` (site-wide) + `user_id` (user-specific)
- **Time Window**: Current time divided into 60-second intervals
- **Algorithm**: HMAC-SHA1 based TOTP standard (RFC 6238)

#### Token Verification Process

[`session-service.js:170-175`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/session-service.js#L170-L175)

```javascript
async function verifyAuthCodeForUser(req, res) {
    const session = await getSession(req, res);
    const secret = getSettingsCache('admin_session_secret') + session.user_id;
    const isValid = totp.check(req.body.token, secret);
    return isValid;
}
```

**Verification Steps:**
1. **Recreate Secret**: Uses same formula (`admin_session_secret + user_id`)
2. **Generate Expected Code**: `totp.check()` internally generates the expected code for current time
3. **Compare Codes**: Submitted code vs. expected code
4. **Time Tolerance**: Accepts codes from ±10 time windows (±10 minutes)

### No Persistent Code Storage

**Important**: No verification code details are stored anywhere in the system:

- ✅ **Session State**: Only `verified: true/false` status is stored
- ✅ **User ID**: Stored in session for secret generation
- ❌ **Generated Codes**: Never persisted to database
- ❌ **Code Timestamps**: Not tracked or stored
- ❌ **Used Codes**: No blacklist maintained

**Benefits of Stateless Design:**
1. **Security**: Codes can't be extracted from database
2. **Scalability**: Works across multiple server instances
3. **Simplicity**: No cleanup of expired codes needed
4. **Performance**: No database queries for code validation
5. **Natural Expiry**: Codes automatically become invalid based on time

### Session Management
Sessions maintain verification state through the `verified` property:
- `session.verified = undefined` - Unverified session
- `session.verified = true` - Verified session, user can access admin

**Config Override**: When `security.staffDeviceVerification = false`, sessions are automatically marked as verified during creation ([`session-service.js:131-133`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/session-service.js#L131-L133)).

### Device Detection

The system collects and processes device information during the authentication flow for security tracking and user notification purposes.

#### Data Collection Process

**Session Creation** ([`createSessionForUser` in session-service.js:117-134](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/session-service.js#L117-L134)):
```javascript
session.user_id = user.id;
session.origin = origin;           // Request origin (e.g., "https://admin.example.com")
session.user_agent = req.get('user-agent');  // Browser user agent string
session.ip = req.ip;              // Client IP address
```

**Raw Data Storage**: Device information is stored directly in the Express session:
- **Location**: Session store (database `sessions` table)
- **Format**: JSON serialized in `session_data` field
- **Retention**: Until session expires or user logs out

#### Data Processing for Email Notifications

- **User Agent Parsing** ([`getDeviceDetails` in session-service.js:222-236](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/session-service.js#L222-L236))
- **IP Geolocation** ([`getGeolocationFromIP` in session-service.js:192-219](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/session-service.js#L192-L219))
- **Timestamp Formatting** ([session-service.js:177-185](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/session-service.js#L177-L185))


#### Data Storage Locations

| Data Type | Storage Location | Format | Example |
|-----------|------------------|--------|---------|
| **Raw User Agent** | Session (`session_data`) | String | `"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"` |
| **IP Address** | Session (`session_data`) | String | `"192.168.1.100"` |
| **Origin** | Session (`session_data`) | String | `"https://admin.myblog.com"` |
| **Parsed Device** | Email only (not stored) | String | `"Chrome, macOS"` |
| **Geolocation** | Email only (not stored) | String | `"San Francisco, CA, United States"` |
| **Formatted Time** | Email only (not stored) | String | `"18 Aug 2025, 14:30 UTC"` |

#### Session Data Structure (`sessions.session_data`)

The `sessions.session_data` field stores a **JSON-serialized Express session object** with the following structure:

```json
{
  "cookie": {
    "originalMaxAge": 15552000000,
    "expires": "2025-02-16T14:30:00.000Z",
    "secure": true,
    "httpOnly": true,
    "path": "/ghost",
    "sameSite": "none"
  },
  "user_id": "507f1f77bcf86cd799439011",
  "origin": "https://admin.myblog.com",
  "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "ip": "192.168.1.100",
  "verified": true
}
```

**Session Properties Breakdown:**

| Property | Type | Purpose | Details |
|----------|------|---------|---------|
| **`cookie`** | Object | Express session cookie metadata | Expiration, security settings, path |
| **`user_id`** | String | Ghost user ID for authenticated user | Used in TOTP secret generation |
| **`origin`** | String | Request origin for CSRF protection | Validated on each request |
| **`user_agent`** | String | Browser user agent string | Raw string, parsed for emails only |
| **`ip`** | String | Client IP address | Used for geolocation in emails |
| **`verified`** | Boolean/undefined | 2FA verification status | `true`=verified, `undefined`=unverified |

**Storage Implementation** ([`SessionStore.js:30-36`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/SessionStore.js#L30-L36)):
```javascript
set(sid, sessionData, callback) {
    this.SessionModel
        .upsert({session_data: sessionData}, {session_id: sid})
        .then(() => callback(null))
        .catch(callback);
}
```

**Key Points:**
- **Size Limit**: Field is `string(2000)`, limiting session data to 2KB
- **Auto-serialization**: Express-session handles JSON serialization/deserialization
- **No Processing**: Raw data stored - parsed device info not persisted
- **Security**: CSRF protection via `origin` field validation

#### Security and Privacy Considerations

**Temporary Processing**: Geolocation and parsed device details are:
- ✅ Generated on-demand for email notifications
- ✅ Not persisted to database
- ✅ Processed with error handling (fallback to "Unknown")
- ✅ Rate-limited via external API timeout (500ms)

**Persistent Storage**: Only essential session data is stored:
- ✅ Raw user agent (for CSRF validation)
- ✅ IP address (for session security)
- ✅ Origin (for CSRF protection)
- ❌ Processed location data
- ❌ Parsed browser/OS details

**External Dependencies**:
- **Geolocation API**: `get.geojs.io` (with fallback to "Unknown")
- **User Agent Parser**: UAParser.js library (local processing)
- **Timeout Protection**: 500ms limit prevents hanging requests

### Email Template
Rich HTML email template includes:
- **6-digit verification code** prominently displayed
- **Device details**: Browser, OS, location, timestamp
- **Security messaging** explaining the verification
- **Site branding** with logo and styling

## Security Features

### CSRF Protection

[`session-service.js:84-98`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/session-service.js#L84-L98)

```javascript
function cookieCsrfProtection(req, session) {
    const origin = getOriginOfRequest(req);
    if (session.origin !== origin) {
        throw new BadRequestError({
            message: `Request made from incorrect origin.`
        });
    }
}
```

### Rate Limiting
- **Global blocking**: Prevents brute force attacks site-wide
- **User-specific limiting**: Limits attempts per user account
- **Verification limiting**: Controls resend frequency
- **Frontend countdown**: 15-second delay between resend attempts

### Code Validation
- **Format validation**: Must be exactly 6 digits
- **Time window**: 60-second generation window with ±10 minute tolerance
- **Single use**: Codes are effectively single-use due to time-based nature

## Frontend Implementation

### SignIn Form Flow
1. **Initial State**: Standard email/password form
2. **Authentication**: POST to `/ghost/api/admin/session`
3. **2FA Trigger**: Backend returns `2FA_TOKEN_REQUIRED` or `2FA_NEW_DEVICE_DETECTED`
4. **Redirect**: Frontend transitions to `signin-verify` route

### Verification Form ([`signin-verify.hbs`](https://github.com/TryGhost/Ghost/blob/main/ghost/admin/app/templates/signin-verify.hbs))
```handlebars
{{#if this.twoFactorRequired}}
    <h1>2FA confirmation</h1>
    <p>Enter the sign-in verification code sent to your email.</p>
{{else}}
    <h1>Verify it's really you</h1>
    <p>A 6-digit sign-in verification code has been sent to your email...</p>
{{/if}}

<input type="text" inputmode="numeric" pattern="[0-9]*"
       placeholder="• • • • • •" autocomplete="one-time-code">
```

### JavaScript Validation

[`signin-verify.js:34-38`](https://github.com/TryGhost/Ghost/blob/main/ghost/admin/app/controllers/signin-verify.js#L34-L38)

```javascript
if (!this.token?.trim().match(/^\d{6}$/)) {
    this.errors.add('token', 'Verification code must be 6 numbers');
    return false;
}
```

## Error Handling

### Backend Error Codes
- `2FA_TOKEN_REQUIRED`: Mandatory 2FA enabled
- `2FA_NEW_DEVICE_DETECTED`: New device verification required
- `401 Unauthorized`: Invalid verification code

### Frontend Error Messages
- **Invalid Code**: "Your verification code is incorrect."
- **Empty Code**: "Verification code is required"
- **Invalid Format**: "Verification code must be 6 numbers"
- **Network Error**: "There was a problem verifying the code. Please try again."

### Resend Functionality
- **Cooldown Period**: 15-second countdown between resends
- **Success Feedback**: "Sent" button state during cooldown
- **Error Handling**: Network and validation error display

## Configuration Options

### Site Settings
```javascript
// Enable mandatory 2FA for all staff users
require_email_mfa: true/false
```

### Configuration Settings
```javascript
// Global config flag to disable all device verification
security: {
    staffDeviceVerification: true/false  // Default: true
}
```

## Testing

### E2E Browser Tests

[`two-factor-auth.spec.js`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/test/e2e-browser/admin/two-factor-auth.spec.js)

```javascript
test('Authenticating with 2FA token works', async ({page, verificationToken}) => {
    await adminLoginPage.signIn(email, password);
    await adminLoginPage.verifyTwoFactorToken(await verificationToken.getToken());
    // Assert successful login
});
```

### Unit Tests
- **Session Service**: [`session-service.test.js`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/test/unit/server/services/auth/session/session-service.test.js) - Token generation and validation
- **Session Middleware**: [`middleware.test.js`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/test/unit/server/services/auth/session/middleware.test.js) - Authentication flow and error handling
- **Session Model**: [`session.test.js`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/test/unit/server/models/session.test.js) - Database session management
- **API Session**: [`session.test.js`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/test/unit/api/canary/session.test.js) - API endpoint testing
- **Frontend SignIn**: [`signin-test.js`](https://github.com/TryGhost/Ghost/blob/main/ghost/admin/tests/acceptance/signin-test.js) - Form validation and UI integration

## Monitoring and Observability

### Error Handling and Logging

Ghost's 2FA system has minimal explicit logging. Monitoring happens through error handling and rate limiting.

#### Error Tracking Locations

- **Email Delivery Failures**: [`session-service.js:283-288`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/session-service.js#L283-L288) - Throws `EmailError` for SMTP failures
- **Frontend Error Logging**: [`signin.js:99`](https://github.com/TryGhost/Ghost/blob/main/ghost/admin/app/controllers/signin.js#L99) - Uses `console.error()` plus user notifications
- **CSRF Protection Errors**: [`session-service.js:94-98`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/session-service.js#L94-L98) - Throws `BadRequestError` for origin mismatches

### Rate Limiting and Abuse Prevention

Rate limiting implementation for 2FA endpoints:

- **Brute Force Protection**: [`brute.js:56-73`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/web/shared/middleware/brute.js#L56-L73) - Defines `sendVerificationCode()` and `userVerification()` middleware
- **Rate Limiting Configuration**: [`spam-prevention.js:32-33`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/web/shared/middleware/api/spam-prevention.js#L32-L33) - Configures limits via `spamSendVerificationCode` and `spamUserVerification`
- **Route Application**: [`routes.js:279-281`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/web/api/endpoints/admin/routes.js#L279-L281) - Applies middleware to `/session/verify` endpoints

### What Gets Monitored

| Event Type | Location | Details |
|------------|----------|---------|
| **Email Send Failures** | [`session-service.js:283-288`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/session-service.js#L283-L288) | Throws `EmailError` for SMTP failures |
| **Invalid Origins** | [`session-service.js:94-98`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/session-service.js#L94-L98) | Throws `BadRequestError` for CSRF attempts |
| **Rate Limit Hits** | [`brute.js:56-73`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/web/shared/middleware/brute.js#L56-L73) | Automatic blocking via brute-knex |
| **Frontend Errors** | [`signin.js:99`](https://github.com/TryGhost/Ghost/blob/main/ghost/admin/app/controllers/signin.js#L99) | `console.error()` + user notifications |
| **Verification Failures** | [`middleware.js:78-80`](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/services/auth/session/middleware.js#L78-L80) | Returns 401 status code |

### Monitoring Limitations

Ghost does not include built-in metrics collection for 2FA events. Available monitoring points:

- **Error Types**: `EmailError`, `BadRequestError`, `NoPermissionError` thrown for external systems
- **HTTP Status Codes**: Standard responses (200, 401, 429, 500) for monitoring
- **Rate Limit Data**: Brute-knex stores attempt counts in database

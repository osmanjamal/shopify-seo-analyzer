# API Authentication

## Overview

The SEO Analyzer API uses JWT (JSON Web Tokens) for authentication. All API requests (except public endpoints) require a valid authentication token.

## Authentication Methods

### 1. Email/Password Authentication

#### Register New User

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "subscription": "free",
    "emailVerified": false
  }
}
```

**Password Requirements:**
- Minimum 8 characters (10 for production)
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "subscription": "professional",
    "emailVerified": true
  }
}
```

### 2. Google OAuth Authentication

#### Initiate OAuth Flow

```http
GET /api/auth/google
```

This will redirect to Google's OAuth consent page. After authorization, the user will be redirected back to:

```
https://seoanalyzer.app/api/auth/google/callback?code=AUTHORIZATION_CODE
```

The callback will return:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Jane Smith",
    "email": "jane@gmail.com",
    "googleId": "1234567890",
    "profilePicture": "https://lh3.googleusercontent.com/...",
    "emailVerified": true
  }
}
```

### 3. API Key Authentication

For programmatic access, users can generate API keys from their dashboard.

```http
GET /api/data
X-API-Key: sk_live_abcdef123456789
```

#### Generate API Key

```http
POST /api/auth/api-keys
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Production Server",
  "scopes": ["read:analytics", "read:keywords", "write:keywords"]
}
```

**Response:**
```json
{
  "id": "key_123456",
  "name": "Production Server",
  "key": "sk_live_abcdef123456789",
  "scopes": ["read:analytics", "read:keywords", "write:keywords"],
  "createdAt": "2024-01-20T10:00:00Z",
  "lastUsedAt": null
}
```

**Note:** The API key is only shown once. Store it securely.

## Using Authentication Tokens

### Bearer Token

Include the JWT token in the Authorization header:

```http
GET /api/websites
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Structure

The JWT token contains:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "email": "john@example.com",
  "role": "user",
  "subscription": "professional",
  "iat": 1705750000,
  "exp": 1705836400
}
```

### Token Expiration

- **Access Token:** 24 hours (production), 7 days (development)
- **Refresh Token:** 7 days (production), 30 days (development)

## Refreshing Tokens

When your access token expires, use the refresh token to get a new one:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Password Management

### Reset Password Request

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "message": "Password reset email sent"
}
```

### Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "RESET_TOKEN_FROM_EMAIL",
  "password": "NewSecurePassword123!"
}
```

### Change Password

```http
PUT /api/auth/change-password
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword123!"
}
```

## Two-Factor Authentication (2FA)

### Enable 2FA

```http
POST /api/auth/2fa/enable
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "backupCodes": [
    "a1b2c3d4e5",
    "f6g7h8i9j0",
    "k1l2m3n4o5"
  ]
}
```

### Verify 2FA Setup

```http
POST /api/auth/2fa/verify
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "token": "123456"
}
```

### Login with 2FA

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "twoFactorToken": "123456"
}
```

## Rate Limiting

Authentication endpoints have specific rate limits:

- **Login:** 5 attempts per 15 minutes
- **Register:** 3 attempts per hour
- **Password Reset:** 3 attempts per hour
- **Token Refresh:** 10 attempts per hour

Exceeded limits return:
```json
{
  "error": "TOO_MANY_REQUESTS",
  "message": "Too many attempts, please try again later",
  "retryAfter": 900
}
```

## Security Best Practices

1. **Store tokens securely**
   - Never store tokens in localStorage (XSS vulnerable)
   - Use httpOnly cookies or secure memory storage
   - Clear tokens on logout

2. **Token rotation**
   - Refresh tokens regularly
   - Implement token blacklisting for logout
   - Monitor for suspicious token usage

3. **HTTPS only**
   - All authentication endpoints require HTTPS
   - Tokens are invalid over HTTP connections

4. **IP validation**
   - Optional IP-based token validation
   - Configurable in security settings

## Error Responses

### Invalid Credentials
```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

### Invalid Token
```json
{
  "error": "INVALID_TOKEN",
  "message": "Invalid or expired token"
}
```

### Account Locked
```json
{
  "error": "ACCOUNT_LOCKED",
  "message": "Account temporarily locked due to multiple failed attempts",
  "lockedUntil": "2024-01-20T11:00:00Z"
}
```

### Email Not Verified
```json
{
  "error": "EMAIL_NOT_VERIFIED",
  "message": "Please verify your email address"
}
```

## Session Management

### Get Current Session

```http
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "subscription": "professional",
  "emailVerified": true,
  "twoFactorEnabled": false,
  "createdAt": "2024-01-01T00:00:00Z",
  "lastLoginAt": "2024-01-20T10:00:00Z"
}
```

### Logout

```http
POST /api/auth/logout
Authorization: Bearer YOUR_JWT_TOKEN
```

This will invalidate the current token and refresh token.

### List Active Sessions

```http
GET /api/auth/sessions
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "sess_123456",
      "device": "Chrome on MacOS",
      "ip": "192.168.1.1",
      "location": "New York, US",
      "lastActive": "2024-01-20T10:00:00Z",
      "current": true
    }
  ]
}
```

### Revoke Session

```http
DELETE /api/auth/sessions/sess_123456
Authorization: Bearer YOUR_JWT_TOKEN
```

## Email Verification

### Send Verification Email

```http
POST /api/auth/verify-email/send
Authorization: Bearer YOUR_JWT_TOKEN
```

### Verify Email

```http
GET /api/auth/verify-email?token=VERIFICATION_TOKEN
```

## Enterprise SSO

For enterprise customers, we support SAML 2.0 and OpenID Connect.

### SAML Configuration

```http
POST /api/auth/sso/saml/configure
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "metadataUrl": "https://identity.company.com/saml/metadata",
  "domain": "company.com"
}
```

### SSO Login

```http
GET /api/auth/sso/login?domain=company.com
```

This will redirect to your identity provider for authentication.
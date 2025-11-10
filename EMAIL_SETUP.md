# Email Service Configuration Guide

## Overview
The email service is used to send credentials and password reset emails to users automatically.

## Required Environment Variables

Add these variables to your `.env` file:

```env
# Email SMTP Configuration
EMAIL_HOST=smtp.gmail.com           # SMTP server hostname
EMAIL_PORT=587                       # SMTP port (587 for TLS, 465 for SSL)
EMAIL_USER=your-email@gmail.com     # Your email address
EMAIL_PASSWORD=your-app-password     # Your email password or app password
EMAIL_FROM=Car Tracker <your-email@gmail.com>  # Sender name and email

# Application Settings
APP_NAME=Car Tracker                 # Application name shown in emails
APP_URL=http://localhost:5173        # Frontend URL for login links
```

## Email Providers Setup

### 1. Gmail Setup (Recommended for Testing)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password:**
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Scroll down to "App passwords"
   - Select "Mail" and your device
   - Copy the 16-character password
   - Use this as `EMAIL_PASSWORD`

3. **Configure .env:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=Car Tracker <your-gmail@gmail.com>
```

### 2. SendGrid Setup (Recommended for Production)

1. Sign up at https://sendgrid.com
2. Create an API key
3. Configure:
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=Car Tracker <verified-sender@yourdomain.com>
```

### 3. AWS SES (Amazon Simple Email Service)

1. Set up AWS SES and verify your domain
2. Create SMTP credentials
3. Configure:
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your-ses-smtp-username
EMAIL_PASSWORD=your-ses-smtp-password
EMAIL_FROM=Car Tracker <verified@yourdomain.com>
```

### 4. Mailgun

1. Sign up at https://mailgun.com
2. Get SMTP credentials
3. Configure:
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-mailgun-domain.com
EMAIL_PASSWORD=your-mailgun-password
EMAIL_FROM=Car Tracker <noreply@your-mailgun-domain.com>
```

## Features

### 1. **Send Credentials Email**
Automatically sent when a new user is created with `sendCredentials: true`

**Includes:**
- Welcome message
- Username and password
- Login link
- Security reminder to change password

### 2. **Send Password Reset Email**
Automatically sent when admin resets a user's password with `sendEmail: true`

**Includes:**
- Password reset notification
- New username and password
- Login link
- Security warning

## Testing Email Configuration

### Test in Terminal:
```bash
cd car-tracker-backend
npm run dev
```

The service will log whether email is configured on startup.

### Test Email Functionality:
You can add this route temporarily to test:

```typescript
// In routes/auth.ts or a test route
import { testEmailConfiguration } from '../services/emailService';

router.get('/test-email', async (req, res) => {
  const isValid = await testEmailConfiguration();
  res.json({ emailConfigured: isValid });
});
```

## Security Best Practices

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use App Passwords** - Don't use your main email password
3. **Restrict SMTP access** - Use app-specific passwords when possible
4. **Monitor email logs** - Check for failed sends
5. **Rate limiting** - Consider implementing rate limits for email sending
6. **Verify email addresses** - In production, verify user emails before sending

## Troubleshooting

### Email not sending:
1. Check environment variables are loaded correctly
2. Verify SMTP credentials
3. Check firewall/network settings (port 587 or 465 must be open)
4. Review console logs for error messages
5. Test with Gmail first (easier to configure)

### Gmail "Less secure app access" error:
- Use App Password instead (2FA required)
- Don't enable "Less secure app access" (deprecated)

### Port issues:
- Port 587: TLS (recommended)
- Port 465: SSL
- Port 25: Usually blocked by ISPs

## Email Templates

The email templates are in Bosnian/Serbian language and include:
- Professional HTML formatting
- Responsive design
- Plain text fallback
- Branding (app name, colors)
- Security warnings

To customize templates, edit:
- `src/services/emailService.ts`
- `sendCredentialsEmail()` function
- `sendPasswordResetEmail()` function

## Graceful Degradation

If email is not configured:
- System logs credentials to console instead
- User creation/password reset still works
- No errors thrown to users
- Clear warning messages in logs

This allows development without email setup while maintaining production functionality.

## Production Checklist

- [ ] Email provider account created
- [ ] SMTP credentials configured in `.env`
- [ ] Domain verified (if required by provider)
- [ ] Sender email address verified
- [ ] Test email sent successfully
- [ ] Email logs monitored
- [ ] Rate limits configured (if needed)
- [ ] Backup email method considered

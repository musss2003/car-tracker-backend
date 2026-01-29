import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;
const APP_NAME = process.env.APP_NAME || 'Car Tracker';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// Create reusable transporter
const createTransporter = () => {
  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    console.warn('⚠️  Email credentials not configured. Email sending will be skipped.');
    return null;
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465, // true for 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });
};

/**
 * Send email with user credentials (new account)
 */
export const sendCredentialsEmail = async (
  email: string,
  username: string,
  password: string,
  name?: string
): Promise<void> => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`📧 [SKIPPED] Would send credentials email to ${email}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    return;
  }

  const mailOptions = {
    from: `"${APP_NAME}" <${EMAIL_FROM}>`,
    to: email,
    subject: `Dobrodošli u ${APP_NAME} - Vaši pristupni podaci`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
          .credentials { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #4F46E5; border-radius: 4px; }
          .credentials strong { color: #4F46E5; }
          .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${APP_NAME}</h1>
          </div>
          <div class="content">
            <h2>Dobrodošli${name ? ', ' + name : ''}!</h2>
            <p>Vaš korisnički nalog je uspješno kreiran. Ispod su vaši pristupni podaci za prijavu u sistem:</p>
            
            <div class="credentials">
              <p><strong>Korisničko ime:</strong> ${username}</p>
              <p><strong>Lozinka:</strong> ${password}</p>
            </div>

            <p><strong>⚠️ Važno:</strong> Molimo vas da promijenite lozinku nakon prve prijave iz sigurnosnih razloga.</p>

            <p style="text-align: center;">
              <a href="${APP_URL}/login" class="button">Prijavite se</a>
            </p>

            <p>Ako niste zatražili kreiranje naloga, molimo vas kontaktirajte administratora.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${APP_NAME}. Sva prava zadržana.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Dobrodošli u ${APP_NAME}!

Vaš korisnički nalog je uspješno kreiran.

Pristupni podaci:
Korisničko ime: ${username}
Lozinka: ${password}

⚠️ Važno: Molimo vas da promijenite lozinku nakon prve prijave iz sigurnosnih razloga.

Prijavite se na: ${APP_URL}/login

Ako niste zatražili kreiranje naloga, molimo vas kontaktirajte administratora.

© ${new Date().getFullYear()} ${APP_NAME}. Sva prava zadržana.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Credentials email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Error sending credentials email to ${email}:`, error);
    throw new Error('Failed to send credentials email');
  }
};

/**
 * Send email with password reset information
 */
export const sendPasswordResetEmail = async (
  email: string,
  username: string,
  newPassword: string,
  name?: string
): Promise<void> => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`📧 [SKIPPED] Would send password reset email to ${email}`);
    console.log(`   Username: ${username}`);
    console.log(`   New Password: ${newPassword}`);
    return;
  }

  const mailOptions = {
    from: `"${APP_NAME}" <${EMAIL_FROM}>`,
    to: email,
    subject: `${APP_NAME} - Resetovanje lozinke`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
          .credentials { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #DC2626; border-radius: 4px; }
          .credentials strong { color: #DC2626; }
          .button { display: inline-block; background-color: #DC2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          .warning { background-color: #FEF2F2; border: 1px solid #FEE2E2; padding: 15px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Resetovanje lozinke</h1>
          </div>
          <div class="content">
            <h2>Zdravo${name ? ', ' + name : ''}!</h2>
            <p>Vaša lozinka je resetovana od strane administratora sistema.</p>
            
            <div class="credentials">
              <p><strong>Korisničko ime:</strong> ${username}</p>
              <p><strong>Nova lozinka:</strong> ${newPassword}</p>
            </div>

            <div class="warning">
              <p><strong>⚠️ Sigurnosna preporuka:</strong></p>
              <p>Molimo vas da odmah promijenite ovu lozinku nakon prijave. Nikada ne dijelite vašu lozinku sa drugim osobama.</p>
            </div>

            <p style="text-align: center;">
              <a href="${APP_URL}/login" class="button">Prijavite se</a>
            </p>

            <p>Ako niste zatražili resetovanje lozinke, odmah kontaktirajte administratora sistema.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${APP_NAME}. Sva prava zadržana.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Resetovanje lozinke - ${APP_NAME}

Zdravo${name ? ', ' + name : ''}!

Vaša lozinka je resetovana od strane administratora sistema.

Novi pristupni podaci:
Korisničko ime: ${username}
Nova lozinka: ${newPassword}

⚠️ Sigurnosna preporuka:
Molimo vas da odmah promijenite ovu lozinku nakon prijave. Nikada ne dijelite vašu lozinku sa drugim osobama.

Prijavite se na: ${APP_URL}/login

Ako niste zatražili resetovanje lozinke, odmah kontaktirajte administratora sistema.

© ${new Date().getFullYear()} ${APP_NAME}. Sva prava zadržana.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Error sending password reset email to ${email}:`, error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Test email configuration
 */
export const testEmailConfiguration = async (): Promise<boolean> => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log('❌ Email not configured');
    return false;
  }

  try {
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration is invalid:', error);
    return false;
  }
};

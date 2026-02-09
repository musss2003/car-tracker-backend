let Sentry: typeof import('@sentry/node') | null = null;

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initializeSentry(): void {
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️  Sentry DSN not configured, skipping Sentry initialization');
    return;
  }

  // Lazy load Sentry to avoid blocking module initialization
  if (!Sentry) {
    try {
      Sentry = require('@sentry/node');
    } catch (error) {
      console.error('❌ Failed to load Sentry:', error);
      return;
    }
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Set tracesSampleRate to capture percentage of transactions for performance monitoring
    // Production: 0.1 = 10% of transactions
    // Development: 1.0 = 100% of transactions
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Remove password fields
      if (event.request?.data) {
        const data = event.request.data as any;
        if (typeof data === 'object') {
          delete data.password;
          delete data.currentPassword;
          delete data.newPassword;
        }
      }

      return event;
    },

    // Don't log errors in test environment
    enabled: process.env.NODE_ENV !== 'test',
  });

  console.log('✅ Sentry initialized for error tracking');
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (!Sentry) return;
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

/**
 * Capture message manually
 */
export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info'): void {
  if (!Sentry) return;
  Sentry.captureMessage(message, level);
}

/**
 * Add user context to Sentry
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
  role?: string;
})if (!Sentry) return;
  : void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });
}

/**
 * Clear user context
 */
exif (!Sentry) return;
  port function clearUserContext(): void {
  Sentry.setUser(null);
}

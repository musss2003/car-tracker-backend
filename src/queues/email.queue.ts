import { Queue, Worker, QueueEvents } from 'bullmq';
import { bullMQConnection } from '../config/redis';
import { sendCredentialsEmail, sendPasswordResetEmail } from '../services/emailService';

const isProd = process.env.NODE_ENV === 'production';

/**
 * ✅ Email queue configuration with security and performance optimizations
 */
export const emailQueue = new Queue('emails', {
  connection: bullMQConnection,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay, then 4s, 8s
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Remove after 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging
      age: 7 * 24 * 3600, // Remove after 7 days
    },
  },
});

/**
 * Email job types
 */
export enum EmailJobType {
  CREDENTIALS = 'credentials',
  PASSWORD_RESET = 'password-reset',
  WELCOME = 'welcome',
  NOTIFICATION = 'notification',
}

/**
 * Email job data interfaces
 */
export interface CredentialsEmailData {
  type: EmailJobType.CREDENTIALS;
  to: string;
  username: string;
  password: string;
  name?: string;
}

export interface PasswordResetEmailData {
  type: EmailJobType.PASSWORD_RESET;
  to: string;
  username: string;
  newPassword: string;
  name?: string;
}

export type EmailJobData = CredentialsEmailData | PasswordResetEmailData;

/**
 * ✅ Email worker with enhanced error handling and security
 */
const emailWorker = new Worker<EmailJobData>(
  'emails',
  async (job) => {
    const startTime = Date.now();
    const jobType = job.data.type;
    const recipient = job.data.to;
    
    // ✅ Sanitize logging (don't log sensitive data)
    console.log(`📧 Processing email job ${job.id} of type ${jobType} to ${recipient.replace(/(.{3}).*(@.*)/, '$1***$2')}`);

    try {
      // ✅ Validate job data before processing
      if (!job.data.to || !job.data.type) {
        throw new Error('Invalid email job data: missing required fields');
      }

      switch (jobType) {
        case EmailJobType.CREDENTIALS:
          await sendCredentialsEmail(
            job.data.to,
            job.data.username,
            job.data.password,
            job.data.name
          );
          break;

        case EmailJobType.PASSWORD_RESET:
          await sendPasswordResetEmail(
            job.data.to,
            job.data.username,
            job.data.newPassword,
            job.data.name
          );
          break;

        default:
          throw new Error(`Unknown email job type: ${(job.data as any).type}`);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Email job ${job.id} completed in ${duration}ms`);
      
      // ✅ Update job progress
      await job.updateProgress(100);
      
      return { success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // ✅ Security: Don't log sensitive data in production
      if (isProd) {
        console.error(`❌ Email job ${job.id} failed after ${duration}ms: ${errorMessage}`);
      } else {
        console.error(`❌ Email job ${job.id} failed:`, error);
      }
      
      // ✅ Track failed attempts
      if (job.attemptsMade >= 2) {
        console.warn(`⚠️  Email job ${job.id} failing repeatedly (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`);
      }
      
      throw error; // Rethrow to trigger retry
    }
  },
  {
    connection: bullMQConnection,
    concurrency: 3, // Reduced from 5 to prevent overload
    limiter: {
      max: 10, // Max 10 jobs per duration
      duration: 1000, // Per 1 second (prevent email provider rate limits)
    },
    // ✅ Increased lock duration to prevent timeout issues
    lockDuration: 60000, // 60 seconds (increased from 30s)
    // ✅ Add stalledInterval to detect stuck jobs
    stalledInterval: 60000, // Check for stalled jobs every 60s (increased from 30s)
  }
);

// ✅ Worker error handlers
emailWorker.on('error', (error) => {
  const errorMessage = error.message || String(error);
  
  // ✅ Suppress Redis timeout spam in production
  if (errorMessage.includes('Command timed out')) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  Email worker: Redis command timeout (retrying...)');
    }
    // Don't log in production - these are handled by BullMQ retry logic
    return;
  }
  
  console.error('❌ Email worker error:', errorMessage);
});

emailWorker.on('failed', (job, error) => {
  if (job) {
    console.error(`❌ Email job ${job.id} failed permanently after ${job.attemptsMade} attempts:`, error.message);
  }
});

emailWorker.on('stalled', (jobId) => {
  console.warn(`⚠️  Email job ${jobId} stalled - may be stuck or taking too long`);
});

/**
 * ✅ Queue events for monitoring with security considerations
 */
const queueEvents = new QueueEvents('emails', { connection: bullMQConnection });

queueEvents.on('completed', ({ jobId }) => {
  console.log(`✅ Email job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  // ✅ Don't log full error in production (may contain sensitive data)
  const sanitizedReason = isProd ? 'Email sending failed' : failedReason;
  console.error(`❌ Email job ${jobId} failed: ${sanitizedReason}`);
});

queueEvents.on('progress', ({ jobId, data }) => {
  if (!isProd) {
    console.log(`📊 Email job ${jobId} progress:`, data);
  }
});

queueEvents.on('stalled', ({ jobId }) => {
  console.warn(`⚠️  Email job ${jobId} detected as stalled`);
});

/**
 * ✅ Helper functions with validation
 */
export async function queueCredentialsEmail(
  to: string,
  username: string,
  password: string,
  name?: string
): Promise<void> {
  // ✅ Validate email format
  if (!to || !to.includes('@')) {
    throw new Error('Invalid email address');
  }
  
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  try {
    await emailQueue.add(
      EmailJobType.CREDENTIALS,
      {
        type: EmailJobType.CREDENTIALS,
        to,
        username,
        password,
        name,
      },
      {
        // ✅ Add job priority (higher priority = processed first)
        priority: 1,
        // ✅ Remove job data after completion for security
        removeOnComplete: {
          count: 10,
          age: 3600, // 1 hour
        },
      }
    );
    console.log(`📧 Credentials email queued for ${to}`);
  } catch (error) {
    console.error('❌ Failed to queue credentials email:', error);
    throw error;
  }
}

export async function queuePasswordResetEmail(
  to: string,
  username: string,
  newPassword: string,
  name?: string
): Promise<void> {
  // ✅ Validate email format
  if (!to || !to.includes('@')) {
    throw new Error('Invalid email address');
  }
  
  if (!username || !newPassword) {
    throw new Error('Username and new password are required');
  }

  try {
    await emailQueue.add(
      EmailJobType.PASSWORD_RESET,
      {
        type: EmailJobType.PASSWORD_RESET,
        to,
        username,
        newPassword,
        name,
      },
      {
        // ✅ High priority for password resets
        priority: 1,
        // ✅ Remove sensitive data quickly
        removeOnComplete: {
          count: 10,
          age: 3600, // 1 hour
        },
      }
    );
    console.log(`📧 Password reset email queued for ${to}`);
  } catch (error) {
    console.error('❌ Failed to queue password reset email:', error);
    throw error;
  }
}

/**
 * ✅ Get comprehensive queue statistics
 */
export async function getEmailQueueStats() {
  try {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
      emailQueue.getDelayedCount(),
      emailQueue.isPaused(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
      total: waiting + active + completed + failed + delayed,
      healthy: failed < 100, // Flag if too many failures
    };
  } catch (error) {
    console.error('❌ Failed to get email queue stats:', error);
    return {
      error: 'Failed to retrieve queue statistics',
      healthy: false,
    };
  }
}

/**
 * ✅ Pause email queue (for maintenance)
 */
export async function pauseEmailQueue(): Promise<void> {
  await emailQueue.pause();
  console.log('⏸️  Email queue paused');
}

/**
 * ✅ Resume email queue
 */
export async function resumeEmailQueue(): Promise<void> {
  await emailQueue.resume();
  console.log('▶️  Email queue resumed');
}

/**
 * ✅ Clean old jobs from queue
 */
export async function cleanEmailQueue(): Promise<void> {
  try {
    const grace = 24 * 3600 * 1000; // 24 hours
    await emailQueue.clean(grace, 1000, 'completed');
    await emailQueue.clean(7 * 24 * 3600 * 1000, 1000, 'failed'); // 7 days for failed
    console.log('✅ Email queue cleaned');
  } catch (error) {
    console.error('❌ Failed to clean email queue:', error);
  }
}

/**
 * ✅ Gracefully close queue and worker with timeout
 */
export async function closeEmailQueue(): Promise<void> {
  console.log('⏳ Closing email queue...');
  
  try {
    // Close worker first (stop processing new jobs)
    await Promise.race([
      emailWorker.close(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Worker close timeout')), 5000))
    ]);
    console.log('✅ Email worker closed');
    
    // Close queue
    await Promise.race([
      emailQueue.close(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Queue close timeout')), 5000))
    ]);
    console.log('✅ Email queue closed');
    
    // Close events
    await queueEvents.close();
    console.log('✅ Email queue events closed');
  } catch (error) {
    console.error('⚠️  Error during email queue shutdown:', (error as Error).message);
    // Force close if graceful shutdown fails
    try {
      await emailWorker.close();
      await emailQueue.close();
      await queueEvents.close();
      console.log('✅ Email queue force closed');
    } catch (forceError) {
      console.error('❌ Failed to force close email queue:', forceError);
    }
  }
}

export { emailWorker, queueEvents };

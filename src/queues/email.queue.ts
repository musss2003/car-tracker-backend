import { Queue, Worker, QueueEvents } from 'bullmq';
import redis from '../config/redis';
import { sendCredentialsEmail, sendPasswordResetEmail } from '../services/emailService';

/**
 * Email queue for background processing
 */
export const emailQueue = new Queue('emails', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Remove after 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging
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
 * Email worker - processes email jobs
 */
const emailWorker = new Worker<EmailJobData>(
  'emails',
  async (job) => {
    console.log(`📧 Processing email job ${job.id} of type ${job.data.type}`);

    try {
      switch (job.data.type) {
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

      console.log(`✅ Email job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`❌ Email job ${job.id} failed:`, error);
      throw error; // Rethrow to trigger retry
    }
  },
  {
    connection: redis,
    concurrency: 5, // Process up to 5 emails concurrently
    limiter: {
      max: 10, // Max 10 jobs per duration
      duration: 1000, // Per 1 second (prevent email provider rate limits)
    },
  }
);

/**
 * Queue events for monitoring
 */
const queueEvents = new QueueEvents('emails', { connection: redis });

queueEvents.on('completed', ({ jobId }) => {
  console.log(`✅ Email job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`❌ Email job ${jobId} failed: ${failedReason}`);
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`📊 Email job ${jobId} progress:`, data);
});

/**
 * Helper functions to add jobs to queue
 */
export async function queueCredentialsEmail(
  to: string,
  username: string,
  password: string,
  name?: string
): Promise<void> {
  await emailQueue.add(EmailJobType.CREDENTIALS, {
    type: EmailJobType.CREDENTIALS,
    to,
    username,
    password,
    name,
  });
}

export async function queuePasswordResetEmail(
  to: string,
  username: string,
  newPassword: string,
  name?: string
): Promise<void> {
  await emailQueue.add(EmailJobType.PASSWORD_RESET, {
    type: EmailJobType.PASSWORD_RESET,
    to,
    username,
    newPassword,
    name,
  });
}

/**
 * Get queue statistics
 */
export async function getEmailQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Gracefully close queue and worker
 */
export async function closeEmailQueue(): Promise<void> {
  await emailWorker.close();
  await emailQueue.close();
  await queueEvents.close();
  console.log('✅ Email queue closed');
}

export { emailWorker, queueEvents };

const cron = require('node-cron');
const Bull = require('bull');
const logger = require('./logger');

// Redis configuration for Bull queues
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0
};

// Create job queues
const queues = {
  analysis: new Bull('analysis-queue', { redis: redisConfig }),
  email: new Bull('email-queue', { redis: redisConfig }),
  report: new Bull('report-queue', { redis: redisConfig }),
  cleanup: new Bull('cleanup-queue', { redis: redisConfig })
};

// Scheduled tasks registry
const scheduledTasks = new Map();

// Schedule a cron job
const scheduleJob = (name, cronExpression, handler, options = {}) => {
  try {
    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // Cancel existing job if exists
    if (scheduledTasks.has(name)) {
      scheduledTasks.get(name).stop();
      logger.info(`Cancelled existing job: ${name}`);
    }

    // Create new scheduled task
    const task = cron.schedule(cronExpression, async () => {
      try {
        logger.info(`Running scheduled job: ${name}`);
        await handler();
        logger.info(`Completed scheduled job: ${name}`);
      } catch (error) {
        logger.error(`Error in scheduled job ${name}:`, error);
      }
    }, {
      scheduled: options.scheduled !== false,
      timezone: options.timezone || 'UTC'
    });

    // Store task reference
    scheduledTasks.set(name, task);
    
    logger.info(`Scheduled job: ${name} with expression: ${cronExpression}`);
    return task;

  } catch (error) {
    logger.error(`Failed to schedule job ${name}:`, error);
    throw error;
  }
};

// Cancel a scheduled job
const cancelJob = (name) => {
  if (scheduledTasks.has(name)) {
    scheduledTasks.get(name).stop();
    scheduledTasks.delete(name);
    logger.info(`Cancelled scheduled job: ${name}`);
    return true;
  }
  return false;
};

// List all scheduled jobs
const listJobs = () => {
  return Array.from(scheduledTasks.keys());
};

// Queue job processing
const processQueue = (queueName, handler, concurrency = 1) => {
  const queue = queues[queueName];
  
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }

  queue.process(concurrency, async (job) => {
    try {
      logger.info(`Processing ${queueName} job:`, { jobId: job.id, data: job.data });
      const result = await handler(job);
      logger.info(`Completed ${queueName} job:`, { jobId: job.id });
      return result;
    } catch (error) {
      logger.error(`Failed ${queueName} job:`, { jobId: job.id, error: error.message });
      throw error;
    }
  });
};

// Add job to queue
const addJob = async (queueName, data, options = {}) => {
  const queue = queues[queueName];
  
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }

  const defaultOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true,
    removeOnFail: false
  };

  const job = await queue.add(data, { ...defaultOptions, ...options });
  logger.info(`Added job to ${queueName} queue:`, { jobId: job.id });
  return job;
};

// Schedule recurring analysis job
const scheduleAnalysis = async (websiteId, schedule = '0 9 * * *') => {
  const jobName = `analysis-${websiteId}`;
  
  return scheduleJob(jobName, schedule, async () => {
    await addJob('analysis', {
      websiteId,
      type: 'full',
      scheduled: true
    });
  });
};

// Schedule daily reports
const scheduleDailyReports = () => {
  if (process.env.ENABLE_SCHEDULED_JOBS !== 'true') {
    logger.info('Scheduled jobs are disabled');
    return;
  }

  // Daily analysis
  scheduleJob('daily-analysis', process.env.DAILY_ANALYSIS_CRON || '0 9 * * *', async () => {
    const Website = require('../models/Website');
    const websites = await Website.findAll({
      where: { is_active: true },
      attributes: ['id']
    });

    for (const website of websites) {
      await addJob('analysis', {
        websiteId: website.id,
        type: 'daily',
        scheduled: true
      });
    }
  });

  // Weekly reports
  scheduleJob('weekly-reports', process.env.WEEKLY_REPORT_CRON || '0 10 * * 1', async () => {
    const User = require('../models/User');
    const Settings = require('../models/Settings');
    
    const users = await User.findAll({
      where: { is_active: true },
      include: [{
        model: Settings,
        as: 'settings',
        where: { weekly_report: true }
      }]
    });

    for (const user of users) {
      await addJob('report', {
        userId: user.id,
        type: 'weekly',
        email: user.email
      });
    }
  });

  // Database cleanup (daily at 2 AM)
  scheduleJob('database-cleanup', '0 2 * * *', async () => {
    await addJob('cleanup', {
      type: 'old-data',
      daysToKeep: 90
    });
  });

  // Cache cleanup (every 6 hours)
  scheduleJob('cache-cleanup', '0 */6 * * *', async () => {
    await addJob('cleanup', {
      type: 'cache',
      pattern: 'temp:*'
    });
  });
};

// Get queue statistics
const getQueueStats = async (queueName) => {
  const queue = queues[queueName];
  
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount()
  ]);

  return {
    name: queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed
  };
};

// Get all queues statistics
const getAllQueuesStats = async () => {
  const stats = {};
  
  for (const queueName of Object.keys(queues)) {
    stats[queueName] = await getQueueStats(queueName);
  }
  
  return stats;
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down scheduler...');
  
  // Stop all cron jobs
  for (const [name, task] of scheduledTasks) {
    task.stop();
    logger.info(`Stopped scheduled job: ${name}`);
  }
  
  // Close all queues
  for (const [name, queue] of Object.entries(queues)) {
    await queue.close();
    logger.info(`Closed queue: ${name}`);
  }
  
  logger.info('Scheduler shutdown complete');
};

module.exports = {
  scheduleJob,
  cancelJob,
  listJobs,
  processQueue,
  addJob,
  scheduleAnalysis,
  scheduleDailyReports,
  getQueueStats,
  getAllQueuesStats,
  shutdown,
  queues
};
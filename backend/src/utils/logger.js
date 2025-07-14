const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Tell winston about our colors
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Define transports
const transports = [];

// Console transport (always active)
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? format : consoleFormat,
    level: process.env.LOG_LEVEL || 'debug'
  })
);

// File transports (only in production)
if (process.env.NODE_ENV === 'production') {
  // Error log file
  transports.push(
    new DailyRotateFile({
      filename: path.join('logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format
    })
  );

  // Combined log file
  transports.push(
    new DailyRotateFile({
      filename: path.join('logs', 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false
});

// Create a stream object for Morgan
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Export logger functions
module.exports = {
  error: (message, meta) => logger.error(message, meta),  // سطر 101
  warn: (message, meta) => logger.warn(message, meta),    // سطر 102
  info: (message, meta) => logger.info(message, meta),    // سطر 103
  http: (message, meta) => logger.http(message, meta),    // سطر 104 - مشكلة
  debug: (message, meta) => logger.debug(message, meta),  // سطر 105 - مشكلة
  stream: logger.stream                                    // سطر 106-108
};

const sanitizeLogContent = (content) => {
  if (typeof content !== 'string') {
    return content;
  }
  
  // إزالة أحرف التحكم ومحاولات حقن السطور الجديدة
  return content
    .replace(/[\r\n\x00-\x1F\x7F]/g, '') // إزالة جميع أحرف التحكم
    .replace(/\t/g, ' ') // استبدال tabs بمسافات
    .trim();
};

// دالة لإخفاء المعلومات الحساسة
const sanitizeSensitiveData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = [
    'password', 'token', 'apiKey', 'secret', 'authorization',
    'credit_card', 'ssn', 'api_key', 'private_key', 'session_id',
    'access_token', 'refresh_token', 'jwt', 'cookie'
  ];
  
  const sanitized = { ...data };
  
  const sanitizeObject = (obj) => {
    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // تحقق من الحقول الحساسة
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      } else if (typeof obj[key] === 'string') {
        // تنظيف النصوص من محاولات الحقن
        obj[key] = sanitizeLogContent(obj[key]);
      }
    });
  };
  
  sanitizeObject(sanitized);
  return sanitized;
};

// تحديث الصادرات مع التنظيف
module.exports = {
  error: (message, meta) => {
    const sanitizedMessage = sanitizeLogContent(message);
    const sanitizedMeta = sanitizeSensitiveData(meta);
    logger.error(sanitizedMessage, sanitizedMeta);
  },
  
  warn: (message, meta) => {
    const sanitizedMessage = sanitizeLogContent(message);
    const sanitizedMeta = sanitizeSensitiveData(meta);
    logger.warn(sanitizedMessage, sanitizedMeta);
  },
  
  info: (message, meta) => {
    const sanitizedMessage = sanitizeLogContent(message);
    const sanitizedMeta = sanitizeSensitiveData(meta);
    logger.info(sanitizedMessage, sanitizedMeta);
  },
  
  http: (message, meta) => {
    const sanitizedMessage = sanitizeLogContent(message);
    const sanitizedMeta = sanitizeSensitiveData(meta);
    logger.http(sanitizedMessage, sanitizedMeta);
  },
  
  debug: (message, meta) => {
    const sanitizedMessage = sanitizeLogContent(message);
    const sanitizedMeta = sanitizeSensitiveData(meta);
    logger.debug(sanitizedMessage, sanitizedMeta);
  },
  
  stream: logger.stream
};

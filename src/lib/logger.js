import winston from 'winston'

const { combine, timestamp, printf, colorize, errors } = winston.format

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  if (stack) {
    return `${timestamp} [${level}]: ${message}\n${stack}`
  }
  return `${timestamp} [${level}]: ${message}`
})

// Development logger - colorized console output
const developmentLogger = winston.createLogger({
  level: 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize(),
    consoleFormat
  ),
  transports: [
    new winston.transports.Console()
  ]
})

// Production logger - JSON format with file outputs
const productionLogger = winston.createLogger({
  level: 'info',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    winston.format.json()
  ),
  transports: [
    // Error logs - separate file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined logs - all levels
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
})

// Add console in production for critical errors
if (process.env.NODE_ENV === 'production') {
  productionLogger.add(new winston.transports.Console({
    level: 'error',
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    )
  }))
}

// Export the appropriate logger based on environment
const logger = process.env.NODE_ENV === 'production'
  ? productionLogger
  : developmentLogger

export default logger

// ==========================
// KAIRA - REQUEST LOGGER
// Enhanced with log levels, rotation, and structured logging
// ==========================

const fs = require('fs');
const path = require('path');
const os = require('os');

// ==========================
// CONFIGURATION
// ==========================
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
};

// Set log level from environment or default to INFO
const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL 
    ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] 
    : LOG_LEVELS.INFO;

const LOG_DIR = path.join(__dirname, '../logs');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 10; // Keep last 10 log files

// ==========================
// INITIALIZE LOG DIRECTORY
// ==========================
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ==========================
// HELPER FUNCTIONS
// ==========================

/**
 * Get current timestamp in ISO format
 */
function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Get formatted date for log files
 */
function getLogDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get log file path
 */
function getLogFilePath(type = 'access') {
    const date = getLogDate();
    return path.join(LOG_DIR, `${type}-${date}.log`);
}

/**
 * Check and rotate log file if too large
 */
function rotateLogIfNeeded(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.size > MAX_LOG_SIZE) {
                // Rename current log file
                const timestamp = Date.now();
                const dir = path.dirname(filePath);
                const basename = path.basename(filePath, '.log');
                const newPath = path.join(dir, `${basename}-${timestamp}.log`);
                fs.renameSync(filePath, newPath);
                
                // Delete old log files if more than MAX_LOG_FILES
                const files = fs.readdirSync(dir)
                    .filter(f => f.startsWith(basename))
                    .sort();
                
                while (files.length > MAX_LOG_FILES) {
                    const oldest = files.shift();
                    fs.unlinkSync(path.join(dir, oldest));
                }
                
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Log rotation error:', error.message);
        return false;
    }
}

/**
 * Write to log file with rotation
 */
function writeToLogFile(type, message) {
    try {
        const filePath = getLogFilePath(type);
        rotateLogIfNeeded(filePath);
        fs.appendFileSync(filePath, message + '\n');
    } catch (error) {
        console.error('Failed to write log:', error.message);
    }
}

/**
 * Format log entry
 */
function formatLogEntry(level, message, data = null) {
    const timestamp = getTimestamp();
    const hostname = os.hostname();
    const pid = process.pid;
    
    let entry = `${timestamp} | ${level.toUpperCase()} | ${hostname} | PID:${pid}`;
    
    if (typeof message === 'string') {
        entry += ` | ${message}`;
    } else if (message instanceof Error) {
        entry += ` | ${message.message}`;
        if (message.stack) {
            entry += `\n${message.stack}`;
        }
    } else {
        entry += ` | ${JSON.stringify(message)}`;
    }
    
    if (data) {
        entry += ` | ${JSON.stringify(data)}`;
    }
    
    return entry;
}

/**
 * Check if log level is enabled
 */
function isLogLevelEnabled(level) {
    return LOG_LEVELS[level.toUpperCase()] <= CURRENT_LOG_LEVEL;
}

// ==========================
// LOGGER FUNCTIONS
// ==========================

/**
 * Log error messages
 */
function logError(message, data = null) {
    if (!isLogLevelEnabled('ERROR')) return;
    
    const entry = formatLogEntry('ERROR', message, data);
    console.error(entry);
    writeToLogFile('error', entry);
}

/**
 * Log warning messages
 */
function logWarn(message, data = null) {
    if (!isLogLevelEnabled('WARN')) return;
    
    const entry = formatLogEntry('WARN', message, data);
    console.warn(entry);
    writeToLogFile('access', entry);
}

/**
 * Log info messages
 */
function logInfo(message, data = null) {
    if (!isLogLevelEnabled('INFO')) return;
    
    const entry = formatLogEntry('INFO', message, data);
    console.log(entry);
    writeToLogFile('access', entry);
}

/**
 * Log debug messages
 */
function logDebug(message, data = null) {
    if (!isLogLevelEnabled('DEBUG')) return;
    
    const entry = formatLogEntry('DEBUG', message, data);
    console.debug(entry);
    writeToLogFile('access', entry);
}

/**
 * Log trace messages (very detailed)
 */
function logTrace(message, data = null) {
    if (!isLogLevelEnabled('TRACE')) return;
    
    const entry = formatLogEntry('TRACE', message, data);
    console.trace(entry);
    writeToLogFile('trace', entry);
}

// ==========================
// EXPRESS MIDDLEWARE
// ==========================

/**
 * Request logging middleware
 */
function logRequest(req, res, next) {
    const start = Date.now();
    const method = req.method;
    const url = req.url;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Generate request ID for tracing
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    req.requestId = requestId;

    // Log request start (debug level)
    if (isLogLevelEnabled('DEBUG')) {
        logDebug(`Request started: ${method} ${url}`, {
            requestId,
            ip,
            userAgent,
            query: req.query,
            body: req.method !== 'GET' ? req.body : undefined
        });
    }

    // Log when response finishes
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const contentLength = res.get('Content-Length') || 0;
        
        // Determine log level based on status code
        let level = 'INFO';
        if (status >= 500) level = 'ERROR';
        else if (status >= 400) level = 'WARN';
        else if (status >= 300) level = 'INFO';
        
        const logData = {
            requestId,
            method,
            url,
            status,
            duration: `${duration}ms`,
            ip,
            contentLength,
            userAgent
        };
        
        const message = `${method} ${url} | ${status} | ${duration}ms | ${ip}`;
        
        if (level === 'ERROR') {
            logError(message, logData);
        } else if (level === 'WARN') {
            logWarn(message, logData);
        } else {
            logInfo(message, logData);
        }
    });

    // Log request errors
    res.on('error', (error) => {
        logError(`Request error: ${error.message}`, {
            requestId,
            method,
            url,
            ip,
            error: error.stack
        });
    });

    next();
}

/**
 * Error logging middleware
 */
function logErrorMiddleware(err, req, res, next) {
    const requestId = req.requestId || 'unknown';
    
    const errorData = {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        headers: req.headers,
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
        stack: err.stack
    };
    
    logError(`Unhandled error: ${err.message}`, errorData);
    
    // Also log to error-specific file with full stack
    const entry = formatLogEntry('ERROR', err);
    writeToLogFile('error', entry);
    
    next(err);
}

// ==========================
// PERFORMANCE LOGGING
// ==========================

/**
 * Log performance metrics
 */
function logPerformance(operation, duration, data = null) {
    const message = `Performance: ${operation} completed in ${duration}ms`;
    logInfo(message, { operation, duration: `${duration}ms`, ...data });
}

/**
 * Measure execution time of async function
 */
async function measurePerformance(operation, fn, data = null) {
    const start = Date.now();
    try {
        const result = await fn();
        const duration = Date.now() - start;
        logPerformance(operation, duration, { success: true, ...data });
        return result;
    } catch (error) {
        const duration = Date.now() - start;
        logError(`Performance failure: ${operation}`, { 
            duration: `${duration}ms`, 
            error: error.message,
            ...data 
        });
        throw error;
    }
}

// ==========================
// UTILITY FUNCTIONS
// ==========================

/**
 * Get log files list
 */
function getLogFiles() {
    try {
        const files = fs.readdirSync(LOG_DIR);
        return files.map(file => ({
            name: file,
            path: path.join(LOG_DIR, file),
            size: fs.statSync(path.join(LOG_DIR, file)).size,
            modified: fs.statSync(path.join(LOG_DIR, file)).mtime
        })).sort((a, b) => b.modified - a.modified);
    } catch (error) {
        logError('Failed to get log files', error);
        return [];
    }
}

/**
 * Clear old logs (keep last N days)
 */
function clearOldLogs(daysToKeep = 7) {
    try {
        const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        const files = fs.readdirSync(LOG_DIR);
        let deleted = 0;
        
        files.forEach(file => {
            const filePath = path.join(LOG_DIR, file);
            const stats = fs.statSync(filePath);
            if (stats.mtime.getTime() < cutoffDate) {
                fs.unlinkSync(filePath);
                deleted++;
            }
        });
        
        if (deleted > 0) {
            logInfo(`Cleaned up ${deleted} old log files (older than ${daysToKeep} days)`);
        }
        return deleted;
    } catch (error) {
        logError('Failed to clear old logs', error);
        return 0;
    }
}

/**
 * Get log statistics
 */
function getLogStats() {
    try {
        const files = getLogFiles();
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        
        return {
            totalFiles: files.length,
            totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
            oldest: files.length > 0 ? files[files.length - 1].modified : null,
            newest: files.length > 0 ? files[0].modified : null,
            files: files.slice(0, 10) // Show last 10 files
        };
    } catch (error) {
        logError('Failed to get log stats', error);
        return null;
    }
}

// ==========================
// EXPORTS
// ==========================
module.exports = {
    // Main logger functions
    logError,
    logWarn,
    logInfo,
    logDebug,
    logTrace,
    
    // Express middleware
    logRequest,
    logErrorMiddleware,
    
    // Performance
    logPerformance,
    measurePerformance,
    
    // Utility functions
    getLogFiles,
    clearOldLogs,
    getLogStats,
    getTimestamp,
    
    // Constants
    LOG_LEVELS,
    CURRENT_LOG_LEVEL,
    LOG_DIR
};
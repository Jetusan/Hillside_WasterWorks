import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    FATAL = 'FATAL'
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    source: string;
    message: string;
    details?: any;
    stack?: string;
}

class Logger {
    private logFilePath: string = '';
    private maxLogFileSize: number = 5 * 1024 * 1024; // 5MB
    private maxLogFiles: number = 5;
    private isInitialized: boolean = false;

    private init(): void {
        if (this.isInitialized) return;

        try {
            const userDataPath = app?.getPath?.('userData') || process.cwd();
            const logsDir = path.join(userDataPath, 'logs');
            
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }

            this.logFilePath = path.join(logsDir, `app-${this.getDateString()}.log`);
            this.isInitialized = true;
            
            this.info('Logger', 'Logger initialized', { logsDir, logFile: this.logFilePath });
        } catch (error) {
            console.error('Failed to initialize logger:', error);
            this.logFilePath = path.join(process.cwd(), 'logs', `app-${this.getDateString()}.log`);
        }
    }

    private getDateString(): string {
        return new Date().toISOString().split('T')[0];
    }

    private getTimestamp(): string {
        return new Date().toISOString();
    }

    private formatLogEntry(entry: LogEntry): string {
        const details = entry.details ? ` | Details: ${JSON.stringify(entry.details)}` : '';
        const stack = entry.stack ? `\nStack: ${entry.stack}` : '';
        return `[${entry.timestamp}] [${entry.level}] [${entry.source}] ${entry.message}${details}${stack}\n`;
    }

    private rotateLogsIfNeeded(): void {
        try {
            if (fs.existsSync(this.logFilePath)) {
                const stats = fs.statSync(this.logFilePath);
                if (stats.size > this.maxLogFileSize) {
                    const timestamp = Date.now();
                    const rotatedPath = this.logFilePath.replace('.log', `-${timestamp}.log`);
                    fs.renameSync(this.logFilePath, rotatedPath);
                    this.cleanOldLogs();
                }
            }
        } catch (error) {
            console.error('Error rotating logs:', error);
        }
    }

    private cleanOldLogs(): void {
        try {
            const logsDir = path.dirname(this.logFilePath);
            const logFiles = fs.readdirSync(logsDir)
                .filter(f => f.startsWith('app-') && f.endsWith('.log'))
                .map(f => ({ name: f, path: path.join(logsDir, f), time: fs.statSync(path.join(logsDir, f)).mtime.getTime() }))
                .sort((a, b) => b.time - a.time);

            if (logFiles.length > this.maxLogFiles) {
                logFiles.slice(this.maxLogFiles).forEach(f => {
                    try {
                        fs.unlinkSync(f.path);
                    } catch (e) {
                        // Ignore deletion errors
                    }
                });
            }
        } catch (error) {
            console.error('Error cleaning old logs:', error);
        }
    }

    private writeLog(entry: LogEntry): void {
        this.init();
        this.rotateLogsIfNeeded();

        const formattedEntry = this.formatLogEntry(entry);
        
        // Write to file
        try {
            const dir = path.dirname(this.logFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.appendFileSync(this.logFilePath, formattedEntry);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }

        // Also output to console with color coding
        const color = this.getLevelColor(entry.level);
        console.log(`${color}[${entry.level}] [${entry.source}]${'\x1b[0m'} ${entry.message}`);
        if (entry.details) {
            console.log(`${color}→ Details:${'\x1b[0m'}`, entry.details);
        }
        if (entry.stack) {
            console.log(`${color}→ Stack:${'\x1b[0m'}`, entry.stack);
        }
    }

    private getLevelColor(level: LogLevel): string {
        switch (level) {
            case LogLevel.DEBUG: return '\x1b[36m'; // Cyan
            case LogLevel.INFO: return '\x1b[32m'; // Green
            case LogLevel.WARN: return '\x1b[33m'; // Yellow
            case LogLevel.ERROR: return '\x1b[31m'; // Red
            case LogLevel.FATAL: return '\x1b[35m'; // Magenta
            default: return '\x1b[0m';
        }
    }

    debug(source: string, message: string, details?: any): void {
        this.writeLog({
            timestamp: this.getTimestamp(),
            level: LogLevel.DEBUG,
            source,
            message,
            details
        });
    }

    info(source: string, message: string, details?: any): void {
        this.writeLog({
            timestamp: this.getTimestamp(),
            level: LogLevel.INFO,
            source,
            message,
            details
        });
    }

    warn(source: string, message: string, details?: any): void {
        this.writeLog({
            timestamp: this.getTimestamp(),
            level: LogLevel.WARN,
            source,
            message,
            details
        });
    }

    error(source: string, message: string, details?: any, stack?: string): void {
        this.writeLog({
            timestamp: this.getTimestamp(),
            level: LogLevel.ERROR,
            source,
            message,
            details,
            stack
        });
    }

    fatal(source: string, message: string, details?: any, stack?: string): void {
        this.writeLog({
            timestamp: this.getTimestamp(),
            level: LogLevel.FATAL,
            source,
            message,
            details,
            stack
        });
    }

    // Convenience method for catching errors
    catchError(context: string, error: unknown, additionalInfo?: any): void {
        const errorObj = error as Error;
        this.error(
            context,
            errorObj.message || 'Unknown error',
            additionalInfo,
            errorObj.stack
        );
    }

    getLogFilePath(): string {
        this.init();
        return this.logFilePath;
    }

    // Get recent logs for UI display
    getRecentLogs(lines: number = 100): LogEntry[] {
        this.init();
        try {
            if (!fs.existsSync(this.logFilePath)) {
                return [];
            }
            const content = fs.readFileSync(this.logFilePath, 'utf-8');
            const allLines = content.split('\n').filter(l => l.trim());
            return allLines.slice(-lines).map(line => {
                const match = line.match(/\[(.*?)\] \[(.*?)\] \[(.*?)\] (.*?)(?: \| Details: (.*))?/);
                if (match) {
                    return {
                        timestamp: match[1],
                        level: match[2] as LogLevel,
                        source: match[3],
                        message: match[4],
                        details: match[5] ? JSON.parse(match[5]) : undefined
                    };
                }
                return null;
            }).filter(Boolean) as LogEntry[];
        } catch (error) {
            return [];
        }
    }
}

export const logger = new Logger();
export default logger;
import * as fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const timeZero = Date.now();

/**
 * Simple logging utility
 * @param message Message to log
 * @param logFilePath Optional custom log file path
 */
export function log(
    message: string,
    logFilePath: string = path.join(os.homedir(), ".mcp-code23.log")
): void {
    // Ensure the directory exists
    const logDir = path.dirname(logFilePath);
    fs.mkdirSync(logDir, { recursive: true });

    const now = new Date();
    const timestamp = new Date().toISOString();
    const relativeTime = now.getTime() - timeZero;
    const logMessage = `[${relativeTime}ms] ${timestamp} - ${message}\n`;
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error("Error writing to log file:", err);
        }
    });
}

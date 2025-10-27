#!/usr/bin/env tsx
// Log rotation script
// Run this periodically (e.g., daily via cron) to rotate and compress old logs

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const logsDir = path.join(process.cwd(), 'logs');
const maxLogSizeMB = 10; // Rotate logs larger than 10MB
const keepDays = 30; // Keep logs for 30 days

interface LogFile {
  name: string;
  path: string;
  size: number;
  mtime: Date;
}

async function getLogFiles(): Promise<LogFile[]> {
  if (!fs.existsSync(logsDir)) {
    console.log('No logs directory found');
    return [];
  }

  const files = fs.readdirSync(logsDir);
  const logFiles: LogFile[] = [];

  for (const file of files) {
    if (file.endsWith('.log')) {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      logFiles.push({
        name: file,
        path: filePath,
        size: stats.size,
        mtime: stats.mtime,
      });
    }
  }

  return logFiles;
}

async function rotateLog(logFile: LogFile): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const baseName = logFile.name.replace('.log', '');
  const rotatedName = `${baseName}-${timestamp}.log`;
  const rotatedPath = path.join(logsDir, rotatedName);

  console.log(`Rotating ${logFile.name} -> ${rotatedName}`);

  // Copy current log to rotated file
  fs.copyFileSync(logFile.path, rotatedPath);

  // Truncate the current log file
  fs.truncateSync(logFile.path, 0);

  // Compress the rotated file (gzip)
  try {
    await execAsync(`gzip ${rotatedPath}`);
    console.log(`Compressed ${rotatedName}.gz`);
  } catch (error) {
    console.warn(`Failed to compress ${rotatedName}:`, error);
  }
}

async function deleteOldLogs(): Promise<void> {
  const files = fs.readdirSync(logsDir);
  const now = Date.now();
  const maxAge = keepDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

  for (const file of files) {
    if (file.endsWith('.log.gz') || file.match(/\.log-\d{4}-\d{2}-\d{2}\.log$/)) {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtime.getTime();

      if (age > maxAge) {
        console.log(`Deleting old log: ${file} (${Math.floor(age / (24 * 60 * 60 * 1000))} days old)`);
        fs.unlinkSync(filePath);
      }
    }
  }
}

async function main() {
  console.log('🔄 Starting log rotation...\n');

  const logFiles = await getLogFiles();

  if (logFiles.length === 0) {
    console.log('No log files to rotate');
    return;
  }

  console.log(`Found ${logFiles.length} log files\n`);

  // Rotate logs that exceed size limit
  for (const logFile of logFiles) {
    const sizeMB = logFile.size / (1024 * 1024);
    console.log(`${logFile.name}: ${sizeMB.toFixed(2)} MB`);

    if (sizeMB > maxLogSizeMB) {
      await rotateLog(logFile);
    }
  }

  console.log('\n🗑️  Cleaning up old logs...\n');
  await deleteOldLogs();

  console.log('\n✅ Log rotation complete');
}

main().catch((error) => {
  console.error('Error during log rotation:', error);
  process.exit(1);
});

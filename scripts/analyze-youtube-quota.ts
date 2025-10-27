#!/usr/bin/env tsx
// Analyze YouTube API usage from logs
// Helps track quota consumption and identify optimization opportunities

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const logsDir = path.join(process.cwd(), 'logs');
const youtubeLogPath = path.join(logsDir, 'youtube-api.log');

interface ApiCall {
  timestamp: string;
  method: string;
  itemCount?: number;
}

interface QuotaStats {
  totalCalls: number;
  callsByMethod: Map<string, number>;
  quotaUnits: number;
  quotaByMethod: Map<string, number>;
  itemsFetched: Map<string, number>;
  hourlyBreakdown: Map<string, number>;
}

// YouTube API quota costs (units per request)
const QUOTA_COSTS: Record<string, number> = {
  search: 100,
  videos: 1,
  channels: 1,
  playlistItems: 1,
};

async function parseLogFile(): Promise<ApiCall[]> {
  const calls: ApiCall[] = [];

  if (!fs.existsSync(youtubeLogPath)) {
    console.error(`❌ No YouTube API log file found at ${youtubeLogPath}`);
    console.log('\nMake sure to:');
    console.log('1. Start your dev server: npm run dev');
    console.log('2. Add a YouTube channel or search for channels');
    console.log('3. Run this script again\n');
    return calls;
  }

  const fileStream = fs.createReadStream(youtubeLogPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    try {
      const log = JSON.parse(line);

      // Only count successful API responses
      if (log.msg && log.msg.includes('✓ YouTube API response') && log.method) {
        calls.push({
          timestamp: log.time,
          method: log.method,
          itemCount: log.itemCount,
        });
      }
    } catch (error) {
      // Skip invalid JSON lines
    }
  }

  return calls;
}

function calculateStats(calls: ApiCall[]): QuotaStats {
  const stats: QuotaStats = {
    totalCalls: calls.length,
    callsByMethod: new Map(),
    quotaUnits: 0,
    quotaByMethod: new Map(),
    itemsFetched: new Map(),
    hourlyBreakdown: new Map(),
  };

  for (const call of calls) {
    // Count calls by method
    const methodCount = stats.callsByMethod.get(call.method) || 0;
    stats.callsByMethod.set(call.method, methodCount + 1);

    // Calculate quota units
    const quotaCost = QUOTA_COSTS[call.method] || 1;
    stats.quotaUnits += quotaCost;

    const methodQuota = stats.quotaByMethod.get(call.method) || 0;
    stats.quotaByMethod.set(call.method, methodQuota + quotaCost);

    // Track items fetched
    if (call.itemCount) {
      const itemCount = stats.itemsFetched.get(call.method) || 0;
      stats.itemsFetched.set(call.method, itemCount + call.itemCount);
    }

    // Hourly breakdown
    const hour = new Date(call.timestamp).toISOString().split('T')[0] + 'T' + new Date(call.timestamp).getHours().toString().padStart(2, '0') + ':00';
    const hourlyCount = stats.hourlyBreakdown.get(hour) || 0;
    stats.hourlyBreakdown.set(hour, hourlyCount + quotaCost);
  }

  return stats;
}

function printStats(stats: QuotaStats) {
  console.log('\n📊 YouTube API Usage Report');
  console.log('═'.repeat(60));

  console.log(`\n🔢 Total API Calls: ${stats.totalCalls}`);
  console.log(`⚡ Total Quota Units Used: ${stats.quotaUnits} / 10,000 daily limit`);

  const percentUsed = ((stats.quotaUnits / 10000) * 100).toFixed(2);
  console.log(`📈 Percentage of Daily Quota: ${percentUsed}%`);

  console.log('\n📋 Calls by API Method:');
  console.log('─'.repeat(60));
  const sortedMethods = Array.from(stats.callsByMethod.entries()).sort((a, b) => b[1] - a[1]);

  for (const [method, count] of sortedMethods) {
    const quota = stats.quotaByMethod.get(method) || 0;
    const items = stats.itemsFetched.get(method) || 0;
    const costPer = QUOTA_COSTS[method] || 1;

    console.log(`  ${method.padEnd(20)} ${count.toString().padStart(4)} calls  ${quota.toString().padStart(5)} units (${costPer} each)`);
    if (items > 0) {
      console.log(`${' '.repeat(35)}→ Fetched ${items} items`);
    }
  }

  if (stats.hourlyBreakdown.size > 0) {
    console.log('\n⏰ Hourly Breakdown:');
    console.log('─'.repeat(60));
    const sortedHours = Array.from(stats.hourlyBreakdown.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    for (const [hour, units] of sortedHours) {
      const bar = '█'.repeat(Math.ceil(units / 10));
      console.log(`  ${hour}  ${units.toString().padStart(4)} units  ${bar}`);
    }
  }

  console.log('\n💡 Optimization Tips:');
  console.log('─'.repeat(60));

  const searchCalls = stats.callsByMethod.get('search') || 0;
  if (searchCalls > 10) {
    console.log('  ⚠️  High search usage - Consider caching search results longer');
  }

  const totalChannelCalls = stats.callsByMethod.get('channels') || 0;
  if (totalChannelCalls > searchCalls * 2) {
    console.log('  ⚠️  High channel detail requests - Ensure batch fetching is enabled');
  }

  if (stats.quotaUnits < 100) {
    console.log('  ✅ Great! Quota usage is very efficient');
  } else if (stats.quotaUnits < 1000) {
    console.log('  ✅ Good quota usage - Well optimized');
  } else if (stats.quotaUnits < 5000) {
    console.log('  ⚠️  Moderate quota usage - Monitor for patterns');
  } else {
    console.log('  🚨 High quota usage - Review API call patterns');
  }

  console.log('\n═'.repeat(60));
}

async function main() {
  console.log('🔍 Analyzing YouTube API usage from logs...\n');

  const calls = await parseLogFile();

  if (calls.length === 0) {
    return;
  }

  console.log(`Found ${calls.length} API calls in log file`);

  const stats = calculateStats(calls);
  printStats(stats);

  console.log('\n📁 Log file location:', youtubeLogPath);
  console.log('🔄 To clear logs and start fresh: rm', youtubeLogPath);
  console.log('');
}

main().catch((error) => {
  console.error('Error analyzing logs:', error);
  process.exit(1);
});

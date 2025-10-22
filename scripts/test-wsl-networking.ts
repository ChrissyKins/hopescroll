#!/usr/bin/env npx tsx
/**
 * WSL Networking Performance Test
 *
 * Tests network latency from WSL to your Supabase database
 * to identify if WSL networking is the bottleneck
 */

import { performance } from 'perf_hooks';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color?: keyof typeof colors) {
  const c = color ? colors[color] : '';
  console.log(`${c}${message}${colors.reset}`);
}

async function testLatency(host: string, port: number, iterations: number = 5) {
  const latencies: number[] = [];

  log(`\nTesting connection to ${host}:${port}...`, 'cyan');

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      // Use netcat or curl to test TCP connection
      const { stdout } = await execAsync(
        `timeout 2 bash -c 'cat < /dev/null > /dev/tcp/${host}/${port}' 2>&1 || echo "fail"`,
        { timeout: 3000 }
      );

      const duration = performance.now() - start;

      if (stdout.includes('fail')) {
        log(`  Attempt ${i + 1}: Connection failed`, 'red');
      } else {
        latencies.push(duration);
        log(`  Attempt ${i + 1}: ${duration.toFixed(2)}ms`, duration > 200 ? 'yellow' : 'green');
      }
    } catch (error) {
      const duration = performance.now() - start;
      log(`  Attempt ${i + 1}: Timeout or error after ${duration.toFixed(2)}ms`, 'red');
    }

    // Wait a bit between attempts
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (latencies.length === 0) {
    log('  ⚠ All connection attempts failed', 'red');
    return null;
  }

  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);

  log(`\n  Results:`, 'cyan');
  log(`    Average: ${avg.toFixed(2)}ms`);
  log(`    Min: ${min.toFixed(2)}ms`);
  log(`    Max: ${max.toFixed(2)}ms`);
  log(`    Success Rate: ${latencies.length}/${iterations}`);

  return { avg, min, max, successRate: latencies.length / iterations };
}

async function testDNS(hostname: string) {
  log(`\nTesting DNS resolution for ${hostname}...`, 'cyan');
  const start = performance.now();

  try {
    const { stdout } = await execAsync(`nslookup ${hostname}`);
    const duration = performance.now() - start;

    log(`  ✓ DNS Resolution: ${duration.toFixed(2)}ms`, duration > 100 ? 'yellow' : 'green');

    // Extract IP addresses
    const ipMatch = stdout.match(/Address: ([\d.]+)/g);
    if (ipMatch) {
      log(`  Resolved IPs:`, 'cyan');
      ipMatch.forEach(ip => log(`    ${ip.replace('Address: ', '')}`));
    }

    return duration;
  } catch (error) {
    const duration = performance.now() - start;
    log(`  ✗ DNS Resolution failed after ${duration.toFixed(2)}ms`, 'red');
    return null;
  }
}

async function checkWSLConfig() {
  log('\nWSL Network Configuration:', 'cyan');

  try {
    // Check /etc/resolv.conf
    const { stdout: resolv } = await execAsync('cat /etc/resolv.conf');
    log('  DNS Configuration (/etc/resolv.conf):');
    resolv.split('\n').filter(line => line.trim() && !line.startsWith('#'))
      .forEach(line => log(`    ${line}`));

    // Check if .wslconfig exists
    try {
      const { stdout: wslconfig } = await execAsync('cat /mnt/c/Users/*/.wslconfig 2>/dev/null || echo "Not found"');
      if (!wslconfig.includes('Not found')) {
        log('\n  .wslconfig found:', 'yellow');
        log('    Consider these settings for better network performance:');
        log('    [wsl2]');
        log('    networkingMode=mirrored');
        log('    dnsTunneling=true');
      }
    } catch {}

  } catch (error) {
    log(`  Could not read config: ${error}`, 'red');
  }
}

async function testWSLNetworkMode() {
  log('\nWSL Network Mode:', 'cyan');

  try {
    // Check network interfaces
    const { stdout } = await execAsync('ip addr show');

    if (stdout.includes('eth0')) {
      log('  Mode: NAT (default) - Can cause latency', 'yellow');
      log('  Consider switching to mirrored mode in .wslconfig', 'yellow');
    }
  } catch (error) {
    log(`  Could not determine network mode`, 'yellow');
  }
}

async function main() {
  log('\n========================================', 'blue');
  log('  WSL Network Performance Test', 'blue');
  log('========================================\n', 'blue');

  // Parse database URL
  const dbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || '';

  if (!dbUrl) {
    log('Error: No database URL found in environment', 'red');
    log('Set POSTGRES_PRISMA_URL or DATABASE_URL', 'red');
    process.exit(1);
  }

  // Extract host and port from connection string
  const urlMatch = dbUrl.match(/@([^:]+):(\d+)/);
  if (!urlMatch) {
    log('Error: Could not parse database URL', 'red');
    process.exit(1);
  }

  const [, host, portStr] = urlMatch;
  const port = parseInt(portStr, 10);

  log(`Database Host: ${host}`);
  log(`Database Port: ${port}`);

  // Run tests
  await testDNS(host);
  await testLatency(host, port, 5);
  await checkWSLConfig();
  await testWSLNetworkMode();

  // Recommendations
  log('\n========================================', 'blue');
  log('  Recommendations', 'blue');
  log('========================================\n', 'blue');

  log('WSL2 Network Optimization Options:', 'cyan');
  log('\n1. Enable Mirrored Networking (Windows 11 22H2+):');
  log('   Create/edit: C:\\Users\\YourUsername\\.wslconfig');
  log('   Add:');
  log('   [wsl2]');
  log('   networkingMode=mirrored');
  log('   dnsTunneling=true');
  log('   firewall=true');
  log('   \n   Then restart WSL: wsl --shutdown');

  log('\n2. Adjust WSL Memory and Swap:');
  log('   In the same .wslconfig file:');
  log('   [wsl2]');
  log('   memory=4GB');
  log('   swap=2GB');
  log('   processors=4');

  log('\n3. Use Connection Pooling (Already configured in your URL):');
  log('   Your Supabase URL already uses pgbouncer for pooling ✓');

  log('\n4. Add Prisma Connection Pool:');
  log('   Consider adding to your Prisma client:');
  log('   connection_limit=5');
  log('   pool_timeout=10');

  log('\n5. Enable Prisma Query Engine Binary (faster than WASM):');
  log('   Add to schema.prisma:');
  log('   generator client {');
  log('     provider = "prisma-client-js"');
  log('     binaryTargets = ["native", "debian-openssl-3.0.x"]');
  log('   }');

  log('\n6. Test from Windows directly:');
  log('   To verify if WSL is the issue, try running your app');
  log('   directly in Windows PowerShell and compare performance.');

  log('\n========================================\n', 'blue');
}

main().catch(console.error);

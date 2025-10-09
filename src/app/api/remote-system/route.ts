import { NextRequest, NextResponse } from 'next/server';
import { NodeSSH } from 'node-ssh';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: NextRequest) {
  const ssh = new NodeSSH();
  let keyFilePath: string | null = null;

  try {
    // Parse JSON with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { host, port, username, privateKey, passphrase, password } = body;

    if (!host || !username) {
      return NextResponse.json(
        { error: 'Missing required fields: host, username' },
        { status: 400 }
      );
    }

    // Check if either password or privateKey is provided
    if (!privateKey && !password) {
      return NextResponse.json(
        { error: 'Either private key or password is required' },
        { status: 400 }
      );
    }

    console.log('Attempting SSH connection to:', host);

    let connectionConfig: any = {
      host,
      port: port || 22,
      username,
      readyTimeout: 15000,
      tryKeyboard: true,
    };

    // Use password authentication if provided and no private key
    if (password && !privateKey) {
      connectionConfig.password = password;
    } else if (privateKey) {
      // Use key-based authentication

      // Normalize line endings
      let processedKey = privateKey
        .replace(/\\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();

      // Check if it's a PPK file - require manual conversion
      if (processedKey.includes('PuTTY-User-Key-File')) {
        return NextResponse.json(
          {
            error: 'PPK format detected. Please convert to OpenSSH format:\n\n' +
                   '1. Open PuTTYgen\n' +
                   '2. Load your .ppk file\n' +
                   '3. Go to Conversions → Export OpenSSH key\n' +
                   '4. Save and upload the converted .pem file\n\n' +
                   'Or use command: puttygen yourkey.ppk -O private-openssh -o yourkey.pem'
          },
          { status: 400 }
        );
      }

      // Create temporary directory if it doesn't exist
      const tempDir = join(tmpdir(), 'ssh-keys');
      try {
        mkdirSync(tempDir, { recursive: true });
      } catch (e) {
        // Directory might already exist
      }

      // Write key to temporary file
      keyFilePath = join(tempDir, `key-${Date.now()}-${Math.random().toString(36).substring(7)}`);
      writeFileSync(keyFilePath, processedKey, { mode: 0o600 });

      connectionConfig.privateKeyPath = keyFilePath;
      if (passphrase) {
        connectionConfig.passphrase = passphrase;
      }
    }

    // Connect using node-ssh
    await ssh.connect(connectionConfig);

    // Execute system info commands
    const commands = [
      // CPU info
      "grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'",
      "nproc",
      "lscpu | grep 'Model name' | cut -d':' -f2 | xargs",
      // Memory info
      "free -b | grep Mem | awk '{print $2}'",
      "free -b | grep Mem | awk '{print $3}'",
      "free -b | grep Mem | awk '{print $4}'",
      // Disk info
      "df -B1 / | tail -1 | awk '{print $2}'",
      "df -B1 / | tail -1 | awk '{print $3}'",
      "df -B1 / | tail -1 | awk '{print $4}'",
      "df -h / | tail -1 | awk '{print $5}' | sed 's/%//'",
      // System info
      "uname -s",
      "cat /etc/os-release | grep PRETTY_NAME | cut -d'\"' -f2",
      "uname -m",
      "hostname",
      "cat /proc/uptime | awk '{print $1}'",
      // Process info
      "ps aux | wc -l",
      "ps aux | grep -v 'Z' | wc -l"
    ];

    const fullCommand = commands.join('; echo "---"; ');
    const result = await ssh.execCommand(fullCommand);

    // Get top processes (like top command)
    const topProcessesCmd = "ps aux --sort=-%cpu | head -n 21 | tail -n +2";
    const processesResult = await ssh.execCommand(topProcessesCmd);

    ssh.dispose();

    // Clean up temporary key file
    if (keyFilePath) {
      try {
        unlinkSync(keyFilePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    if (result.code !== 0) {
      throw new Error('Failed to execute system commands');
    }

    const results = result.stdout.trim().split('---').map(s => s.trim());

    const cpuUsage = parseFloat(results[0]) || 0;
    const cpuCores = parseInt(results[1]) || 1;
    const cpuModel = results[2] || 'Unknown';
    const memTotal = parseInt(results[3]) || 1;
    const memUsed = parseInt(results[4]) || 0;
    const memFree = parseInt(results[5]) || 0;
    const diskTotal = parseInt(results[6]) || 1;
    const diskUsed = parseInt(results[7]) || 0;
    const diskAvailable = parseInt(results[8]) || 0;
    const diskUsagePercent = parseFloat(results[9]) || 0;
    const platform = results[10] || 'Linux';
    const distro = results[11] || 'Unknown';
    const arch = results[12] || 'Unknown';
    const hostname = results[13] || host;
    const uptime = parseFloat(results[14]) || 0;
    const processesAll = parseInt(results[15]) || 0;
    const processesRunning = parseInt(results[16]) || 0;

    // Parse top processes
    const processes = processesResult.stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 11) return null;

        return {
          user: parts[0],
          pid: parseInt(parts[1]),
          cpu: parseFloat(parts[2]),
          mem: parseFloat(parts[3]),
          vsz: parseInt(parts[4]),
          rss: parseInt(parts[5]),
          tty: parts[6],
          stat: parts[7],
          start: parts[8],
          time: parts[9],
          command: parts.slice(10).join(' ').substring(0, 50)
        };
      })
      .filter(p => p !== null)
      .slice(0, 20);

    const systemData = {
      cpu: {
        usage: cpuUsage.toFixed(2),
        cores: cpuCores,
        model: cpuModel,
        speed: 0
      },
      memory: {
        total: (memTotal / (1024 ** 3)).toFixed(2),
        used: (memUsed / (1024 ** 3)).toFixed(2),
        free: (memFree / (1024 ** 3)).toFixed(2),
        usagePercent: ((memUsed / memTotal) * 100).toFixed(2)
      },
      disk: {
        total: (diskTotal / (1024 ** 3)).toFixed(2),
        used: (diskUsed / (1024 ** 3)).toFixed(2),
        available: (diskAvailable / (1024 ** 3)).toFixed(2),
        usagePercent: diskUsagePercent.toFixed(2)
      },
      network: {
        download: '0.00',
        upload: '0.00'
      },
      system: {
        platform,
        distro,
        arch,
        hostname,
        uptime: Math.floor(uptime)
      },
      processes: {
        all: processesAll,
        running: processesRunning,
        blocked: 0,
        list: processes
      }
    };

    return NextResponse.json(systemData);
  } catch (error: any) {
    console.error('Remote system error:', error);

    if (ssh.isConnected()) {
      ssh.dispose();
    }

    // Clean up temporary key file on error
    if (keyFilePath) {
      try {
        unlinkSync(keyFilePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    let errorMessage = error.message || 'Failed to fetch remote system info';

    if (error.message?.includes('All configured authentication methods failed')) {
      errorMessage = 'Authentication failed. Please check your username and private key.';
    } else if (error.message?.includes('Timed out')) {
      errorMessage = 'Connection timeout. Please check the host and port.';
    } else if (error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Connection refused. Please check if SSH is running on the remote host.';
    } else if (error.message?.includes('Unsupported key format') || error.message?.includes('Cannot parse privateKey')) {
      errorMessage = 'Unsupported private key format. Please convert your PPK file to OpenSSH format:\n\n' +
                     '1. Open PuTTYgen\n' +
                     '2. Load your .ppk file (Conversions > Import key)\n' +
                     '3. Go to Conversions > Export OpenSSH key\n' +
                     '4. Save the file and use it here\n\n' +
                     'Or use command line: puttygen yourkey.ppk -O private-openssh -o yourkey.pem';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

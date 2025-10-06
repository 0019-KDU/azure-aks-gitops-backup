import { NextResponse } from 'next/server';
import si from 'systeminformation';

export async function GET() {
  try {
    const [cpu, mem, fsSize, networkStats, osInfo, currentLoad, processes, time] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.osInfo(),
      si.currentLoad(),
      si.processes(),
      si.time()
    ]);

    const networkInterface = networkStats[0] || { rx_sec: 0, tx_sec: 0 };

    return NextResponse.json({
      cpu: {
        usage: currentLoad.currentLoad.toFixed(2),
        cores: cpu.cores,
        model: cpu.manufacturer + ' ' + cpu.brand,
        speed: cpu.speed
      },
      memory: {
        total: (mem.total / (1024 ** 3)).toFixed(2),
        used: (mem.used / (1024 ** 3)).toFixed(2),
        free: (mem.free / (1024 ** 3)).toFixed(2),
        usagePercent: ((mem.used / mem.total) * 100).toFixed(2)
      },
      disk: {
        total: (fsSize[0]?.size / (1024 ** 3) || 0).toFixed(2),
        used: (fsSize[0]?.used / (1024 ** 3) || 0).toFixed(2),
        available: (fsSize[0]?.available / (1024 ** 3) || 0).toFixed(2),
        usagePercent: (fsSize[0]?.use || 0).toFixed(2)
      },
      network: {
        download: (networkInterface.rx_sec / (1024 ** 2)).toFixed(2),
        upload: (networkInterface.tx_sec / (1024 ** 2)).toFixed(2)
      },
      system: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        arch: osInfo.arch,
        hostname: osInfo.hostname,
        uptime: time.uptime
      },
      processes: {
        all: processes.all,
        running: processes.running,
        blocked: processes.blocked
      }
    });
  } catch (error) {
    console.error('System info error:', error);
    return NextResponse.json({ error: 'Failed to fetch system info' }, { status: 500 });
  }
}
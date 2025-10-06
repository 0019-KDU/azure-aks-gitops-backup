'use client';

import { useState, useEffect } from 'react';
import { Cpu, HardDrive, Activity, Zap, MemoryStick, Thermometer } from 'lucide-react';

interface SystemData {
  cpu: {
    usage: string;
    cores: number;
    model: string;
    speed: number;
  };
  memory: {
    total: string;
    used: string;
    free: string;
    usagePercent: string;
  };
  disk: {
    total: string;
    used: string;
    available: string;
    usagePercent: string;
  };
  network: {
    download: string;
    upload: string;
  };
  system: {
    platform: string;
    distro: string;
    release: string;
    arch: string;
    hostname: string;
    uptime: number;
  };
  processes: {
    all: number;
    running: number;
    blocked: number;
  };
}

export default function SystemMonitor() {
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<number[]>([]);

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const response = await fetch('/api/system');
        if (!response.ok) throw new Error('Failed to fetch system data');
        const data = await response.json();
        setSystemData(data);
        setLoading(false);
        setError(null);

        // Update history
        setCpuHistory(prev => [...prev.slice(-29), parseFloat(data.cpu.usage)]);
        setMemoryHistory(prev => [...prev.slice(-29), parseFloat(data.memory.usagePercent)]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchSystemData();
    const interval = setInterval(fetchSystemData, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const MetricCard = ({ title, value, unit, icon: Icon, color, subtitle }: any) => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700 hover:border-slate-600 transition-all duration-300 hover:shadow-cyan-500/10">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
              {value}
            </span>
            <span className="text-slate-500 text-lg">{unit}</span>
          </div>
          {subtitle && <p className="text-slate-500 text-xs mt-2">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-10`}>
          <Icon className="w-6 h-6 text-cyan-400" />
        </div>
      </div>
    </div>
  );

  const MiniChart = ({ data, color }: any) => {
    const max = Math.max(...data, 100);
    const height = 40;
    
    return (
      <svg width="100%" height={height} className="mt-2">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {data.length > 1 && (
          <>
            <path
              d={`M 0 ${height} ${data.map((val: number, i: number) => 
                `L ${(i / (data.length - 1)) * 100}% ${height - (val / max) * height}`
              ).join(' ')} L 100% ${height} Z`}
              fill={`url(#gradient-${color})`}
            />
            <polyline
              points={data.map((val: number, i: number) => 
                `${(i / (data.length - 1)) * 100}%,${height - (val / max) * height}`
              ).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth="2"
            />
          </>
        )}
      </svg>
    );
  };

  const ProgressBar = ({ value, max, color, showLabel = true }: any) => {
    const percentage = (parseFloat(value) / parseFloat(max)) * 100;
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-2">
          {showLabel && (
            <span className="text-sm text-slate-400">
              {value} / {max} GB
            </span>
          )}
          <span className={`text-sm font-semibold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
            {percentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${color} transition-all duration-500 rounded-full shadow-lg`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading System Data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center bg-red-500/10 border border-red-500 rounded-2xl p-8">
          <p className="text-red-500 text-xl font-bold mb-2">Error</p>
          <p className="text-white">{error}</p>
        </div>
      </div>
    );
  }

  if (!systemData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/20">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">System Performance Monitor</h1>
              <p className="text-slate-400">Real-time system metrics - {systemData.system.hostname}</p>
            </div>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <MetricCard
            title="CPU Usage"
            value={systemData.cpu.usage}
            unit="%"
            icon={Cpu}
            color="from-cyan-400 to-blue-500"
            subtitle={`${systemData.cpu.cores} cores @ ${systemData.cpu.speed} GHz`}
          />
          <MetricCard
            title="Memory"
            value={systemData.memory.usagePercent}
            unit="%"
            icon={MemoryStick}
            color="from-purple-400 to-pink-500"
            subtitle={`${systemData.memory.used} GB / ${systemData.memory.total} GB`}
          />
          <MetricCard
            title="Network ↓"
            value={systemData.network.download}
            unit="MB/s"
            icon={Zap}
            color="from-green-400 to-emerald-500"
            subtitle={`↑ ${systemData.network.upload} MB/s`}
          />
          <MetricCard
            title="Uptime"
            value={formatUptime(systemData.system.uptime).split('d')[0]}
            unit="days"
            icon={Thermometer}
            color="from-orange-400 to-red-500"
            subtitle={formatUptime(systemData.system.uptime)}
          />
        </div>

        {/* Detailed Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* CPU Chart */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                CPU Performance
              </h3>
              <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-semibold">
                Live
              </span>
            </div>
            <div className="h-32">
              <MiniChart data={cpuHistory} color="#22d3ee" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-slate-500 text-xs">Current</p>
                <p className="text-white font-bold text-lg">{systemData.cpu.usage}%</p>
              </div>
              <div className="text-center">
                <p className="text-slate-500 text-xs">Average</p>
                <p className="text-white font-bold text-lg">
                  {cpuHistory.length ? (cpuHistory.reduce((a, b) => a + b, 0) / cpuHistory.length).toFixed(1) : 0}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-slate-500 text-xs">Cores</p>
                <p className="text-white font-bold text-lg">{systemData.cpu.cores}</p>
              </div>
            </div>
          </div>

          {/* Memory Chart */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MemoryStick className="w-5 h-5 text-purple-400" />
                Memory Usage
              </h3>
              <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-sm font-semibold">
                Live
              </span>
            </div>
            <div className="h-32">
              <MiniChart data={memoryHistory} color="#c084fc" />
            </div>
            <div className="mt-4">
              <ProgressBar 
                value={systemData.memory.used} 
                max={systemData.memory.total} 
                color="from-purple-400 to-pink-500"
              />
            </div>
          </div>
        </div>

        {/* Storage & System Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Disk Usage */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <HardDrive className="w-5 h-5 text-blue-400" />
              Disk Usage
            </h3>
            <ProgressBar 
              value={systemData.disk.used} 
              max={systemData.disk.total} 
              color="from-blue-400 to-cyan-500"
              showLabel={true}
            />
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-slate-400">{systemData.disk.used} GB used</span>
              <span className="text-slate-400">{systemData.disk.available} GB free</span>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-green-400" />
              System Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Operating System</span>
                <span className="text-white font-semibold">{systemData.system.distro}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Processor</span>
                <span className="text-white font-semibold text-right text-sm">{systemData.cpu.model}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Architecture</span>
                <span className="text-white font-semibold">{systemData.system.arch}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Active Processes</span>
                <span className="text-white font-semibold">{systemData.processes.running} / {systemData.processes.all}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
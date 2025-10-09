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
    list?: Array<{
      user: string;
      pid: number;
      cpu: number;
      mem: number;
      vsz: number;
      rss: number;
      tty: string;
      stat: string;
      start: string;
      time: string;
      command: string;
    }>;
  };
}

export default function SystemMonitor() {
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<number[]>([]);
  const [isRemote, setIsRemote] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState({
    host: '',
    port: '22',
    username: '',
    password: '',
    privateKey: '',
    passphrase: ''
  });

  const fetchRemoteSystemData = async () => {
    try {
      const response = await fetch('/api/remote-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionDetails)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch remote system data');
      }
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

  const handleConnect = () => {
    setIsRemote(true);
    setShowConnectionForm(false);
    setLoading(true);
    setError(null);
  };

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        if (isRemote) {
          await fetchRemoteSystemData();
        } else {
          const response = await fetch('/api/system');
          if (!response.ok) throw new Error('Failed to fetch system data');
          const data = await response.json();
          setSystemData(data);
          setLoading(false);
          setError(null);

          // Update history
          setCpuHistory(prev => [...prev.slice(-29), parseFloat(data.cpu.usage)]);
          setMemoryHistory(prev => [...prev.slice(-29), parseFloat(data.memory.usagePercent)]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    if (!showConnectionForm) {
      fetchSystemData();
      const interval = setInterval(fetchSystemData, 2000);
      return () => clearInterval(interval);
    }
  }, [isRemote, showConnectionForm]);

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

  if (showConnectionForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 shadow-2xl border border-slate-700 max-w-md w-full">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Connect to Remote VM</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">Host IP/Domain</label>
              <input
                type="text"
                value={connectionDetails.host}
                onChange={(e) => setConnectionDetails({ ...connectionDetails, host: e.target.value })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="192.168.1.100"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">Port</label>
              <input
                type="text"
                value={connectionDetails.port}
                onChange={(e) => setConnectionDetails({ ...connectionDetails, port: e.target.value })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="22"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={connectionDetails.username}
                onChange={(e) => setConnectionDetails({ ...connectionDetails, username: e.target.value })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="root"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">Private Key File</label>
              <div className="relative">
                <input
                  type="file"
                  accept=".pem,.key,.ppk,*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const privateKey = event.target?.result as string;
                        setConnectionDetails({ ...connectionDetails, privateKey });
                      };
                      reader.readAsText(file);
                    }
                  }}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600 file:cursor-pointer"
                />
              </div>
              {connectionDetails.privateKey && (
                <p className="text-green-400 text-sm mt-2">✓ Private key loaded</p>
              )}
            </div>
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">Passphrase (if key is encrypted)</label>
              <input
                type="password"
                value={connectionDetails.passphrase}
                onChange={(e) => setConnectionDetails({ ...connectionDetails, passphrase: e.target.value })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Enter passphrase for encrypted key"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleConnect}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
              >
                Connect
              </button>
              <button
                onClick={() => {
                  setShowConnectionForm(false);
                  setIsRemote(false);
                }}
                className="flex-1 bg-slate-700 text-white font-semibold py-3 rounded-lg hover:bg-slate-600 transition-all"
              >
                Local System
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/20">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-1">System Performance Monitor</h1>
                <p className="text-slate-400">
                  {isRemote ? `Remote: ${systemData.system.hostname} (${connectionDetails.host})` : `Local: ${systemData.system.hostname}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowConnectionForm(true);
                setSystemData(null);
                setCpuHistory([]);
                setMemoryHistory([]);
              }}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              {isRemote ? 'Change Connection' : 'Connect to Remote VM'}
            </button>
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

        {/* Top Processes Table - Like TOP command */}
        {systemData.processes.list && systemData.processes.list.length > 0 && (
          <div className="mt-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-cyan-400" />
              Top Processes (CPU Usage)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-slate-400 font-semibold py-3 px-2">USER</th>
                    <th className="text-left text-slate-400 font-semibold py-3 px-2">PID</th>
                    <th className="text-right text-slate-400 font-semibold py-3 px-2">CPU%</th>
                    <th className="text-right text-slate-400 font-semibold py-3 px-2">MEM%</th>
                    <th className="text-right text-slate-400 font-semibold py-3 px-2">RSS</th>
                    <th className="text-left text-slate-400 font-semibold py-3 px-2">STAT</th>
                    <th className="text-left text-slate-400 font-semibold py-3 px-2">TIME</th>
                    <th className="text-left text-slate-400 font-semibold py-3 px-2">COMMAND</th>
                  </tr>
                </thead>
                <tbody>
                  {systemData.processes.list.map((process, index) => (
                    <tr
                      key={`${process.pid}-${index}`}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-3 px-2 text-cyan-400 font-mono text-sm">{process.user}</td>
                      <td className="py-3 px-2 text-white font-mono text-sm">{process.pid}</td>
                      <td className="py-3 px-2 text-right font-mono text-sm">
                        <span className={`${
                          process.cpu > 50 ? 'text-red-400' :
                          process.cpu > 20 ? 'text-yellow-400' :
                          'text-green-400'
                        } font-semibold`}>
                          {process.cpu.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-sm">
                        <span className={`${
                          process.mem > 10 ? 'text-red-400' :
                          process.mem > 5 ? 'text-yellow-400' :
                          'text-blue-400'
                        } font-semibold`}>
                          {process.mem.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right text-slate-300 font-mono text-sm">
                        {(process.rss / 1024).toFixed(0)}M
                      </td>
                      <td className="py-3 px-2 text-purple-400 font-mono text-sm">{process.stat}</td>
                      <td className="py-3 px-2 text-slate-300 font-mono text-sm">{process.time}</td>
                      <td className="py-3 px-2 text-slate-200 font-mono text-xs truncate max-w-md">
                        {process.command}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-slate-500 text-sm flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span> Low usage
              <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full ml-3"></span> Medium usage
              <span className="inline-block w-2 h-2 bg-red-400 rounded-full ml-3"></span> High usage
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
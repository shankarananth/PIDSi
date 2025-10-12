'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, Settings } from 'lucide-react';
import { SimulationEngine, SimulationData } from '@/lib/SimulationEngine';
import { PidAlgorithm, ControlMode, PidParameters } from '@/lib/PidController';
import { ProcessParameters } from '@/lib/FirstOrderProcess';
import RealtimeChart from './RealtimeChart';
import ControlPanel from './ControlPanel';
import MetricsPanel from './MetricsPanel';

const PidSimulator: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [simulationData, setSimulationData] = useState<SimulationData[]>([]);
  const [currentSetpoint, setCurrentSetpoint] = useState(50);
  const [showSettings, setShowSettings] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  
  // Chart scale settings
  const [chartScales, setChartScales] = useState({
    timeRange: 60,
    yMin: undefined as number | undefined,
    yMax: undefined as number | undefined,
    cvMin: 0,
    cvMax: 100,
  });
  
  // Simulation engine
  const engineRef = useRef<SimulationEngine | null>(null);
  
  // PID Parameters - Optimized for first-order process (K=1, Tau=10s, Td=2s)
  const [pidParams, setPidParams] = useState<PidParameters>({
    kp: 0.6,    // Conservative proportional gain
    ti: 12.0,   // Integral time = 1.2 * time constant (Cohen-Coon tuning)
    td: 0.0,    // No derivative action by default
    outputMin: 0,
    outputMax: 100,
    algorithm: PidAlgorithm.BasicPID,
    mode: ControlMode.Auto,
    manualOutput: 50
  });
  
  // Process Parameters
  const [processParams, setProcessParams] = useState<ProcessParameters>({
    gain: 1.0,
    timeConstant: 10.0,
    deadTime: 2.0,
    disturbanceLevel: 0.0,
    noiseLevel: 0.0
  });

  // Initialize simulation engine
  useEffect(() => {
    engineRef.current = new SimulationEngine(
      pidParams,
      processParams,
      {
        deltaTime: 0.1,
        maxDataPoints: 3000,
        updateInterval: 100
      },
      {
        onDataUpdate: (data) => setSimulationData([...data]),
        onStateChange: (running) => {
          const state = engineRef.current?.getSimulationState();
          setIsRunning(state?.isRunning ?? false);
          setIsPaused(state?.isPaused ?? false);
        },
        onError: (error) => {
          console.error('Simulation error:', error);
          setIsRunning(false);
          setIsPaused(false);
        }
      }
    );

    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
    };
  }, []);

  // Update parameters when they change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updatePidParameters(pidParams);
    }
  }, [pidParams]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateProcessParameters(processParams);
    }
  }, [processParams]);

  // Control functions
  const handleStart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.start();
    }
  }, []);

  const handlePause = useCallback(() => {
    if (engineRef.current) {
      if (isPaused) {
        engineRef.current.resume();
      } else {
        engineRef.current.pause();
      }
    }
  }, [isPaused]);

  const handleStop = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
  }, []);

  const handleReset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
      setSimulationData([]);
    }
  }, []);

  const handleSetpointChange = useCallback((value: number, rampRate: number = 0) => {
    setCurrentSetpoint(value);
    if (engineRef.current) {
      engineRef.current.setSetpoint(value, rampRate);
    }
  }, []);

  const handleModeChange = useCallback((mode: ControlMode) => {
    setPidParams(prev => ({ ...prev, mode }));
    if (engineRef.current) {
      engineRef.current.setControlMode(mode);
    }
  }, []);

  const handleDisturbance = useCallback((magnitude: number) => {
    if (engineRef.current) {
      engineRef.current.applyStepDisturbance(magnitude);
    }
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setSimulationSpeed(speed);
    if (engineRef.current) {
      engineRef.current.setSimulationSpeed(speed);
    }
  }, []);

  const latestData = simulationData.length > 0 ? simulationData[simulationData.length - 1] : null;
  const performanceMetrics = engineRef.current?.getPerformanceMetrics() || {
    settlingTime: null,
    overshoot: null,
    steadyStateError: null,
    riseTime: null
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Main Chart Area */}
      <div className="xl:col-span-3 space-y-4">
        {/* Control Buttons */}
        <div className="control-panel p-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleStart}
                disabled={isRunning && !isPaused}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                Start
              </button>
              
              <button
                onClick={handlePause}
                disabled={!isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Pause className="w-4 h-4" />
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              
              <button
                onClick={handleStop}
                disabled={!isRunning && !isPaused}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
              
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Simulation Speed Control */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Speed:</span>
                <div className="flex gap-1">
                  {[0.5, 1, 2, 5, 10].map(speed => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        simulationSpeed === speed
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm font-medium">
                Status: 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  isRunning 
                    ? (isPaused ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800')
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {isRunning ? (isPaused ? 'Paused' : 'Running') : 'Stopped'}
                </span>
              </div>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Chart Scale Settings */}
        {showSettings && (
          <div className="glass-card p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Chart Scale Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time Range (seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="1800"
                  step="10"
                  value={chartScales.timeRange}
                  onChange={(e) => setChartScales(prev => ({ 
                    ...prev, 
                    timeRange: Number(e.target.value) || 60 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  PV/SP Min
                </label>
                <input
                  type="number"
                  step="1"
                  value={chartScales.yMin || ''}
                  placeholder="Auto"
                  onChange={(e) => setChartScales(prev => ({ 
                    ...prev, 
                    yMin: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  PV/SP Max
                </label>
                <input
                  type="number"
                  step="1"
                  value={chartScales.yMax || ''}
                  placeholder="Auto"
                  onChange={(e) => setChartScales(prev => ({ 
                    ...prev, 
                    yMax: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setChartScales(prev => ({ 
                    ...prev, 
                    yMin: undefined, 
                    yMax: undefined 
                  }))}
                  className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 
                             text-gray-700 dark:text-gray-300 rounded transition-colors"
                >
                  Auto Y
                </button>
                <button
                  onClick={() => setChartScales({ 
                    timeRange: 60, 
                    yMin: undefined, 
                    yMax: undefined, 
                    cvMin: 0, 
                    cvMax: 100 
                  })}
                  className="px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Chart */}
        <div className="glass-card p-6">
          <div className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                Real-time Trends
              </h2>
              
              {/* Chart Scale Controls */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 dark:text-gray-400">Time:</label>
                  <select
                    value={chartScales.timeRange}
                    onChange={(e) => setChartScales(prev => ({ ...prev, timeRange: Number(e.target.value) }))}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value={30}>30s</option>
                    <option value={60}>60s</option>
                    <option value={120}>2min</option>
                    <option value={300}>5min</option>
                    <option value={600}>10min</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 dark:text-gray-400">Y-Scale:</label>
                  <button
                    onClick={() => setChartScales(prev => ({ 
                      ...prev, 
                      yMin: prev.yMin === undefined ? 0 : undefined,
                      yMax: prev.yMax === undefined ? 100 : undefined
                    }))}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      chartScales.yMin !== undefined 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {chartScales.yMin !== undefined ? 'Fixed' : 'Auto'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Process Variable (PV)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded border-2 border-red-500" style={{borderStyle: 'dashed'}}></div>
                <span>Setpoint (SP)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Controller Output (CV)</span>
              </div>
            </div>
          </div>
          
          <RealtimeChart 
            data={simulationData} 
            height={400}
            timeRange={chartScales.timeRange}
            yMin={chartScales.yMin}
            yMax={chartScales.yMax}
            cvMin={chartScales.cvMin}
            cvMax={chartScales.cvMax}
            onScaleChange={(scales) => setChartScales(prev => ({ ...prev, ...scales }))}
          />
        </div>

        {/* Performance Metrics */}
        <MetricsPanel 
          metrics={performanceMetrics}
          latestData={latestData}
          isRunning={isRunning}
        />
      </div>

      {/* Control Panel Sidebar */}
      <div className="xl:col-span-1">
        <ControlPanel
          pidParams={pidParams}
          processParams={processParams}
          currentSetpoint={currentSetpoint}
          onPidParamsChange={setPidParams}
          onProcessParamsChange={setProcessParams}
          onSetpointChange={handleSetpointChange}
          onModeChange={handleModeChange}
          onDisturbance={handleDisturbance}
          latestData={latestData}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
        />
      </div>
    </div>
  );
};

export default PidSimulator;
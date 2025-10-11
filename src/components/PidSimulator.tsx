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
  
  // Simulation engine
  const engineRef = useRef<SimulationEngine | null>(null);
  
  // PID Parameters
  const [pidParams, setPidParams] = useState<PidParameters>({
    kp: 2.0,
    ki: 0.5,
    kd: 0.1,
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
    disturbanceLevel: 0.1,
    noiseLevel: 0.01
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
          setIsRunning(running);
          setIsPaused(!running && (engineRef.current?.getSimulationState().isRunning ?? false));
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

        {/* Real-time Chart */}
        <div className="glass-card p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Real-time Trends
            </h2>
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
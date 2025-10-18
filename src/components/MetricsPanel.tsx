'use client';

import React from 'react';
import { TrendingUp, Clock, Target, AlertCircle } from 'lucide-react';
import { SimulationData, PerformanceMetrics } from '@/lib/SimulationEngine';

interface MetricsPanelProps {
  metrics: PerformanceMetrics;
  latestData: SimulationData | null;
  isRunning: boolean;
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  latestData,
  isRunning
}) => {
  const MetricCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number | null;
    unit: string;
    description: string;
    colorClass: string;
  }> = ({ icon, label, value, unit, description, colorClass }) => (
    <div className={`metric-card ${colorClass}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="font-semibold text-sm">{label}</h3>
      </div>
      <div className="text-2xl font-bold mb-1">
        {value !== null ? (
          <>
            {value.toFixed(2)}
            <span className="text-sm font-normal ml-1">{unit}</span>
          </>
        ) : (
          <span className="text-gray-400 text-lg">--</span>
        )}
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  );

  const getPerformanceStatus = () => {
    if (!latestData) return { status: 'No Data', color: 'text-gray-500' };
    
    const error = Math.abs(latestData.error);
    
    if (error < 1.0) {
      return { status: 'Excellent Control', color: 'text-green-600' };
    } else if (error < 5.0) {
      return { status: 'Good Control', color: 'text-blue-600' };
    } else if (error < 10.0) {
      return { status: 'Fair Control', color: 'text-yellow-600' };
    } else {
      return { status: 'Poor Control', color: 'text-red-600' };
    }
  };

  const performanceStatus = getPerformanceStatus();

  return (
    <div className="space-y-4">
      {/* Performance Summary */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Performance Metrics
          </h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isRunning ? 'Live' : 'Stopped'}
            </span>
          </div>
        </div>
        
        <div className="text-center mb-4">
          <div className={`text-lg font-semibold ${performanceStatus.color}`}>
            {performanceStatus.status}
          </div>
          {latestData && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Current Error: {Math.abs(latestData.error).toFixed(2)}
            </div>
          )}
        </div>
      </div>

      {/* Step Response Metrics */}
      <div className="glass-card p-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Step Response Metrics
        </h3>
        
        {/* Show hint if no step metrics available */}
        {!metrics.riseTime && !metrics.overshoot && !metrics.settlingTime && !metrics.steadyStateError && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span className="font-medium">Step Response Analysis</span>
            </div>
            <p>Change the setpoint while the simulation is running to analyze step response characteristics.</p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            icon={<Clock className="w-4 h-4 text-blue-600" />}
            label="Rise Time"
            value={metrics.riseTime}
            unit="s"
            description="Time to reach 10% to 90% of final value"
            colorClass="border-blue-200 dark:border-blue-700"
          />
          
          <MetricCard
            icon={<TrendingUp className="w-4 h-4 text-green-600" />}
            label="Overshoot"
            value={metrics.overshoot}
            unit="%"
            description="Maximum overshoot beyond setpoint"
            colorClass="border-green-200 dark:border-green-700"
          />
          
          <MetricCard
            icon={<Target className="w-4 h-4 text-purple-600" />}
            label="Settling Time"
            value={metrics.settlingTime}
            unit="s"
            description="Time to settle within 2% of final value"
            colorClass="border-purple-200 dark:border-purple-700"
          />
          
          <MetricCard
            icon={<AlertCircle className="w-4 h-4 text-orange-600" />}
            label="SS Error"
            value={metrics.steadyStateError}
            unit=""
            description="Steady-state error"
            colorClass="border-orange-200 dark:border-orange-700"
          />
        </div>
      </div>

      {/* Integral Performance Metrics */}
      <div className="glass-card p-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Integral Performance Metrics
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            icon={<TrendingUp className="w-4 h-4 text-red-600" />}
            label="IAE"
            value={metrics.iae || 0}
            unit=""
            description="Integral Absolute Error"
            colorClass="border-red-200 dark:border-red-700"
          />
          
          <MetricCard
            icon={<TrendingUp className="w-4 h-4 text-yellow-600" />}
            label="ISE"
            value={metrics.ise || 0}
            unit=""
            description="Integral Square Error"
            colorClass="border-yellow-200 dark:border-yellow-700"
          />
          
          <MetricCard
            icon={<Clock className="w-4 h-4 text-indigo-600" />}
            label="ITAE"
            value={metrics.itae || 0}
            unit=""
            description="Integral Time Absolute Error"
            colorClass="border-indigo-200 dark:border-indigo-700"
          />
        </div>
      </div>

      {/* Control Effort & Statistics */}
      <div className="glass-card p-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Control Effort & Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="font-semibold text-gray-700 dark:text-gray-300">Total Variation</div>
            <div className="text-lg font-mono font-bold text-gray-900 dark:text-gray-100">
              {(metrics.totalVariation || 0).toFixed(1)}
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="font-semibold text-gray-700 dark:text-gray-300">CV Range</div>
            <div className="text-lg font-mono font-bold text-gray-900 dark:text-gray-100">
              {(metrics.minOutput || 0).toFixed(1)} - {(metrics.maxOutput || 0).toFixed(1)}%
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="font-semibold text-gray-700 dark:text-gray-300">Error σ</div>
            <div className="text-lg font-mono font-bold text-gray-900 dark:text-gray-100">
              {(metrics.errorStdDev || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Control Quality Assessment */}
      {latestData && (
        <div className="glass-card p-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Control Quality Assessment
          </h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Response Speed:</span>
              <span className={
                metrics.riseTime === null ? 'text-gray-500' :
                metrics.riseTime < 5 ? 'text-green-600' :
                metrics.riseTime < 15 ? 'text-yellow-600' : 'text-red-600'
              }>
                {metrics.riseTime === null ? 'N/A' :
                 metrics.riseTime < 5 ? 'Fast' :
                 metrics.riseTime < 15 ? 'Medium' : 'Slow'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Stability:</span>
              <span className={
                metrics.overshoot === null ? 'text-gray-500' :
                metrics.overshoot < 5 ? 'text-green-600' :
                metrics.overshoot < 25 ? 'text-yellow-600' : 'text-red-600'
              }>
                {metrics.overshoot === null ? 'N/A' :
                 metrics.overshoot < 5 ? 'Excellent' :
                 metrics.overshoot < 25 ? 'Acceptable' : 'Poor'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Accuracy:</span>
              <span className={
                metrics.steadyStateError === null ? 'text-gray-500' :
                metrics.steadyStateError < 1 ? 'text-green-600' :
                metrics.steadyStateError < 5 ? 'text-yellow-600' : 'text-red-600'
              }>
                {metrics.steadyStateError === null ? 'N/A' :
                 metrics.steadyStateError < 1 ? 'Excellent' :
                 metrics.steadyStateError < 5 ? 'Good' : 'Poor'}
              </span>
            </div>
            
            {/* Controller Output Health */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Output Health:</span>
              <span className={
                latestData.controllerOutput < 5 || latestData.controllerOutput > 95 
                  ? 'text-red-600' 
                  : latestData.controllerOutput < 15 || latestData.controllerOutput > 85 
                  ? 'text-yellow-600' 
                  : 'text-green-600'
              }>
                {latestData.controllerOutput < 5 || latestData.controllerOutput > 95 
                  ? 'Saturated' 
                  : latestData.controllerOutput < 15 || latestData.controllerOutput > 85 
                  ? 'Near Limits' 
                  : 'Normal'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tuning Suggestions */}
      {latestData && (
        <div className="glass-card p-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Tuning Recommendations
          </h3>
          
          <div className="text-sm space-y-2">
            {/* Step Response Based Recommendations */}
            {metrics.overshoot !== null && metrics.overshoot > 15 && (
              <div className="flex items-start gap-2 text-orange-700 dark:text-orange-300">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>High overshoot ({metrics.overshoot.toFixed(1)}%). Reduce Kp or increase Kd.</span>
              </div>
            )}
            
            {metrics.riseTime !== null && metrics.riseTime > 20 && (
              <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Slow response ({metrics.riseTime.toFixed(1)}s rise time). Increase Kp or Ki.</span>
              </div>
            )}
            
            {metrics.steadyStateError !== null && metrics.steadyStateError > 2 && (
              <div className="flex items-start gap-2 text-red-700 dark:text-red-300">
                <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>High steady-state error ({metrics.steadyStateError.toFixed(2)}). Increase Ki.</span>
              </div>
            )}
            
            {/* Real-time Performance Based Recommendations */}
            {Math.abs(latestData.error) > 5 && (
              <div className="flex items-start gap-2 text-yellow-700 dark:text-yellow-300">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Large error ({latestData.error.toFixed(1)}). Check PID parameters or process disturbances.</span>
              </div>
            )}
            
            {metrics.errorStdDev > 2 && (
              <div className="flex items-start gap-2 text-orange-700 dark:text-orange-300">
                <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>High error variation (σ={metrics.errorStdDev.toFixed(2)}). Consider reducing Kd or adding filtering.</span>
              </div>
            )}
            
            {latestData.controllerOutput > 95 && (
              <div className="flex items-start gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Controller output saturated at maximum. Check setpoint feasibility.</span>
              </div>
            )}
            
            {latestData.controllerOutput < 5 && (
              <div className="flex items-start gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Controller output saturated at minimum. Check setpoint feasibility.</span>
              </div>
            )}
            
            {/* Good Performance Messages */}
            {metrics.overshoot !== null && metrics.overshoot < 5 && 
             metrics.riseTime !== null && metrics.riseTime < 10 && 
             metrics.steadyStateError !== null && metrics.steadyStateError < 1 && (
              <div className="flex items-start gap-2 text-green-700 dark:text-green-300">
                <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Excellent step response! Overshoot: {metrics.overshoot.toFixed(1)}%, Rise: {metrics.riseTime.toFixed(1)}s</span>
              </div>
            )}
            
            {Math.abs(latestData.error) < 1 && metrics.errorStdDev < 0.5 && (
              <div className="flex items-start gap-2 text-green-700 dark:text-green-300">
                <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Good control performance! Low error and stable response.</span>
              </div>
            )}
            
            {/* General Recommendations when no step data */}
            {!metrics.overshoot && !metrics.riseTime && !metrics.settlingTime && (
              <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Make a setpoint change to get detailed step response tuning recommendations.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsPanel;
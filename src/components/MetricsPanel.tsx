'use client';

import React from 'react';
import { TrendingUp, Clock, Target, AlertCircle } from 'lucide-react';
import { SimulationData } from '@/lib/SimulationEngine';

interface MetricsPanelProps {
  metrics: {
    settlingTime: number | null;
    overshoot: number | null;
    steadyStateError: number | null;
    riseTime: number | null;
  };
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

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            Tuning Suggestions
          </h3>
          
          <div className="text-sm space-y-2">
            {metrics.overshoot !== null && metrics.overshoot > 15 && (
              <div className="flex items-start gap-2 text-orange-700 dark:text-orange-300">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>High overshoot detected. Consider reducing Kp or increasing Kd.</span>
              </div>
            )}
            
            {metrics.riseTime !== null && metrics.riseTime > 20 && (
              <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Slow response. Consider increasing Kp or Ki.</span>
              </div>
            )}
            
            {metrics.steadyStateError !== null && metrics.steadyStateError > 2 && (
              <div className="flex items-start gap-2 text-red-700 dark:text-red-300">
                <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>High steady-state error. Consider increasing Ki.</span>
              </div>
            )}
            
            {latestData.controllerOutput > 95 && (
              <div className="flex items-start gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Controller output saturated at maximum. Check setpoint or process.</span>
              </div>
            )}
            
            {latestData.controllerOutput < 5 && (
              <div className="flex items-start gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Controller output saturated at minimum. Check setpoint or process.</span>
              </div>
            )}
            
            {/* Show good performance message */}
            {metrics.overshoot !== null && metrics.overshoot < 5 && 
             metrics.riseTime !== null && metrics.riseTime < 10 && 
             metrics.steadyStateError !== null && metrics.steadyStateError < 1 && (
              <div className="flex items-start gap-2 text-green-700 dark:text-green-300">
                <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Excellent tuning! The controller shows good performance characteristics.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsPanel;
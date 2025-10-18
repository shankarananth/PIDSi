'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Zap, Target, Sliders } from 'lucide-react';
import { PidAlgorithm, ControlMode, PidParameters, AntiWindupMethod } from '@/lib/PidController';
import { ProcessParameters } from '@/lib/FirstOrderProcess';
import { SimulationData } from '@/lib/SimulationEngine';

interface ControlPanelProps {
  pidParams: PidParameters;
  processParams: ProcessParameters;
  currentSetpoint: number;
  onPidParamsChange: (params: PidParameters) => void;
  onProcessParamsChange: (params: ProcessParameters) => void;
  onSetpointChange: (value: number, rampRate?: number) => void;
  onModeChange: (mode: ControlMode) => void;
  onDisturbance: (magnitude: number) => void;
  latestData: SimulationData | null;
  showSettings: boolean;
  onToggleSettings: () => void;
  isRunning: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  pidParams,
  processParams,
  currentSetpoint,
  onPidParamsChange,
  onProcessParamsChange,
  onSetpointChange,
  onModeChange,
  onDisturbance,
  latestData,
  showSettings,
  isRunning,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    setpoint: true,
    pid: true,
    process: true,
    disturbance: false,
  });

  const [setpointInput, setSetpointInput] = useState(currentSetpoint.toString());
  const [rampRate, setRampRate] = useState('0');

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSetpointSubmit = () => {
    const value = parseFloat(setpointInput);
    const ramp = parseFloat(rampRate);
    if (!isNaN(value) && !isNaN(ramp)) {
      onSetpointChange(value, ramp);
    }
  };

  const handleQuickSetpoint = (value: number) => {
    setSetpointInput(value.toString());
    onSetpointChange(value, 0);
  };

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    sectionKey: keyof typeof expandedSections,
    children: React.ReactNode
  ) => (
    <div className="control-panel mb-4">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        </div>
        {expandedSections[sectionKey] ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      
      {expandedSections[sectionKey] && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-600">
          {children}
        </div>
      )}
    </div>
  );

  const InputField: React.FC<{
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    onBlur?: () => void;
    type?: 'number' | 'text';
    step?: string;
    min?: string;
    max?: string;
    unit?: string;
  }> = ({ label, value, onChange, onBlur, type = 'number', step, min, max, unit }) => (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {unit && <span className="text-gray-500 ml-1">({unit})</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        step={step}
        min={min}
        max={max}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      />
    </div>
  );

  const SelectField: React.FC<{
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }> = ({ label, value, options, onChange }) => (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* DCS-Style Process Display */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-300 shadow-xl">
        <div className="bg-gray-200 rounded-t-lg px-3 py-1 mb-3">
          <h2 className="text-sm font-bold text-green-700 uppercase tracking-wide">
            PID LOOP - TC001
          </h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Process Variable */}
          <div className="bg-white rounded-lg p-3 border border-gray-300 shadow-sm">
            <div className="text-xs text-blue-700 uppercase mb-1 font-semibold">Process Variable</div>
            <div className="text-2xl font-mono font-bold text-blue-600">
              {latestData?.processValue?.toFixed(1) || '0.0'}
            </div>
            <div className="text-xs text-gray-600">°C</div>
          </div>
          
          {/* Setpoint */}
          <div className="bg-white rounded-lg p-3 border border-gray-300 shadow-sm">
            <div className="text-xs text-red-700 uppercase mb-1 font-semibold">Setpoint</div>
            <div className="text-2xl font-mono font-bold text-red-600">
              {latestData?.setpoint?.toFixed(1) || '0.0'}
            </div>
            <div className="text-xs text-gray-600">°C</div>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-4">
          {/* Controller Output */}
          <div className="bg-white rounded-lg p-3 border border-gray-300 shadow-sm">
            <div className="text-xs text-green-700 uppercase mb-1 font-semibold">Output</div>
            <div className="text-xl font-mono font-bold text-green-600">
              {latestData?.controllerOutput?.toFixed(1) || '0.0'}
            </div>
            <div className="text-xs text-gray-600">%</div>
          </div>
          
          {/* Error */}
          <div className="bg-white rounded-lg p-3 border border-gray-300 shadow-sm">
            <div className="text-xs text-yellow-700 uppercase mb-1 font-semibold">Error</div>
            <div className={`text-xl font-mono font-bold ${
              Math.abs(latestData?.error || 0) > 1 ? 'text-yellow-600' : 'text-gray-500'
            }`}>
              {latestData?.error?.toFixed(1) || '0.0'}
            </div>
            <div className="text-xs text-gray-600">°C</div>
          </div>
        </div>
        
        {/* Status Indicators */}
        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              pidParams.mode === 'Auto' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <span className="text-xs text-gray-700 font-medium">
              {pidParams.mode === 'Auto' ? 'AUTO' : 'MANUAL'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isRunning ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-gray-700 font-medium">
              {isRunning ? 'ACTIVE' : 'STOPPED'}
            </span>
          </div>
          
          <div className="text-xs text-gray-600 font-medium">
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Setpoint Control */}
      {renderSection(
        'Setpoint Control',
        <Target className="w-4 h-4 text-blue-600" />,
        'setpoint',
        <div>
          <InputField
            label="Setpoint Value"
            value={setpointInput}
            onChange={setSetpointInput}
            onBlur={handleSetpointSubmit}
            step="0.1"
          />
          
          <InputField
            label="Ramp Rate"
            value={rampRate}
            onChange={setRampRate}
            step="0.1"
            min="0"
            unit="units/sec"
          />
          
          <button
            onClick={handleSetpointSubmit}
            className="w-full mb-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Apply Setpoint
          </button>
          
          <div className="grid grid-cols-3 gap-2 text-sm">
            {[0, 25, 50, 75, 100].map(value => (
              <button
                key={value}
                onClick={() => handleQuickSetpoint(value)}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 
                           text-gray-700 dark:text-gray-300 rounded transition-colors"
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PID Parameters */}
      {renderSection(
        'PID Controller',
        <Sliders className="w-4 h-4 text-green-600" />,
        'pid',
        <div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Control Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onModeChange(ControlMode.Auto)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pidParams.mode === ControlMode.Auto
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300'
                }`}
              >
                Automatic
              </button>
              <button
                onClick={() => onModeChange(ControlMode.Manual)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pidParams.mode === ControlMode.Manual
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300'
                }`}
              >
                Manual
              </button>
            </div>
          </div>
          
          <SelectField
            label="Algorithm"
            value={pidParams.algorithm}
            options={[
              { value: PidAlgorithm.BasicPID, label: 'Basic PID (fast, has kicks)' },
              { value: PidAlgorithm.I_PD, label: 'I-PD (smooth, no kicks)' },
              { value: PidAlgorithm.PI_D, label: 'PI-D (no derivative kick)' }
            ]}
            onChange={(value) => onPidParamsChange({
              ...pidParams,
              algorithm: value as PidAlgorithm
            })}
          />
          
          <InputField
            label="Proportional Gain (Kp)"
            value={pidParams.kp}
            onChange={(value) => onPidParamsChange({
              ...pidParams,
              kp: parseFloat(value) || 0
            })}
            step="0.1"
            min="0"
          />
          
          <InputField
            label="Integral Time (Ti)"
            value={pidParams.ti}
            onChange={(value) => onPidParamsChange({
              ...pidParams,
              ti: parseFloat(value) || 0
            })}
            step="0.1"
            min="0"
            unit="sec"
          />
          
          <InputField
            label="Derivative Time (Td)"
            value={pidParams.td}
            onChange={(value) => onPidParamsChange({
              ...pidParams,
              td: parseFloat(value) || 0
            })}
            step="0.1"
            min="0"
            unit="sec"
          />
          
          {pidParams.mode === ControlMode.Manual && (
            <InputField
              label="Manual Output"
              value={pidParams.manualOutput}
              onChange={(value) => onPidParamsChange({
                ...pidParams,
                manualOutput: parseFloat(value) || 0
              })}
              step="1"
              min="0"
              max="100"
              unit="%"
            />
          )}
          
          <SelectField
            label="Anti-Windup Method"
            value={pidParams.antiWindup}
            options={[
              { value: AntiWindupMethod.None, label: 'None' },
              { value: AntiWindupMethod.Clamping, label: 'Clamping' },
              { value: AntiWindupMethod.ConditionalIntegration, label: 'Conditional Integration' },
              { value: AntiWindupMethod.BackCalculation, label: 'Back Calculation' }
            ]}
            onChange={(value) => onPidParamsChange({
              ...pidParams,
              antiWindup: value as AntiWindupMethod
            })}
          />
          
          {(pidParams.antiWindup === AntiWindupMethod.ConditionalIntegration || 
            pidParams.antiWindup === AntiWindupMethod.BackCalculation) && (
            <div className="grid grid-cols-2 gap-2">
              <InputField
                label="Windup Limit"
                value={pidParams.windupLimit}
                onChange={(value) => onPidParamsChange({
                  ...pidParams,
                  windupLimit: parseFloat(value) || 0
                })}
                step="0.01"
                min="0"
                max="1"
              />
              {pidParams.antiWindup === AntiWindupMethod.BackCalculation && (
                <InputField
                  label="Tracking Gain (Kt)"
                  value={pidParams.trackingGain}
                  onChange={(value) => onPidParamsChange({
                    ...pidParams,
                    trackingGain: parseFloat(value) || 0
                  })}
                  step="0.1"
                  min="0"
                />
              )}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <InputField
              label="Output Min"
              value={pidParams.outputMin}
              onChange={(value) => onPidParamsChange({
                ...pidParams,
                outputMin: parseFloat(value) || 0
              })}
              step="1"
              unit="%"
            />
            <InputField
              label="Output Max"
              value={pidParams.outputMax}
              onChange={(value) => onPidParamsChange({
                ...pidParams,
                outputMax: parseFloat(value) || 100
              })}
              step="1"
              unit="%"
            />
          </div>
        </div>
      )}

      {/* Process Parameters */}
      {renderSection(
        'Process Model',
        <Target className="w-4 h-4 text-purple-600" />,
        'process',
        <div>
          <InputField
            label="Process Gain (K)"
            value={processParams.gain}
            onChange={(value) => onProcessParamsChange({
              ...processParams,
              gain: parseFloat(value) || 1
            })}
            step="0.1"
            min="0"
          />
          
          <InputField
            label="Time Constant (τ)"
            value={processParams.timeConstant}
            onChange={(value) => onProcessParamsChange({
              ...processParams,
              timeConstant: parseFloat(value) || 1
            })}
            step="1"
            min="0.1"
            unit="sec"
          />
          
          <InputField
            label="Dead Time (Td)"
            value={processParams.deadTime}
            onChange={(value) => onProcessParamsChange({
              ...processParams,
              deadTime: parseFloat(value) || 0
            })}
            step="0.1"
            min="0"
            unit="sec"
          />
          
          <InputField
            label="Disturbance Level"
            value={processParams.disturbanceLevel}
            onChange={(value) => onProcessParamsChange({
              ...processParams,
              disturbanceLevel: parseFloat(value) || 0
            })}
            step="0.01"
            min="0"
            max="1"
          />
          
          <InputField
            label="Noise Level"
            value={processParams.noiseLevel}
            onChange={(value) => onProcessParamsChange({
              ...processParams,
              noiseLevel: parseFloat(value) || 0
            })}
            step="0.001"
            min="0"
            max="0.1"
          />
        </div>
      )}

      {/* Test Disturbances */}
      {renderSection(
        'Test Disturbances & Noise',
        <Zap className="w-4 h-4 text-orange-600" />,
        'disturbance',
        <div>
          {/* Step Disturbances */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Step Disturbances
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Apply temporary step changes to the process to test controller response
            </p>
            
            <div className="grid grid-cols-4 gap-2">
              {[-10, -5, -2, -1, 1, 2, 5, 10].map(magnitude => (
                <button
                  key={magnitude}
                  onClick={() => onDisturbance(magnitude)}
                  className={`px-2 py-1.5 text-xs rounded transition-colors ${
                    magnitude < 0 
                      ? 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-800/40 dark:text-red-300'
                      : 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-800/40 dark:text-green-300'
                  }`}
                >
                  {magnitude > 0 ? '+' : ''}{magnitude}
                </button>
              ))}
            </div>
          </div>

          {/* Continuous Disturbances & Noise */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Continuous Disturbances & Noise
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Adjust continuous disturbance and measurement noise levels (configured in Process Model section)
            </p>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span className="font-medium">Disturbance Level:</span>
                <br />
                <span className="text-gray-600 dark:text-gray-400">
                  {(processParams.disturbanceLevel * 100).toFixed(1)}% of process output
                </span>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span className="font-medium">Noise Level:</span>
                <br />
                <span className="text-gray-600 dark:text-gray-400">
                  {(processParams.noiseLevel * 100).toFixed(2)}% measurement noise
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
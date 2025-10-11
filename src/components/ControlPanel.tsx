'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Zap, Target, Sliders } from 'lucide-react';
import { PidAlgorithm, ControlMode, PidParameters } from '@/lib/PidController';
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
      {/* Current Values Display */}
      <div className="glass-card p-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Current Values
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">PV:</span>
            <span className="font-mono font-medium">
              {latestData?.processValue?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">SP:</span>
            <span className="font-mono font-medium">
              {latestData?.setpoint?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">CV:</span>
            <span className="font-mono font-medium">
              {latestData?.controllerOutput?.toFixed(2) || '0.00'}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Error:</span>
            <span className="font-mono font-medium">
              {latestData?.error?.toFixed(2) || '0.00'}
            </span>
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
          <SelectField
            label="Control Mode"
            value={pidParams.mode}
            options={[
              { value: ControlMode.Auto, label: 'Automatic' },
              { value: ControlMode.Manual, label: 'Manual' }
            ]}
            onChange={(value) => onModeChange(value as ControlMode)}
          />
          
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
            label="Integral Gain (Ki)"
            value={pidParams.ki}
            onChange={(value) => onPidParamsChange({
              ...pidParams,
              ki: parseFloat(value) || 0
            })}
            step="0.01"
            min="0"
          />
          
          <InputField
            label="Derivative Gain (Kd)"
            value={pidParams.kd}
            onChange={(value) => onPidParamsChange({
              ...pidParams,
              kd: parseFloat(value) || 0
            })}
            step="0.01"
            min="0"
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

      {/* Disturbance */}
      {renderSection(
        'Disturbances',
        <Zap className="w-4 h-4 text-orange-600" />,
        'disturbance',
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Apply step disturbances to test controller response
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            {[-10, -5, -2, -1, 1, 2, 5, 10].map(magnitude => (
              <button
                key={magnitude}
                onClick={() => onDisturbance(magnitude)}
                className={`px-3 py-2 text-sm rounded transition-colors ${
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
      )}
    </div>
  );
};

export default ControlPanel;
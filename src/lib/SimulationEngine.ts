/**
 * PID Simulation Engine
 * Coordinates the PID controller and process model for real-time simulation
 */

import { PidController, PidParameters, ControlMode } from './PidController';
import { FirstOrderProcess, ProcessParameters } from './FirstOrderProcess';

export interface SimulationData {
  time: number;
  setpoint: number;
  processValue: number;
  controllerOutput: number;
  error: number;
  disturbance: number;
}

export interface SimulationConfig {
  deltaTime: number;      // Simulation time step (seconds)
  maxDataPoints: number;  // Maximum number of data points to store
  updateInterval: number; // UI update interval (milliseconds)
}

export interface SimulationCallbacks {
  onDataUpdate?: (data: SimulationData[]) => void;
  onStateChange?: (isRunning: boolean) => void;
  onError?: (error: Error) => void;
}

export class SimulationEngine {
  private pidController: PidController;
  private process: FirstOrderProcess;
  private config: SimulationConfig;
  private callbacks: SimulationCallbacks;
  
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private simulationTime: number = 0;
  private dataHistory: SimulationData[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  
  private setpoint: number = 50;
  private targetSetpoint: number = 50;
  private setpointRampRate: number = 0; // units per second for setpoint ramping
  private speedMultiplier: number = 1; // Simulation speed multiplier

  constructor(
    pidParams: Partial<PidParameters> = {},
    processParams: Partial<ProcessParameters> = {},
    config: Partial<SimulationConfig> = {},
    callbacks: SimulationCallbacks = {}
  ) {
    this.config = {
      deltaTime: 0.1,           // 100ms simulation steps
      maxDataPoints: 3000,      // 5 minutes at 100ms steps
      updateInterval: 100,      // Update UI every 100ms
      ...config
    };

    this.pidController = new PidController(pidParams, this.config.deltaTime);
    this.process = new FirstOrderProcess(processParams, this.config.deltaTime);
    this.callbacks = callbacks;
    
    // Initialize process at steady state (setpoint value)
    this.process.setInitialOutput(this.setpoint);
  }

  /**
   * Start the simulation
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.isPaused = false;
    
    // Reset time if starting fresh
    if (this.dataHistory.length === 0) {
      this.simulationTime = 0;
      
      // Add initial data point at steady state
      const processValue = this.process.getState().output;
      const initialData: SimulationData = {
        time: 0,
        setpoint: this.setpoint,
        processValue,
        controllerOutput: processValue / this.process.getParameters().gain,
        error: this.setpoint - processValue,
        disturbance: 0
      };
      this.dataHistory.push(initialData);
      this.callbacks.onDataUpdate?.(this.dataHistory);
    }

    this.intervalId = setInterval(() => {
      if (!this.isPaused) {
        this.runSimulationStep();
      }
    }, this.config.updateInterval);

    this.callbacks.onStateChange?.(true);
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
      this.callbacks.onStateChange?.(false);
    }
  }

  /**
   * Resume the simulation
   */
  resume(): void {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.callbacks.onStateChange?.(true);
    }
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.callbacks.onStateChange?.(false);
  }

  /**
   * Reset the simulation
   */
  reset(): void {
    const wasRunning = this.isRunning;
    this.stop();
    
    this.simulationTime = 0;
    this.dataHistory = [];
    this.setpoint = this.targetSetpoint;
    
    this.pidController.reset();
    this.process.reset();
    
    // Initialize process at steady state (setpoint value)
    this.process.setInitialOutput(this.setpoint);
    
    this.callbacks.onDataUpdate?.(this.dataHistory);
    
    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Run a single simulation step
   */
  private runSimulationStep(): void {
    try {
      // Calculate steps needed to catch up to real time, adjusted for speed multiplier
      const stepsPerUpdate = Math.max(1, Math.round((this.config.updateInterval * this.speedMultiplier) / (this.config.deltaTime * 1000)));
      
      for (let i = 0; i < stepsPerUpdate; i++) {
        // Update setpoint with ramping
        this.updateSetpoint();
        
        // Get current process value
        const processValue = this.process.getState().output;
        
        // Calculate PID controller output
        const controllerOutput = this.pidController.calculate(this.setpoint, processValue);
        
        // Apply controller output to process
        const newProcessValue = this.process.calculate(controllerOutput);
        
        // Calculate error
        const error = this.setpoint - newProcessValue;
        
        // Store simulation data
        const dataPoint: SimulationData = {
          time: this.simulationTime,
          setpoint: this.setpoint,
          processValue: newProcessValue,
          controllerOutput: controllerOutput,
          error: error,
          disturbance: this.process.getState().disturbance
        };

        this.dataHistory.push(dataPoint);
        
        // Limit data history size
        if (this.dataHistory.length > this.config.maxDataPoints) {
          this.dataHistory.shift();
        }
        
        this.simulationTime += this.config.deltaTime * this.speedMultiplier;
      }

      // Notify callbacks
      this.callbacks.onDataUpdate?.(this.dataHistory);
      
    } catch (error) {
      this.callbacks.onError?.(error as Error);
      this.stop();
    }
  }

  /**
   * Update setpoint with ramping
   */
  private updateSetpoint(): void {
    if (this.setpointRampRate === 0 || this.setpoint === this.targetSetpoint) {
      this.setpoint = this.targetSetpoint;
      return;
    }

    const rampStep = this.setpointRampRate * this.config.deltaTime * this.speedMultiplier;
    const difference = this.targetSetpoint - this.setpoint;
    
    if (Math.abs(difference) <= Math.abs(rampStep)) {
      this.setpoint = this.targetSetpoint;
    } else {
      this.setpoint += Math.sign(difference) * Math.abs(rampStep);
    }
  }

  /**
   * Set new setpoint
   */
  setSetpoint(value: number, rampRate: number = 0): void {
    this.targetSetpoint = value;
    this.setpointRampRate = rampRate;
    
    // If simulation hasn't started yet, initialize process at new setpoint
    if (this.dataHistory.length === 0) {
      this.setpoint = value;
      this.process.setInitialOutput(value);
    }
    
    if (rampRate === 0) {
      this.setpoint = value;
    }
  }

  /**
   * Update PID parameters
   */
  updatePidParameters(params: Partial<PidParameters>): void {
    this.pidController.updateParameters(params);
  }

  /**
   * Update process parameters
   */
  updateProcessParameters(params: Partial<ProcessParameters>): void {
    this.process.updateParameters(params);
  }

  /**
   * Set PID control mode
   */
  setControlMode(mode: ControlMode): void {
    const currentPv = this.dataHistory.length > 0 
      ? this.dataHistory[this.dataHistory.length - 1].processValue 
      : 0;
    
    this.pidController.setMode(mode, currentPv);
  }

  /**
   * Set simulation speed multiplier
   */
  setSimulationSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(10, multiplier)); // Clamp between 0.1x and 10x
  }

  /**
   * Get current simulation speed
   */
  getSimulationSpeed(): number {
    return this.speedMultiplier;
  }

  /**
   * Apply step disturbance to process
   */
  applyStepDisturbance(magnitude: number): void {
    const currentOutput = this.process.getState().internalState;
    this.process.setInitialOutput(currentOutput + magnitude);
  }

  /**
   * Get current simulation state
   */
  getSimulationState() {
    const latestData = this.dataHistory.length > 0 
      ? this.dataHistory[this.dataHistory.length - 1] 
      : null;
    
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      simulationTime: this.simulationTime,
      currentSetpoint: this.setpoint,
      targetSetpoint: this.targetSetpoint,
      pidParameters: this.pidController.getParameters(),
      processParameters: this.process.getParameters(),
      latestData,
      dataCount: this.dataHistory.length
    };
  }

  /**
   * Get data history
   */
  getDataHistory(): SimulationData[] {
    return [...this.dataHistory];
  }

  /**
   * Get latest simulation data point
   */
  getLatestData(): SimulationData | null {
    return this.dataHistory.length > 0 
      ? this.dataHistory[this.dataHistory.length - 1] 
      : null;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    settlingTime: number | null;
    overshoot: number | null;
    steadyStateError: number | null;
    riseTime: number | null;
  } {
    if (this.dataHistory.length < 10) {
      return {
        settlingTime: null,
        overshoot: null,
        steadyStateError: null,
        riseTime: null
      };
    }

    // Find the last significant setpoint change
    let stepStartIndex = -1;
    const threshold = 0.1;
    
    for (let i = this.dataHistory.length - 1; i >= 10; i--) {
      const currentSP = this.dataHistory[i].setpoint;
      const prevSP = this.dataHistory[i - 10].setpoint;
      
      if (Math.abs(currentSP - prevSP) > threshold) {
        stepStartIndex = i - 10;
        break;
      }
    }

    if (stepStartIndex === -1) {
      return {
        settlingTime: null,
        overshoot: null,
        steadyStateError: null,
        riseTime: null
      };
    }

    const stepData = this.dataHistory.slice(stepStartIndex);
    const finalSetpoint = stepData[stepData.length - 1].setpoint;
    const initialValue = stepData[0].processValue;
    const finalValue = stepData[stepData.length - 1].processValue;
    
    // Calculate overshoot
    const maxValue = Math.max(...stepData.map(d => d.processValue));
    const overshoot = finalSetpoint > initialValue 
      ? Math.max(0, ((maxValue - finalSetpoint) / (finalSetpoint - initialValue)) * 100)
      : Math.max(0, ((finalSetpoint - maxValue) / (initialValue - finalSetpoint)) * 100);

    // Calculate steady-state error
    const steadyStateError = Math.abs(finalSetpoint - finalValue);

    // Calculate rise time (10% to 90% of final value)
    const valueRange = finalSetpoint - initialValue;
    const tenPercent = initialValue + 0.1 * valueRange;
    const ninetyPercent = initialValue + 0.9 * valueRange;
    
    let riseStartTime = null;
    let riseEndTime = null;
    
    for (let i = 0; i < stepData.length; i++) {
      if (riseStartTime === null && stepData[i].processValue >= tenPercent) {
        riseStartTime = stepData[i].time;
      }
      if (riseEndTime === null && stepData[i].processValue >= ninetyPercent) {
        riseEndTime = stepData[i].time;
        break;
      }
    }
    
    const riseTime = (riseStartTime !== null && riseEndTime !== null) 
      ? riseEndTime - riseStartTime 
      : null;

    // Calculate settling time (time to reach within 2% of final value)
    let settlingTime = null;
    const settlingBand = 0.02 * Math.abs(valueRange);
    
    for (let i = stepData.length - 1; i >= 0; i--) {
      if (Math.abs(stepData[i].processValue - finalSetpoint) > settlingBand) {
        settlingTime = stepData[stepData.length - 1].time - stepData[i].time;
        break;
      }
    }

    return {
      settlingTime,
      overshoot: overshoot > 0 ? overshoot : null,
      steadyStateError,
      riseTime
    };
  }
}
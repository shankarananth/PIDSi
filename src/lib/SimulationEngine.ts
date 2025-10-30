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

export interface PerformanceMetrics {
  // Step response metrics
  settlingTime: number | null;
  overshoot: number | null;
  steadyStateError: number | null;
  riseTime: number | null;
  
  // Integral performance metrics
  iae: number;    // Integral Absolute Error
  ise: number;    // Integral Square Error  
  itae: number;   // Integral Time Absolute Error
  
  // Control effort metrics
  totalVariation: number;  // Total variation of controller output
  maxOutput: number;       // Maximum controller output
  minOutput: number;       // Minimum controller output
  
  // Real-time statistics
  currentError: number;
  averageError: number;
  errorStdDev: number;
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
  
  // Performance tracking
  private performanceMetrics: PerformanceMetrics = {
    settlingTime: null,
    overshoot: null,
    steadyStateError: null,
    riseTime: null,
    iae: 0,
    ise: 0,
    itae: 0,
    totalVariation: 0,
    maxOutput: 0,
    minOutput: 100,
    currentError: 0,
    averageError: 0,
    errorStdDev: 0
  };
  private lastControllerOutput: number = 0;

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
    
    // Reset performance metrics
    this.performanceMetrics = {
      settlingTime: null,
      overshoot: null,
      steadyStateError: null,
      riseTime: null,
      iae: 0,
      ise: 0,
      itae: 0,
      totalVariation: 0,
      maxOutput: 0,
      minOutput: 100,
      currentError: 0,
      averageError: 0,
      errorStdDev: 0
    };
    this.lastControllerOutput = 0;
    
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
        
        // Update performance metrics
        this.updatePerformanceMetrics(dataPoint);
        
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
    // Get current PID parameters to access setpoint limits
    const pidParams = this.pidController.getParameters();
    
    // Clamp setpoint value within limits
    const clampedValue = Math.max(pidParams.setpointMin, Math.min(pidParams.setpointMax, value));
    
    this.targetSetpoint = clampedValue;
    this.setpointRampRate = rampRate;
    
    // If simulation hasn't started yet, initialize process at new setpoint
    if (this.dataHistory.length === 0) {
      this.setpoint = clampedValue;
      this.process.setInitialOutput(clampedValue);
    }
    
    if (rampRate === 0) {
      this.setpoint = clampedValue;
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
   * Update performance metrics with new data point
   */
  private updatePerformanceMetrics(dataPoint: SimulationData): void {
    const dt = this.config.deltaTime * this.speedMultiplier;
    const absError = Math.abs(dataPoint.error);
    
    // Update integral metrics
    this.performanceMetrics.iae += absError * dt;
    this.performanceMetrics.ise += dataPoint.error * dataPoint.error * dt;
    this.performanceMetrics.itae += absError * dataPoint.time * dt;
    
    // Update control effort metrics
    this.performanceMetrics.maxOutput = Math.max(this.performanceMetrics.maxOutput, dataPoint.controllerOutput);
    this.performanceMetrics.minOutput = Math.min(this.performanceMetrics.minOutput, dataPoint.controllerOutput);
    
    if (this.dataHistory.length > 1) {
      const outputVariation = Math.abs(dataPoint.controllerOutput - this.lastControllerOutput);
      this.performanceMetrics.totalVariation += outputVariation;
    }
    this.lastControllerOutput = dataPoint.controllerOutput;
    
    // Update current statistics
    this.performanceMetrics.currentError = dataPoint.error;
    
    // Calculate average error and standard deviation (using recent data)
    const recentData = this.dataHistory.slice(-100); // Last 100 points
    if (recentData.length > 0) {
      const errors = recentData.map(d => d.error);
      this.performanceMetrics.averageError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
      
      const variance = errors.reduce((sum, e) => sum + Math.pow(e - this.performanceMetrics.averageError, 2), 0) / errors.length;
      this.performanceMetrics.errorStdDev = Math.sqrt(variance);
    }
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
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    // Calculate step response metrics
    let stepMetrics = {
      settlingTime: null as number | null,
      overshoot: null as number | null,
      steadyStateError: null as number | null,
      riseTime: null as number | null
    };
    
    if (this.dataHistory.length >= 5) {
      // Find the last significant setpoint change
      let stepStartIndex = -1;
      const threshold = 0.05; // More sensitive threshold
      
      for (let i = this.dataHistory.length - 1; i >= 5; i--) {
        const currentSP = this.dataHistory[i].setpoint;
        const prevSP = this.dataHistory[i - 5].setpoint;
        
        if (Math.abs(currentSP - prevSP) > threshold) {
          stepStartIndex = i - 5;
          break;
        }
      }

      if (stepStartIndex !== -1) {
        const stepData = this.dataHistory.slice(stepStartIndex);
        const finalSetpoint = stepData[stepData.length - 1].setpoint;
        const initialValue = stepData[0].processValue;
        const finalValue = stepData[stepData.length - 1].processValue;
        
        // Only calculate if there's a meaningful step change
        const stepSize = Math.abs(finalSetpoint - initialValue);
        if (stepSize > 0.1) {
          // Calculate overshoot
          const maxValue = Math.max(...stepData.map(d => d.processValue));
          const minValue = Math.min(...stepData.map(d => d.processValue));
          
          let overshoot = 0;
          if (finalSetpoint > initialValue) {
            // Step up - check for overshoot above setpoint
            overshoot = maxValue > finalSetpoint ? ((maxValue - finalSetpoint) / stepSize) * 100 : 0;
          } else {
            // Step down - check for undershoot below setpoint  
            overshoot = minValue < finalSetpoint ? ((finalSetpoint - minValue) / stepSize) * 100 : 0;
          }

          // Calculate steady-state error
          const steadyStateError = Math.abs(finalSetpoint - finalValue);

          // Calculate rise time (10% to 90% of final value)
          const valueRange = finalSetpoint - initialValue;
          const tenPercent = initialValue + 0.1 * valueRange;
          const ninetyPercent = initialValue + 0.9 * valueRange;
          
          let riseStartTime = null;
          let riseEndTime = null;
          
          for (let i = 0; i < stepData.length; i++) {
            if (finalSetpoint > initialValue) {
              // Step up
              if (riseStartTime === null && stepData[i].processValue >= tenPercent) {
                riseStartTime = stepData[i].time;
              }
              if (riseEndTime === null && stepData[i].processValue >= ninetyPercent) {
                riseEndTime = stepData[i].time;
                break;
              }
            } else {
              // Step down
              if (riseStartTime === null && stepData[i].processValue <= tenPercent) {
                riseStartTime = stepData[i].time;
              }
              if (riseEndTime === null && stepData[i].processValue <= ninetyPercent) {
                riseEndTime = stepData[i].time;
                break;
              }
            }
          }
          
          const riseTime = (riseStartTime !== null && riseEndTime !== null) 
            ? riseEndTime - riseStartTime 
            : null;

          // Calculate settling time (time to reach within 2% of final value)
          let settlingTime = null;
          const settlingBand = 0.02 * stepSize;
          
          for (let i = stepData.length - 1; i >= 0; i--) {
            if (Math.abs(stepData[i].processValue - finalSetpoint) > settlingBand) {
              settlingTime = stepData[stepData.length - 1].time - stepData[i].time;
              break;
            }
          }

          stepMetrics = {
            settlingTime,
            overshoot: overshoot > 0 ? overshoot : null,
            steadyStateError,
            riseTime
          };
        }
      } else if (this.dataHistory.length >= 20) {
        // If no step change detected but we have enough data, calculate basic metrics
        // from the current steady-state performance
        const recentData = this.dataHistory.slice(-20);
        const currentSetpoint = recentData[recentData.length - 1].setpoint;
        const currentPV = recentData[recentData.length - 1].processValue;
        
        // Calculate steady-state error from recent data
        const steadyStateError = Math.abs(currentSetpoint - currentPV);
        
        // Only show steady-state error if we're in a relatively stable condition
        const recentErrors = recentData.map(d => Math.abs(d.error));
        const avgRecentError = recentErrors.reduce((sum, e) => sum + e, 0) / recentErrors.length;
        
        if (avgRecentError < 2) { // If reasonably stable
          stepMetrics.steadyStateError = steadyStateError;
        }
      }
    }

    return {
      ...stepMetrics,
      ...this.performanceMetrics
    };
  }
}
/**
 * Velocity-form PID Controller Implementation
 * Based on TarkaDyS - Professional PID Control System
 * 
 * Features:
 * - Three algorithm types: BasicPID, I-PD, PI-D
 * - Bumpless manual/auto transfers
 * - Output limiting with anti-reset windup
 * - Kick elimination for smooth control
 */

export enum PidAlgorithm {
  BasicPID = 'BasicPID',    // Traditional PID (fast response, has kicks)
  I_PD = 'I-PD',           // Integral on error, P&D on measurement (no kicks)
  PI_D = 'PI-D'            // P&I on error, D on measurement (no derivative kick)
}

export enum ControlMode {
  Manual = 'Manual',
  Auto = 'Auto'
}

export interface PidParameters {
  kp: number;           // Proportional gain
  ti: number;           // Integral time in seconds (0 = no integral action)
  td: number;           // Derivative time in seconds (0 = no derivative action)
  outputMin: number;    // Minimum output limit
  outputMax: number;    // Maximum output limit
  algorithm: PidAlgorithm;
  mode: ControlMode;
  manualOutput: number; // Manual output value
}

export interface PidState {
  error: number[];      // Error history [e(n), e(n-1), e(n-2)]
  pv: number[];         // Process variable history [PV(n), PV(n-1), PV(n-2)]
  output: number;       // Current output
  integralSum: number;  // Integral sum for anti-windup
  lastOutput: number;   // Previous output for velocity form
}

export class PidController {
  private parameters: PidParameters;
  private state: PidState;
  private deltaTime: number;
  private firstRun: boolean;

  constructor(parameters: Partial<PidParameters> = {}, deltaTime: number = 0.1) {
    this.parameters = {
      kp: 1.0,
      ti: 10.0,      // 10 seconds integral time
      td: 0.0,       // No derivative action by default
      outputMin: 0,
      outputMax: 100,
      algorithm: PidAlgorithm.BasicPID,
      mode: ControlMode.Manual,
      manualOutput: 50,
      ...parameters
    };

    this.state = {
      error: [0, 0, 0],
      pv: [0, 0, 0],
      output: this.parameters.manualOutput,
      integralSum: 0,
      lastOutput: this.parameters.manualOutput
    };

    this.deltaTime = deltaTime;
    this.firstRun = true;
  }

  /**
   * Update PID parameters
   */
  updateParameters(newParameters: Partial<PidParameters>): void {
    this.parameters = { ...this.parameters, ...newParameters };
  }

  /**
   * Set control mode with bumpless transfer
   */
  setMode(mode: ControlMode, currentPv?: number): void {
    if (this.parameters.mode === ControlMode.Manual && mode === ControlMode.Auto) {
      // Bumpless transfer from Manual to Auto
      this.state.lastOutput = this.parameters.manualOutput;
      this.state.output = this.parameters.manualOutput;
      
      // Initialize history for smooth transition
      if (currentPv !== undefined) {
        this.state.pv = [currentPv, currentPv, currentPv];
        this.state.error = [0, 0, 0];
      }
      
      this.firstRun = true;
    }
    
    this.parameters.mode = mode;
  }

  /**
   * Main PID calculation method
   */
  calculate(setpoint: number, processValue: number): number {
    if (this.parameters.mode === ControlMode.Manual) {
      this.state.output = this.parameters.manualOutput;
      return this.state.output;
    }

    // Shift history arrays
    this.state.error[2] = this.state.error[1];
    this.state.error[1] = this.state.error[0];
    this.state.pv[2] = this.state.pv[1];
    this.state.pv[1] = this.state.pv[0];

    // Calculate current error and PV
    this.state.error[0] = setpoint - processValue;
    this.state.pv[0] = processValue;

    let deltaOutput = 0;

    // Skip calculation on first run to initialize history
    if (this.firstRun) {
      this.firstRun = false;
      deltaOutput = 0;
    } else {
      deltaOutput = this.calculateDeltaOutput();
    }

    // Calculate new output using velocity form
    const newOutput = this.state.lastOutput + deltaOutput;

    // Apply output limits and anti-reset windup
    this.state.output = this.limitOutput(newOutput);
    this.state.lastOutput = this.state.output;

    return this.state.output;
  }

  /**
   * Calculate delta output based on selected algorithm
   */
  private calculateDeltaOutput(): number {
    const { kp, ti, td } = this.parameters;
    const dt = this.deltaTime;
    const e = this.state.error;
    const pv = this.state.pv;
    
    // Convert time-based parameters to gains
    const ki = ti > 0 ? kp / ti : 0;  // Integral gain = Kp / Ti
    const kd = td * kp;               // Derivative gain = Td * Kp

    switch (this.parameters.algorithm) {
      case PidAlgorithm.BasicPID:
        // Traditional PID - fast response but has kicks
        // ΔOutput = Kp×(e[n]-e[n-1]) + Ki×e[n]×Δt + Kd×(e[n]-2×e[n-1]+e[n-2])/Δt
        return kp * (e[0] - e[1]) + 
               ki * e[0] * dt + 
               kd * (e[0] - 2 * e[1] + e[2]) / dt;

      case PidAlgorithm.I_PD:
        // Integral on error, P&D on measurement - eliminates both kicks
        // ΔOutput = Ki×e[n]×Δt + Kp×(PV[n-1]-PV[n]) + Kd×(PV[n-2]-2×PV[n-1]+PV[n])/Δt
        return ki * e[0] * dt + 
               kp * (pv[1] - pv[0]) + 
               kd * (pv[2] - 2 * pv[1] + pv[0]) / dt;

      case PidAlgorithm.PI_D:
        // P&I on error, D on measurement - eliminates derivative kick only
        // ΔOutput = Kp×(e[n]-e[n-1]) + Ki×e[n]×Δt + Kd×(PV[n-2]-2×PV[n-1]+PV[n])/Δt
        return kp * (e[0] - e[1]) + 
               ki * e[0] * dt + 
               kd * (pv[2] - 2 * pv[1] + pv[0]) / dt;

      default:
        return 0;
    }
  }

  /**
   * Apply output limits with anti-reset windup
   */
  private limitOutput(output: number): number {
    const { outputMin, outputMax } = this.parameters;
    
    if (output > outputMax) {
      return outputMax;
    } else if (output < outputMin) {
      return outputMin;
    }
    
    return output;
  }

  /**
   * Reset controller state
   */
  reset(): void {
    this.state = {
      error: [0, 0, 0],
      pv: [0, 0, 0],
      output: this.parameters.manualOutput,
      integralSum: 0,
      lastOutput: this.parameters.manualOutput
    };
    this.firstRun = true;
  }

  /**
   * Get current controller state (read-only)
   */
  getState(): Readonly<PidState> {
    return { ...this.state };
  }

  /**
   * Get current parameters (read-only)
   */
  getParameters(): Readonly<PidParameters> {
    return { ...this.parameters };
  }

  /**
   * Get algorithm description
   */
  getAlgorithmDescription(): string {
    switch (this.parameters.algorithm) {
      case PidAlgorithm.BasicPID:
        return 'Traditional PID - Fast, aggressive response with kicks';
      case PidAlgorithm.I_PD:
        return 'I-PD - Smooth, gradual response, no kicks';
      case PidAlgorithm.PI_D:
        return 'PI-D - Compromise, no derivative kick';
      default:
        return 'Unknown algorithm';
    }
  }
}
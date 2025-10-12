/**
 * First Order Process Model Implementation
 * Based on TarkaDyS - Process Dynamic Simulator
 * 
 * Transfer Function: K×e^(-Td×s)/(Tau×s+1)
 * 
 * Features:
 * - First-order plus dead time model
 * - Dynamic random disturbance generation
 * - Configurable process parameters
 * - Realistic industrial process behavior
 */

export interface ProcessParameters {
  gain: number;           // Process gain (K)
  timeConstant: number;   // Time constant (Tau) in seconds
  deadTime: number;       // Dead time (Td) in seconds
  disturbanceLevel: number; // Disturbance amplitude (0-1)
  noiseLevel: number;     // Measurement noise amplitude (0-1)
}

export interface ProcessState {
  output: number;         // Current process output (PV)
  internalState: number;  // Internal state for first-order dynamics
  inputHistory: number[]; // Input history for dead time implementation
  disturbance: number;    // Current disturbance value
  noise: number;          // Current measurement noise
}

export class FirstOrderProcess {
  private parameters: ProcessParameters;
  private state: ProcessState;
  private deltaTime: number;
  private deadTimeSteps: number;
  private time: number;

  constructor(parameters: Partial<ProcessParameters> = {}, deltaTime: number = 0.1) {
    this.parameters = {
      gain: 1.0,
      timeConstant: 10.0,    // 10 seconds
      deadTime: 2.0,         // 2 seconds
      disturbanceLevel: 0.0,  // No disturbance by default
      noiseLevel: 0.0,        // No noise by default
      ...parameters
    };

    this.deltaTime = deltaTime;
    this.deadTimeSteps = Math.max(1, Math.round(this.parameters.deadTime / deltaTime));
    this.time = 0;

    this.state = {
      output: 0,
      internalState: 0,
      inputHistory: new Array(this.deadTimeSteps).fill(0),
      disturbance: 0,
      noise: 0
    };
  }

  /**
   * Update process parameters
   */
  updateParameters(newParameters: Partial<ProcessParameters>): void {
    const oldDeadTime = this.parameters.deadTime;
    this.parameters = { ...this.parameters, ...newParameters };
    
    // Recalculate dead time steps if dead time changed
    if (this.parameters.deadTime !== oldDeadTime) {
      const newDeadTimeSteps = Math.max(1, Math.round(this.parameters.deadTime / this.deltaTime));
      
      if (newDeadTimeSteps > this.deadTimeSteps) {
        // Extend history with current input
        const currentInput = this.state.inputHistory[this.state.inputHistory.length - 1] || 0;
        const extension = new Array(newDeadTimeSteps - this.deadTimeSteps).fill(currentInput);
        this.state.inputHistory = [...extension, ...this.state.inputHistory];
      } else if (newDeadTimeSteps < this.deadTimeSteps) {
        // Trim history
        this.state.inputHistory = this.state.inputHistory.slice(this.deadTimeSteps - newDeadTimeSteps);
      }
      
      this.deadTimeSteps = newDeadTimeSteps;
    }
  }

  /**
   * Calculate process response to input
   */
  calculate(input: number): number {
    this.time += this.deltaTime;

    // Add input to history (for dead time)
    this.state.inputHistory.push(input);
    
    // Remove oldest input
    if (this.state.inputHistory.length > this.deadTimeSteps) {
      this.state.inputHistory.shift();
    }

    // Get delayed input
    const delayedInput = this.state.inputHistory[0] || 0;

    // Generate dynamic disturbance (low-frequency sinusoidal + random)
    this.generateDisturbance();
    
    // Calculate first-order response with disturbance
    // Transfer function: K/(Tau*s + 1)
    // Differential equation: Tau * dy/dt + y = K * u + disturbance
    // Discrete: y(n) = y(n-1) * exp(-dt/Tau) + K * u * (1 - exp(-dt/Tau))
    
    const { gain, timeConstant } = this.parameters;
    const expFactor = Math.exp(-this.deltaTime / timeConstant);
    const inputEffect = gain * delayedInput * (1 - expFactor);
    
    // Update internal state (without noise)
    this.state.internalState = this.state.internalState * expFactor + inputEffect + this.state.disturbance;
    
    // Generate measurement noise
    this.generateNoise();
    
    // Add measurement noise to output
    this.state.output = this.state.internalState + this.state.noise;

    return this.state.output;
  }

  /**
   * Generate realistic process disturbance
   */
  private generateDisturbance(): void {
    if (this.parameters.disturbanceLevel === 0) {
      this.state.disturbance = 0;
      return;
    }

    // Combine multiple frequency components for realistic disturbance
    const t = this.time;
    const amplitude = this.parameters.disturbanceLevel * this.parameters.gain;
    
    // Low-frequency drift (very slow changes)
    const lowFreq = Math.sin(0.1 * t) * 0.3;
    
    // Medium-frequency oscillation
    const medFreq = Math.sin(0.5 * t) * 0.4;
    
    // Random component (white noise filtered)
    const random = (Math.random() - 0.5) * 0.3;
    
    // Filter random component (simple first-order filter)
    const filterTimeConstant = 5.0; // 5 seconds
    const filterFactor = this.deltaTime / (filterTimeConstant + this.deltaTime);
    const filteredRandom = this.state.disturbance * (1 - filterFactor) + random * filterFactor * 0.1;
    
    this.state.disturbance = amplitude * (lowFreq + medFreq + filteredRandom);
  }

  /**
   * Generate measurement noise
   */
  private generateNoise(): void {
    if (this.parameters.noiseLevel === 0) {
      this.state.noise = 0;
      return;
    }

    // Generate white noise scaled by noise level and current process value
    const noiseAmplitude = this.parameters.noiseLevel * Math.abs(this.state.internalState);
    this.state.noise = (Math.random() - 0.5) * 2 * Math.max(noiseAmplitude, 0.01);
  }

  /**
   * Reset process to initial conditions
   */
  reset(): void {
    this.state = {
      output: 0,
      internalState: 0,
      inputHistory: new Array(this.deadTimeSteps).fill(0),
      disturbance: 0,
      noise: 0
    };
    this.time = 0;
  }

  /**
   * Set initial process output (useful for step tests)
   */
  setInitialOutput(value: number): void {
    this.state.output = value;
    this.state.internalState = value;
    // Fill input history with steady-state input that would produce this output
    const steadyStateInput = value / this.parameters.gain;
    this.state.inputHistory.fill(steadyStateInput);
  }

  /**
   * Get current process state (read-only)
   */
  getState(): Readonly<ProcessState> {
    return { ...this.state, inputHistory: [...this.state.inputHistory] };
  }

  /**
   * Get current parameters (read-only)
   */
  getParameters(): Readonly<ProcessParameters> {
    return { ...this.parameters };
  }

  /**
   * Get process time constant in time units
   */
  getTimeConstant(): number {
    return this.parameters.timeConstant;
  }

  /**
   * Get process dead time in time units
   */
  getDeadTime(): number {
    return this.parameters.deadTime;
  }

  /**
   * Get process gain
   */
  getGain(): number {
    return this.parameters.gain;
  }

  /**
   * Get theoretical steady-state response to a given input
   */
  getSteadyStateResponse(input: number): number {
    return this.parameters.gain * input;
  }

  /**
   * Get approximate settling time (4 * time constant)
   */
  getSettlingTime(): number {
    return 4 * this.parameters.timeConstant;
  }

  /**
   * Get process description string
   */
  getDescription(): string {
    const { gain, timeConstant, deadTime } = this.parameters;
    return `First Order Process: K=${gain.toFixed(2)}, Tau=${timeConstant.toFixed(1)}s, Td=${deadTime.toFixed(1)}s`;
  }
}
import { VoiceState, VoiceStateListener } from "./types";

export class VoiceStateMachine {
  private currentState: VoiceState = "IDLE";
  private listeners: Set<VoiceStateListener> = new Set();

  private validTransitions: Record<VoiceState, VoiceState[]> = {
    IDLE: ["LISTENING", "TYPING", "ERROR"],
    LISTENING: ["PROCESSING", "INTERRUPTED", "IDLE", "ERROR"],
    PROCESSING: ["GENERATING", "INTERRUPTED", "IDLE", "ERROR"],
    GENERATING: ["SPEAKING", "INTERRUPTED", "IDLE", "ERROR"],
    SPEAKING: ["LISTENING", "INTERRUPTED", "IDLE", "ERROR"],
    INTERRUPTED: ["LISTENING", "IDLE", "ERROR"],
    TYPING: ["IDLE", "LISTENING"],
    ERROR: ["IDLE", "LISTENING"],
  };

  public getState(): VoiceState {
    return this.currentState;
  }

  public canTransitionTo(nextState: VoiceState): boolean {
    if (this.currentState === nextState) return true;
    const allowed = this.validTransitions[this.currentState] || [];
    return allowed.includes(nextState);
  }

  public transitionTo(nextState: VoiceState): boolean {
    if (this.currentState === nextState) return true;

    if (!this.canTransitionTo(nextState)) {
      console.warn(
        `[VoiceStateMachine] Invalid state transition attempted: ${this.currentState} -> ${nextState}`
      );
      // Force transition to IDLE first if invalid, then to target
      const prev = this.currentState;
      this.currentState = nextState;
      this.notify(nextState, prev);
      return false;
    }

    const prevState = this.currentState;
    this.currentState = nextState;
    this.notify(nextState, prevState);
    return true;
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(newState: VoiceState, prevState: VoiceState) {
    this.listeners.forEach((listener) => {
      try {
        listener(newState, prevState);
      } catch (err) {
        console.error("[VoiceStateMachine] Listener error:", err);
      }
    });
  }

  public reset() {
    this.transitionTo("IDLE");
  }
}

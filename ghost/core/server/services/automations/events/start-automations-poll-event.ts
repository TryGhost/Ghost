export class StartAutomationsPollEvent {
  data = null;
  timestamp: Date;

  constructor(timestamp: Date) {
    this.timestamp = timestamp;
  }

  static create(): StartAutomationsPollEvent {
    return new StartAutomationsPollEvent(new Date());
  }
}

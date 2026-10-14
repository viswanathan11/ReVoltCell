import { EventEmitter } from 'events';

class RealtimeService {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(200);
  }

  public emitTestEvent(testId: string, event: { type: string; data?: any }) {
    this.emitter.emit(`test:${testId}`, event);
    this.emitter.emit('global:test', { testId, ...event });
  }

  public onTestEvent(testId: string, listener: (event: any) => void) {
    this.emitter.on(`test:${testId}`, listener);
  }

  public offTestEvent(testId: string, listener: (event: any) => void) {
    this.emitter.off(`test:${testId}`, listener);
  }

  public emitDashboardUpdate(data?: any) {
    this.emitter.emit('global:dashboard', data || { timestamp: new Date() });
  }

  public onDashboardUpdate(listener: (data: any) => void) {
    this.emitter.on('global:dashboard', listener);
  }

  public offDashboardUpdate(listener: (data: any) => void) {
    this.emitter.off('global:dashboard', listener);
  }
}

export const realtimeService = new RealtimeService();

import type { Notification } from '@resilient/shared';

class NotificationQueue {
  private notifications: Notification[] = [];
  private deadLetter: Notification[] = [];
  private readonly maxRetries = 3;
  private failRate = 0.15;
  private latencyMs = 50;

  setConfig(failRate: number, latencyMs: number): void {
    this.failRate = failRate;
    this.latencyMs = latencyMs;
  }

  async send(notification: Notification): Promise<Notification> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      // Simulate latency
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));

      // Simulate failure
      if (Math.random() > this.failRate) {
        // Success
        notification.status = 'sent';
        notification.retryCount = attempt;
        this.notifications.push(notification);
        return notification;
      }

      lastError = `Attempt ${attempt + 1} failed`;
      notification.retryCount = attempt + 1;
    }

    // All retries exhausted — move to dead letter
    notification.status = 'failed';
    this.deadLetter.push(notification);
    console.log(`[NotificationQueue] Moved to dead letter: ${notification.id} after ${this.maxRetries} retries`);
    return notification;
  }

  add(notification: Notification): void {
    this.notifications.push(notification);
  }

  getAll(): Notification[] {
    return [...this.notifications];
  }

  getDeadLetter(): Notification[] {
    return [...this.deadLetter];
  }

  retry(notificationId: string): boolean {
    const idx = this.deadLetter.findIndex((n) => n.id === notificationId);
    if (idx === -1) return false;

    const notification = this.deadLetter.splice(idx, 1)[0];
    notification.retryCount = 0;
    notification.status = 'queued';
    this.notifications.push(notification);
    return true;
  }

  clear(): void {
    this.notifications = [];
    this.deadLetter = [];
  }

  size(): number {
    return this.notifications.length;
  }

  deadLetterSize(): number {
    return this.deadLetter.length;
  }
}

export const notificationQueue = new NotificationQueue();

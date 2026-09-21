import type { Notification } from '@resilient/shared';

class NotificationQueue {
  private notifications: Notification[] = [];
  private deadLetter: Notification[] = [];
  private readonly maxRetries = 3;

  add(notification: Notification): void {
    this.notifications.push(notification);

    if (notification.status === 'failed') {
      notification.retryCount++;
      if (notification.retryCount >= this.maxRetries) {
        this.deadLetter.push(notification);
        console.log(`[NotificationQueue] Moved to dead letter: ${notification.id}`);
      }
    }
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

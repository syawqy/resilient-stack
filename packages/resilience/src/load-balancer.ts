import type { LoadBalancingStrategy } from '@resilient/shared';

interface Target {
  name: string;
  host: string;
  port: number;
  activeConnections: number;
}

export class LoadBalancer {
  private targets: Target[] = [];
  private currentIndex = 0;
  private strategy: LoadBalancingStrategy;

  constructor(strategy: LoadBalancingStrategy = 'round-robin') {
    this.strategy = strategy;
  }

  addTarget(name: string, host: string, port: number): void {
    this.targets.push({ name, host, port, activeConnections: 0 });
  }

  removeTarget(name: string): void {
    this.targets = this.targets.filter((t) => t.name !== name);
  }

  getTarget(): Target {
    if (this.targets.length === 0) {
      throw new Error('No targets available');
    }

    switch (this.strategy) {
      case 'round-robin':
        return this.getRoundRobin();
      case 'least-connections':
        return this.getLeastConnections();
      case 'random':
        return this.getRandom();
      default:
        return this.getRoundRobin();
    }
  }

  connectionStarted(targetName: string): void {
    const target = this.targets.find((t) => t.name === targetName);
    if (target) {
      target.activeConnections++;
    }
  }

  connectionFinished(targetName: string): void {
    const target = this.targets.find((t) => t.name === targetName);
    if (target && target.activeConnections > 0) {
      target.activeConnections--;
    }
  }

  getTargets(): Array<Target & { activeConnections: number }> {
    return this.targets.map((t) => ({ ...t }));
  }

  private getRoundRobin(): Target {
    const target = this.targets[this.currentIndex % this.targets.length];
    this.currentIndex = (this.currentIndex + 1) % this.targets.length;
    return target;
  }

  private getLeastConnections(): Target {
    return this.targets.reduce((least, current) =>
      current.activeConnections < least.activeConnections ? current : least
    );
  }

  private getRandom(): Target {
    return this.targets[Math.floor(Math.random() * this.targets.length)];
  }

  setStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
  }
}

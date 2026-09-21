import type { Order } from '@resilient/shared';

interface CreateOrderInput {
  productId: string;
  quantity: number;
  total: number;
}

class OrderStore {
  private orders: Map<string, Order> = new Map();

  getAll(): Order[] {
    return Array.from(this.orders.values());
  }

  getById(id: string): Order | undefined {
    return this.orders.get(id);
  }

  create(input: CreateOrderInput): Order {
    const now = new Date().toISOString();
    const order: Order = {
      id: crypto.randomUUID(),
      productId: input.productId,
      quantity: input.quantity,
      total: input.total,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.orders.set(order.id, order);
    return order;
  }

  updateStatus(id: string, status: Order['status']): Order | undefined {
    const order = this.orders.get(id);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
    }
    return order;
  }

  clear(): void {
    this.orders.clear();
  }

  size(): number {
    return this.orders.size;
  }
}

export const orderStore = new OrderStore();

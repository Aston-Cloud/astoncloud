import { IDomainRoutingService, DomainRoute } from './domain-routing.interface.js';
import { logger } from '../../utils/logger.js';

/**
 * MockDomainRoutingService
 * Maintains an in-memory simulated routing table for local development and tests.
 * Prepared for replacement with Traefik/Nginx reverse proxy provider in production.
 */
export class MockDomainRoutingService implements IDomainRoutingService {
  private routes: Map<string, DomainRoute> = new Map();

  public async addDomainRoute(hostname: string, targetNodeIp: string, targetPort: number): Promise<void> {
    const normalized = hostname.toLowerCase();
    const existing = this.routes.get(normalized);

    const route: DomainRoute = {
      hostname: normalized,
      targetNodeIp,
      targetPort,
      createdAt: existing ? existing.createdAt : new Date(),
      updatedAt: new Date(),
    };

    this.routes.set(normalized, route);
    logger.info(
      { hostname: normalized, targetNodeIp, targetPort, isMock: true },
      '[MockDomainRouting] Configured simulated reverse proxy route'
    );
  }

  public async removeDomainRoute(hostname: string): Promise<void> {
    const normalized = hostname.toLowerCase();
    const removed = this.routes.delete(normalized);
    if (removed) {
      logger.info(
        { hostname: normalized, isMock: true },
        '[MockDomainRouting] Removed simulated reverse proxy route'
      );
    }
  }

  public async getDomainRoute(hostname: string): Promise<DomainRoute | null> {
    const normalized = hostname.toLowerCase();
    return this.routes.get(normalized) || null;
  }

  public async listDomainRoutes(): Promise<DomainRoute[]> {
    return Array.from(this.routes.values());
  }

  /**
   * Helper for tests to reset state
   */
  public clearRoutes(): void {
    this.routes.clear();
  }
}

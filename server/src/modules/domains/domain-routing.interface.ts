/**
 * Domain Routing Abstraction Interface
 * Manages reverse proxy routes from public hostnames to backend host containers
 */

export interface DomainRoute {
  hostname: string;
  targetNodeIp: string;
  targetPort: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDomainRoutingService {
  /**
   * Configures a routing rule in the reverse proxy layer
   */
  addDomainRoute(hostname: string, targetNodeIp: string, targetPort: number): Promise<void>;

  /**
   * Removes a routing rule from the reverse proxy layer
   */
  removeDomainRoute(hostname: string): Promise<void>;

  /**
   * Retrieves an active route configuration
   */
  getDomainRoute(hostname: string): Promise<DomainRoute | null>;

  /**
   * Lists all active routes
   */
  listDomainRoutes(): Promise<DomainRoute[]>;
}

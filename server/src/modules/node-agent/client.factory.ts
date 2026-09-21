import { INodeAgentClient } from './node-agent.interface.js';
import { LocalMockNodeAgentClient } from './mock.client.js';
import { ProductionNodeAgentClient } from './production.client.js';
import { env } from '../../config/env.js';

let defaultMockClient: LocalMockNodeAgentClient | null = null;
let defaultProductionClient: ProductionNodeAgentClient | null = null;
let testClientOverride: INodeAgentClient | null = null;

export function getMockClient(): LocalMockNodeAgentClient {
  if (!defaultMockClient) {
    defaultMockClient = new LocalMockNodeAgentClient();
  }
  return defaultMockClient;
}

export function getProductionClient(): ProductionNodeAgentClient {
  if (!defaultProductionClient) {
    defaultProductionClient = new ProductionNodeAgentClient();
  }
  return defaultProductionClient;
}

export function setTestClientOverride(override: INodeAgentClient | null): void {
  testClientOverride = override;
}

export function getNodeAgentClient(modeOverride?: 'mock' | 'remote'): INodeAgentClient {
  if (testClientOverride) {
    return testClientOverride;
  }

  const mode = modeOverride || env.NODE_AGENT_MODE;
  if (mode === 'remote') {
    return getProductionClient();
  }

  return getMockClient();
}

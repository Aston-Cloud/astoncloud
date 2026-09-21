import { query } from '../../db/index.js';
import { NodeRow } from '../nodes/nodes.service.js';
import { NodeContext } from '../node-agent/node-agent.interface.js';
import { AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export interface ReservedNodeResult {
  node: NodeRow;
  context: NodeContext;
}

export class SchedulerService {
  public static readonly MIN_PORT = 20000;
  public static readonly MAX_PORT = 30000;

  /**
   * Selects an eligible ONLINE node with sufficient resources and atomically reserves them.
   * Prevents race conditions and over-subscription.
   */
  public static async selectAndReserveNode(
    requestedRegion: string,
    cpuCores: number,
    ramMb: number,
    diskMb: number
  ): Promise<ReservedNodeResult> {
    logger.info(
      { requestedRegion, cpuCores, ramMb, diskMb },
      '[SchedulerService] Attempting to schedule and reserve node resources'
    );

    // 1. Fetch eligible candidates: status must be ONLINE and is_active = true
    const { rows: allOnlineNodes } = await query<NodeRow>(
      `SELECT * FROM hosting_nodes 
       WHERE is_active = true 
         AND status = 'ONLINE' 
         AND available_cpu_cores >= $1
         AND available_ram_mb >= $2
         AND available_disk_mb >= $3
       ORDER BY available_ram_mb DESC`,
      [cpuCores, ramMb, diskMb]
    );

    if (allOnlineNodes.length === 0) {
      // Check if nodes exist but lack resources, or if nodes are offline
      const { rows: anyNodes } = await query<NodeRow>(
        `SELECT id, name, status, available_cpu_cores, available_ram_mb, available_disk_mb 
         FROM hosting_nodes WHERE is_active = true`
      );

      const hasOnline = anyNodes.some((n) => n.status === 'ONLINE');
      if (!hasOnline) {
        throw new AppError('Hiện không có máy chủ cụm (Node) nào trực tuyến (ONLINE) để cấp phát', 503);
      }

      throw new AppError(
        `Không có máy chủ cụm (Node) nào còn đủ tài nguyên khả dụng (${cpuCores} vCPU, ${ramMb} MB RAM, ${diskMb} MB Disk)`,
        503
      );
    }

    // 2. Prioritize candidate matching requested region
    const cleanRegion = requestedRegion.split(' ')[0].trim().toLowerCase();
    const prioritizedNodes = [...allOnlineNodes].sort((a, b) => {
      const aMatch = a.region.toLowerCase().includes(cleanRegion) || cleanRegion.includes(a.region.toLowerCase());
      const bMatch = b.region.toLowerCase().includes(cleanRegion) || cleanRegion.includes(b.region.toLowerCase());
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return Number(b.available_ram_mb) - Number(a.available_ram_mb);
    });

    // 3. Attempt atomic reservation on prioritized candidates (handles race conditions)
    for (const candidate of prioritizedNodes) {
      const reserveSql = `
        UPDATE hosting_nodes 
        SET available_cpu_cores = available_cpu_cores - $1,
            available_ram_mb = available_ram_mb - $2,
            available_disk_mb = available_disk_mb - $3
        WHERE id = $4
          AND status = 'ONLINE'
          AND available_cpu_cores >= $1
          AND available_ram_mb >= $2
          AND available_disk_mb >= $3
        RETURNING *;
      `;

      const { rows: updatedRows } = await query<NodeRow>(reserveSql, [
        cpuCores,
        ramMb,
        diskMb,
        candidate.id,
      ]);

      if (updatedRows.length > 0) {
        const reservedNode = updatedRows[0];
        logger.info(
          {
            nodeId: reservedNode.id,
            remainingCpu: reservedNode.available_cpu_cores,
            remainingRam: reservedNode.available_ram_mb,
          },
          '[SchedulerService] Successfully reserved resources on node'
        );

        return {
          node: reservedNode,
          context: {
            id: reservedNode.id,
            name: reservedNode.name,
            region: reservedNode.region,
            ipAddress: reservedNode.ip_address,
            agentUrl: (reservedNode as any).agent_url || 'http://127.0.0.1:5001',
            agentKey: (reservedNode as any).agent_key || undefined,
          },
        };
      }
    }

    throw new AppError(
      'Không thể giữ chỗ tài nguyên do tài nguyên đã bị cấp phát đồng thời trên cụm máy chủ. Vui lòng thử lại.',
      409
    );
  }

  /**
   * Releases previously reserved or allocated resources back to a node.
   */
  public static async releaseNodeResources(
    nodeId: string,
    cpuCores: number,
    ramMb: number,
    diskMb: number
  ): Promise<void> {
    logger.info(
      { nodeId, cpuCores, ramMb, diskMb },
      '[SchedulerService] Releasing resources back to node'
    );

    const releaseSql = `
      UPDATE hosting_nodes 
      SET available_cpu_cores = available_cpu_cores + $1,
          available_ram_mb = available_ram_mb + $2,
          available_disk_mb = available_disk_mb + $3
      WHERE id = $4;
    `;

    await query(releaseSql, [cpuCores, ramMb, diskMb, nodeId]);
  }

  /**
   * Allocates a unique application port on the specified node.
   * Guarantees no two active hosts on the same node share a port.
   */
  public static async allocatePort(nodeId: string): Promise<number> {
    const { rows } = await query<{ port: number }>(
      `SELECT port FROM hosts 
       WHERE node_id = $1 
         AND port IS NOT NULL 
         AND status != 'DELETING'`,
      [nodeId]
    );

    const usedPorts = new Set(rows.map((r) => Number(r.port)));

    for (let p = this.MIN_PORT; p <= this.MAX_PORT; p++) {
      if (!usedPorts.has(p)) {
        logger.info({ nodeId, allocatedPort: p }, '[SchedulerService] Port allocated for host');
        return p;
      }
    }

    throw new AppError(`Dải cổng dịch vụ trên máy chủ "${nodeId}" đã hết. Không thể phân bổ cổng mới.`, 503);
  }
}

import { query } from '../../db/index.js';

export type NodeStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'DRAINING';

export interface NodeRow {
  id: string;
  name: string;
  hostname: string;
  region: string;
  ip_address: string;
  status: NodeStatus;
  total_ram_mb: number;
  available_ram_mb: number;
  total_cpu_cores: number | string;
  available_cpu_cores: number | string;
  total_disk_mb: number;
  available_disk_mb: number;
  is_active: boolean;
  created_at: Date;
}

export interface FormattedNode {
  id: string;
  name: string;
  hostname: string;
  region: string;
  status: NodeStatus;
  totalCpu: number;
  availableCpu: number;
  totalRam: number;
  availableRam: number;
  totalDisk: number;
  availableDisk: number;
}

export function formatNode(row: NodeRow): FormattedNode {
  return {
    id: row.id,
    name: row.name,
    hostname: row.hostname,
    region: row.region,
    status: row.status,
    totalCpu: Number(row.total_cpu_cores),
    availableCpu: Number(row.available_cpu_cores),
    totalRam: Number(row.total_ram_mb),
    availableRam: Number(row.available_ram_mb),
    totalDisk: Number(row.total_disk_mb),
    availableDisk: Number(row.available_disk_mb),
  };
}

export class NodesService {
  public static async listActiveNodes(): Promise<FormattedNode[]> {
    const { rows } = await query<NodeRow>(
      `SELECT * FROM hosting_nodes WHERE is_active = true ORDER BY region ASC`
    );
    return rows.map(formatNode);
  }

  public static async getNodeById(id: string): Promise<NodeRow | null> {
    const { rows } = await query<NodeRow>(
      `SELECT * FROM hosting_nodes WHERE id = $1 AND is_active = true LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Automatic healthy node selection based on requested region
   * If region is not provided or not found, falls back to the first ONLINE node
   */
  public static async selectNodeForHost(requestedRegion?: string): Promise<NodeRow | null> {
    if (requestedRegion) {
      // Look for ONLINE node matching region name (or prefix)
      const cleanRegion = requestedRegion.split(' ')[0].trim();
      const { rows } = await query<NodeRow>(
        `SELECT * FROM hosting_nodes 
         WHERE is_active = true 
           AND status = 'ONLINE' 
           AND (LOWER(region) LIKE LOWER($1) OR LOWER(region) = LOWER($2))
         ORDER BY available_ram_mb DESC 
         LIMIT 1`,
        [`%${cleanRegion}%`, cleanRegion]
      );
      if (rows.length > 0) return rows[0];
    }

    // Default: find any ONLINE node with highest available RAM
    const { rows: fallbackRows } = await query<NodeRow>(
      `SELECT * FROM hosting_nodes 
       WHERE is_active = true AND status = 'ONLINE' 
       ORDER BY available_ram_mb DESC 
       LIMIT 1`
    );

    return fallbackRows[0] || null;
  }
}

import { query } from '../../db/index.js';

export interface HostingPlanRow {
  id: string;
  name: string;
  description: string;
  price_monthly: number | string;
  ram_mb: number;
  cpu_cores: number | string;
  disk_mb: number;
  bandwidth_mb: number;
  is_active: boolean;
  created_at: Date;
}

export interface FormattedHostingPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  price: number;
  ramMb: number;
  cpuCores: number;
  diskMb: number;
  bandwidthMb: number;
  cpu: string;
  ram: string;
  disk: string;
  bandwidth: string;
  recommended?: boolean;
}

export function formatPlan(row: HostingPlanRow): FormattedHostingPlan {
  const ramMb = Number(row.ram_mb);
  const diskMb = Number(row.disk_mb);
  const cpuCores = Number(row.cpu_cores);
  const price = Number(row.price_monthly);

  const ramFormatted = ramMb >= 1024 ? `${(ramMb / 1024).toFixed(0)} GB` : `${ramMb} MB`;
  const diskFormatted = diskMb >= 1024 ? `${(diskMb / 1024).toFixed(0)} GB` : `${diskMb} MB`;
  const cpuFormatted = `${cpuCores} vCPU`;
  const bandwidthFormatted = `${(Number(row.bandwidth_mb) / 1024).toFixed(0)} GB`;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceMonthly: price,
    price,
    ramMb,
    cpuCores,
    diskMb,
    bandwidthMb: Number(row.bandwidth_mb),
    cpu: cpuFormatted,
    ram: ramFormatted,
    disk: `${diskFormatted} NVMe`,
    bandwidth: bandwidthFormatted,
    recommended: row.id === 'developer' || row.id === 'pro',
  };
}

export class PlansService {
  public static async listActivePlans(): Promise<FormattedHostingPlan[]> {
    const { rows } = await query<HostingPlanRow>(
      `SELECT * FROM hosting_plans WHERE is_active = true ORDER BY price_monthly ASC`
    );
    return rows.map(formatPlan);
  }

  public static async getPlanById(planId: string): Promise<FormattedHostingPlan | null> {
    const { rows } = await query<HostingPlanRow>(
      `SELECT * FROM hosting_plans WHERE id = $1 AND is_active = true LIMIT 1`,
      [planId]
    );
    if (!rows || rows.length === 0) return null;
    return formatPlan(rows[0]);
  }
}

import { query } from '../../db/index.js';

export interface RuntimeRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  created_at: Date;
}

export interface RuntimeVersionRow {
  id: number;
  runtime_id: string;
  runtime: string;
  version: string;
  is_default: boolean;
  is_active: boolean;
  created_at: Date;
}

export interface FormattedRuntime {
  id: string;
  name: string;
  description: string;
  icon: string;
  versions: string[];
  defaultVersion: string;
}

export class RuntimesService {
  public static async listRuntimes(): Promise<FormattedRuntime[]> {
    const { rows: runtimes } = await query<RuntimeRow>(
      `SELECT * FROM runtimes WHERE is_active = true ORDER BY name ASC`
    );

    const { rows: versions } = await query<RuntimeVersionRow>(
      `SELECT * FROM runtime_versions WHERE is_active = true ORDER BY version DESC`
    );

    return runtimes.map((r) => {
      const runtimeVers = versions.filter((v) => v.runtime_id === r.id || v.runtime === r.id);
      const versionStrings = runtimeVers.map((v) => v.version);
      const defaultVerObj = runtimeVers.find((v) => v.is_default);
      const defaultVersion = defaultVerObj ? defaultVerObj.version : versionStrings[0] || '';

      return {
        id: r.id,
        name: r.name,
        description: r.description,
        icon: r.icon,
        versions: versionStrings,
        defaultVersion,
      };
    });
  }

  public static async isValidRuntimeAndVersion(
    runtimeId: string,
    version: string
  ): Promise<boolean> {
    const cleanRuntime = runtimeId.toLowerCase().trim();
    const cleanVersion = version.trim();

    const { rows } = await query<RuntimeVersionRow>(
      `SELECT * FROM runtime_versions 
       WHERE (runtime_id = $1 OR runtime = $1) 
         AND version = $2 
         AND is_active = true 
       LIMIT 1`,
      [cleanRuntime, cleanVersion]
    );

    return rows && rows.length > 0;
  }
}

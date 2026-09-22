import { Request, Response, NextFunction } from 'express';
import { NodesService } from '../nodes/nodes.service.js';
import { NodeHeartbeatSchema } from '../nodes/nodes.schema.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class NodeAgentController {
  /**
   * POST /api/v1/node-agent/heartbeat
   * Authenticated endpoint for Node Agents to report status & metrics.
   */
  public static async handleHeartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. Extract Machine-to-Machine credential
      const authHeader = req.headers.authorization;
      let token = '';

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      } else if (req.headers['x-agent-token']) {
        token = String(req.headers['x-agent-token']).trim();
      } else if (req.headers['x-agent-key']) {
        token = String(req.headers['x-agent-key']).trim();
      }

      if (!token) {
        throw new UnauthorizedError('Yêu cầu xác thực Machine-to-Machine (Bearer Token hoặc X-Agent-Token)');
      }

      // 2. Validate Heartbeat payload
      const validatedInput = NodeHeartbeatSchema.parse(req.body);

      // 3. Process heartbeat in service
      const result = await NodesService.processHeartbeat(token, validatedInput);

      res.status(200).json({
        success: true,
        message: 'Tín hiệu Heartbeat của Node Agent đã được ghi nhận thành công.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

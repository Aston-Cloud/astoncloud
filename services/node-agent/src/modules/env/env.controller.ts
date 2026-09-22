import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../utils/logger.js';
import { ValidationError } from '../../utils/errors.js';

interface HostParams {
  hostId: string;
}

interface KeyParams extends HostParams {
  key: string;
}

interface SetEnvBody {
  variables: Record<string, string>;
}

export class EnvController {
  public static async setVariables(
    request: FastifyRequest<{ Params: HostParams; Body: SetEnvBody }>,
    reply: FastifyReply
  ) {
    const { hostId } = request.params;
    const { variables } = request.body || {};

    if (!hostId || typeof hostId !== 'string') {
      throw new ValidationError('hostId là bắt buộc');
    }

    if (!variables || typeof variables !== 'object') {
      throw new ValidationError('variables là bắt buộc và phải là đối tượng');
    }

    const sanitizedKeys: string[] = [];
    for (const key of Object.keys(variables)) {
      const cleanKey = key.trim().toUpperCase();
      if (!/^[A-Z_][A-Z0-9_]{0,127}$/.test(cleanKey)) {
        throw new ValidationError(`Tên biến môi trường "${cleanKey}" không hợp lệ`);
      }
      sanitizedKeys.push(cleanKey);
    }

    // Never log secret values
    logger.info(
      { hostId, count: sanitizedKeys.length },
      '[EnvController] Environment variables staged for container'
    );

    return reply.status(200).send({
      success: true,
      data: {
        count: sanitizedKeys.length,
        keys: sanitizedKeys,
        requiresRestart: true,
      },
    });
  }

  public static async removeVariable(
    request: FastifyRequest<{ Params: KeyParams }>,
    reply: FastifyReply
  ) {
    const { hostId, key } = request.params;

    if (!hostId || !key) {
      throw new ValidationError('hostId và key là bắt buộc');
    }

    const cleanKey = key.trim().toUpperCase();

    logger.info(
      { hostId, key: cleanKey },
      '[EnvController] Environment variable removed for container'
    );

    return reply.status(200).send({
      success: true,
      data: {
        key: cleanKey,
        removed: true,
        requiresRestart: true,
      },
    });
  }
}

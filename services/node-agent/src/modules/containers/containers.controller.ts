import { FastifyRequest, FastifyReply } from 'fastify';
import { dockerService } from '../../services/docker.service.js';
import {
  CreateContainerSchema,
  ContainerParamsSchema,
  ContainerLogsQuerySchema,
  ContainerTimeoutQuerySchema,
  ContainerDeleteQuerySchema,
} from './containers.schema.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

export class ContainersController {
  public static async create(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = CreateContainerSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError('Dữ liệu yêu cầu khởi tạo container không hợp lệ', parseResult.error.flatten());
    }

    const container = await dockerService.createHostContainer(parseResult.data);
    return reply.status(201).send({
      success: true,
      message: `Đã tạo container thành công cho host "${parseResult.data.hostId}"`,
      data: {
        containerId: container.id,
        hostId: parseResult.data.hostId,
        name: container.name,
        status: container.status,
        image: container.image,
        port: container.port,
        created: container.created,
        resources: container.resources,
      },
    });
  }

  public static async get(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = ContainerParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      throw new ValidationError('Định danh container không hợp lệ', parseParams.error.flatten());
    }

    const container = await dockerService.getContainer(parseParams.data.id);
    if (!container) {
      throw new NotFoundError(`Container "${parseParams.data.id}" không tồn tại trên node`);
    }

    return reply.status(200).send({
      success: true,
      data: {
        ...container,
        hostId: container.labels['aston.host_id'] || container.labels['aston.host.id'] || parseParams.data.id,
      },
    });
  }

  public static async start(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = ContainerParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      throw new ValidationError('Định danh container không hợp lệ', parseParams.error.flatten());
    }

    await dockerService.startContainer(parseParams.data.id);
    return reply.status(200).send({
      success: true,
      message: `Container "${parseParams.data.id}" đã được khởi chạy thành công`,
      data: {
        id: parseParams.data.id,
        status: 'running',
      },
    });
  }

  public static async stop(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = ContainerParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      throw new ValidationError('Định danh container không hợp lệ', parseParams.error.flatten());
    }

    const parseQuery = ContainerTimeoutQuerySchema.safeParse(request.query);
    const timeout = parseQuery.success ? parseQuery.data.timeout : 10;

    await dockerService.stopContainer(parseParams.data.id, timeout);
    return reply.status(200).send({
      success: true,
      message: `Container "${parseParams.data.id}" đã dừng hoạt động an toàn`,
      data: {
        id: parseParams.data.id,
        status: 'exited',
      },
    });
  }

  public static async restart(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = ContainerParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      throw new ValidationError('Định danh container không hợp lệ', parseParams.error.flatten());
    }

    const parseQuery = ContainerTimeoutQuerySchema.safeParse(request.query);
    const timeout = parseQuery.success ? parseQuery.data.timeout : 10;

    await dockerService.restartContainer(parseParams.data.id, timeout);
    return reply.status(200).send({
      success: true,
      message: `Container "${parseParams.data.id}" đã khởi động lại thành công`,
      data: {
        id: parseParams.data.id,
        status: 'running',
      },
    });
  }

  public static async remove(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = ContainerParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      throw new ValidationError('Định danh container không hợp lệ', parseParams.error.flatten());
    }

    const parseQuery = ContainerDeleteQuerySchema.safeParse(request.query);
    const force = parseQuery.success ? Boolean(parseQuery.data.force) : false;

    await dockerService.removeContainer(parseParams.data.id, force);
    return reply.status(200).send({
      success: true,
      message: `Container "${parseParams.data.id}" đã được gỡ bỏ khỏi node`,
      data: {
        id: parseParams.data.id,
        deleted: true,
      },
    });
  }

  public static async logs(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = ContainerParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      throw new ValidationError('Định danh container không hợp lệ', parseParams.error.flatten());
    }

    const parseQuery = ContainerLogsQuerySchema.safeParse(request.query);
    const query = parseQuery.success ? parseQuery.data : { tail: 100 };

    const rawLogs = await dockerService.getContainerLogs(parseParams.data.id, query);
    const lines = rawLogs ? rawLogs.split('\n') : [];
    return reply.status(200).send({
      success: true,
      data: {
        id: parseParams.data.id,
        lines,
        total: lines.length,
        raw: rawLogs,
      },
    });
  }

  public static async stats(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = ContainerParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      throw new ValidationError('Định danh container không hợp lệ', parseParams.error.flatten());
    }

    const stats = await dockerService.getContainerStats(parseParams.data.id);
    return reply.status(200).send({
      success: true,
      data: {
        ...stats,
        cpu: {
          usage: stats.cpuPercentage,
          limit: stats.cpuLimit,
        },
        memory: {
          usage: stats.memoryUsageMb,
          limit: stats.memoryLimitMb,
        },
        disk: {
          usage: stats.diskUsageMb,
          limit: stats.diskLimitMb,
        },
        network: {
          rx: stats.networkRxBytes,
          tx: stats.networkTxBytes,
        },
        cpuPercent: stats.cpuPercentage,
        pids: stats.pidsCurrent,
        hostId: parseParams.data.id,
      },
    });
  }
}

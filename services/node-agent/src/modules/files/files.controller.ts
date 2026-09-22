import { FastifyRequest, FastifyReply } from 'fastify';
import { FilesService } from './files.service.js';
import { ValidationError } from '../../utils/errors.js';

interface HostParams {
  hostId: string;
}

interface ListQuery {
  path?: string;
}

interface PathQuery {
  path: string;
}

interface WriteBody {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

interface DirectoryBody {
  path: string;
}

interface RenameBody {
  fromPath: string;
  toPath: string;
}

interface UploadBody {
  destinationPath?: string;
  filename: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

export class FilesController {
  public static async list(
    request: FastifyRequest<{ Params: HostParams; Querystring: ListQuery }>,
    reply: FastifyReply
  ) {
    const { hostId } = request.params;
    const dirPath = request.query.path || '/';
    const result = await FilesService.listFiles(hostId, dirPath);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  public static async read(
    request: FastifyRequest<{ Params: HostParams; Querystring: PathQuery }>,
    reply: FastifyReply
  ) {
    const { hostId } = request.params;
    const { path: filePath } = request.query;
    if (!filePath) {
      throw new ValidationError('Tham số path là bắt buộc');
    }
    const result = await FilesService.readFile(hostId, filePath);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  public static async write(
    request: FastifyRequest<{ Params: HostParams; Body: WriteBody }>,
    reply: FastifyReply
  ) {
    const { hostId } = request.params;
    const { path: filePath, content, encoding } = request.body || {};
    if (!filePath || content === undefined) {
      throw new ValidationError('path và content là các trường bắt buộc');
    }
    const result = await FilesService.writeFile(hostId, filePath, content, encoding);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  public static async createDir(
    request: FastifyRequest<{ Params: HostParams; Body: DirectoryBody }>,
    reply: FastifyReply
  ) {
    const { hostId } = request.params;
    const { path: dirPath } = request.body || {};
    if (!dirPath) {
      throw new ValidationError('Tham số path là bắt buộc');
    }
    const result = await FilesService.createDirectory(hostId, dirPath);
    return reply.status(201).send({
      success: true,
      data: result,
    });
  }

  public static async remove(
    request: FastifyRequest<{ Params: HostParams; Querystring: PathQuery }>,
    reply: FastifyReply
  ) {
    const { hostId } = request.params;
    const { path: targetPath } = request.query;
    if (!targetPath) {
      throw new ValidationError('Tham số path là bắt buộc');
    }
    const result = await FilesService.deleteFile(hostId, targetPath);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  public static async rename(
    request: FastifyRequest<{ Params: HostParams; Body: RenameBody }>,
    reply: FastifyReply
  ) {
    const { hostId } = request.params;
    const { fromPath, toPath } = request.body || {};
    if (!fromPath || !toPath) {
      throw new ValidationError('fromPath và toPath là các trường bắt buộc');
    }
    const result = await FilesService.renameFile(hostId, fromPath, toPath);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  public static async upload(
    request: FastifyRequest<{ Params: HostParams; Body: UploadBody }>,
    reply: FastifyReply
  ) {
    const { hostId } = request.params;
    const { destinationPath, filename, content, encoding } = request.body || {};
    if (!filename || content === undefined) {
      throw new ValidationError('filename và content là các trường bắt buộc');
    }
    const result = await FilesService.uploadFile(hostId, destinationPath || '/', filename, content, encoding);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  public static async download(
    request: FastifyRequest<{ Params: HostParams; Querystring: PathQuery }>,
    reply: FastifyReply
  ) {
    const { hostId } = request.params;
    const { path: filePath } = request.query;
    if (!filePath) {
      throw new ValidationError('Tham số path là bắt buộc');
    }
    const result = await FilesService.downloadFile(hostId, filePath);
    reply.header('Content-Disposition', `attachment; filename="${result.filename}"`);
    reply.header('Content-Type', 'application/octet-stream');
    return reply.send(result.stream);
  }
}

import { Request, Response, NextFunction } from 'express';
import { DomainsService } from './domains.service.js';
import { sendSuccess } from '../../utils/response.js';
import { CreateDomainInput } from './domains.schema.js';

export class DomainsController {
  public static async listHostDomains(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hostId = req.params.id as string;
      const domains = await DomainsService.listHostDomains(hostId, req.user!.id, req.user!.role);
      sendSuccess(res, domains);
    } catch (err) {
      next(err);
    }
  }

  public static async addHostDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hostId = req.params.id as string;
      const input = req.body as CreateDomainInput;
      const domain = await DomainsService.addHostDomain(hostId, input, req.user!.id, req.user!.role);
      sendSuccess(res, domain, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getHostDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hostId = req.params.id as string;
      const domainId = req.params.domainId as string;
      const domain = await DomainsService.getHostDomain(hostId, domainId, req.user!.id, req.user!.role);
      sendSuccess(res, domain);
    } catch (err) {
      next(err);
    }
  }

  public static async verifyHostDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hostId = req.params.id as string;
      const domainId = req.params.domainId as string;
      const result = await DomainsService.verifyHostDomain(hostId, domainId, req.user!.id, req.user!.role);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static async requestHostDomainSsl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hostId = req.params.id as string;
      const domainId = req.params.domainId as string;
      const result = await DomainsService.requestHostDomainSsl(hostId, domainId, req.user!.id, req.user!.role);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static async disableHostDomainSsl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hostId = req.params.id as string;
      const domainId = req.params.domainId as string;
      const result = await DomainsService.disableHostDomainSsl(hostId, domainId, req.user!.id, req.user!.role);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteHostDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hostId = req.params.id as string;
      const domainId = req.params.domainId as string;
      const result = await DomainsService.deleteHostDomain(hostId, domainId, req.user!.id, req.user!.role);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static async listUserAllDomains(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const domains = await DomainsService.listUserAllDomains(req.user!.id, req.user!.role);
      sendSuccess(res, domains);
    } catch (err) {
      next(err);
    }
  }
}

import type { NextFunction, Request, Response } from 'express';
import { RecommendationService } from './recommendation-service';

export class WellknownController {
  service: RecommendationService;

  constructor(deps: { service: RecommendationService }) {
    this.service = deps.service;
  }

  async getRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const body = await this.service.getWellknownJson();
      res.set({
        'Content-Type': 'application/json; charset=UTF-8',
        'Cache-Control': 'public, max-age=0',
      });
      res.send(Buffer.from(body));
    } catch (err) {
      next(err);
    }
  }
}

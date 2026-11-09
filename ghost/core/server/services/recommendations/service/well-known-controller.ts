import type { NextFunction, Request, Response } from 'express';
import { RecommendationService } from './recommendation-service';

export class WellknownController {
  service: RecommendationService;

  constructor(deps: { service: RecommendationService }) {
    this.service = deps.service;
  }

  async getRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const recommendations = await this.service.getWellknownRecommendations();
      res.set('Cache-Control', 'public, max-age=0');
      res.json(recommendations);
    } catch (err) {
      next(err);
    }
  }
}

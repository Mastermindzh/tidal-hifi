import type { Express, Request, Response } from "express";

/**
 * Add health check endpoint to the express app
 */
export const addHealthEndpoint = (app: Express): void => {
  /**
   * @openapi
   * /health:
   *   get:
   *     tags:
   *       - Health
   *     summary: Health check endpoint
   *     description: Returns the health status of the Tidal Hi-Fi API service
   *     responses:
   *       200:
   *         description: Service is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: "healthy"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                   example: "2025-12-27T10:00:00.000Z"
   *                 uptime:
   *                   type: number
   *                   description: Process uptime in seconds
   *                   example: 12345.67
   *                 version:
   *                   type: string
   *                   example: "6.0.1"
   *                 service:
   *                   type: string
   *                   example: "tidal-hifi-api"
   */
  app.get("/health", (_req: Request, res: Response) => {
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "unknown",
      service: "tidal-hifi-api",
    };

    res.status(200).json(healthData);
  });
};

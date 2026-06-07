import { Express } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { authenticate } from '../middleware/authenticate';
import { config } from '../config';
import { logger } from '@linkedin-clone/shared';

interface RouteDef {
  path: string;
  target: string;
}

/**
 * Authenticated route map. Every entry requires a valid access token; the
 * gateway injects identity headers and proxies to the owning service.
 *
 * Note: /api/auth is intentionally absent — NGINX forwards auth traffic
 * straight to auth-service (public). In local dev without NGINX, auth-service
 * is hit directly on :3001.
 */
const routes: RouteDef[] = [
  { path: '/api/users', target: config.USER_SERVICE_URL },
  { path: '/api/connections', target: config.CONNECTION_SERVICE_URL },
  { path: '/api/posts', target: config.POST_SERVICE_URL },
  { path: '/api/messaging', target: config.MESSAGING_SERVICE_URL },
  { path: '/api/notifications', target: config.NOTIFICATION_SERVICE_URL },
  { path: '/api/search', target: config.SEARCH_SERVICE_URL },
  { path: '/api/media', target: config.MEDIA_SERVICE_URL },
  { path: '/api/jobs', target: config.JOB_SERVICE_URL },
];

export function registerProxies(app: Express): void {
  for (const { path, target } of routes) {
    app.use(
      path,
      authenticate,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        // Express strips the mount path (e.g. "/api/users") before the proxy
        // sees the request, leaving req.url as "/me". Restore the prefix so the
        // upstream receives the full "/api/users/me" path it routes on.
        pathRewrite: (p) => `${path}${p}`,
        on: {
          proxyReq: fixRequestBody,
          error: (err, _req, res) => {
            logger.error({ err, target }, 'gateway proxy error');
            if ('writeHead' in res && !res.headersSent) {
              (res as import('http').ServerResponse).writeHead(502, {
                'Content-Type': 'application/json',
              });
              res.end(
                JSON.stringify({
                  success: false,
                  error: { code: 'BAD_GATEWAY', message: 'Upstream service unavailable' },
                }),
              );
            }
          },
        },
      }),
    );
    logger.info({ path, target }, 'proxy route registered');
  }
}

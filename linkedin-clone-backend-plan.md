# LinkedIn Clone — Microservices Backend Architecture Plan

**Stack:** TypeScript · Node.js · Express 4 · Sequelize 6 (ORM) · sequelize-cli (migrations) · PostgreSQL · Redis · RabbitMQ · JWT · Docker · GitHub Actions

> **Implementation note:** This document was originally drafted around Prisma + Turborepo/pnpm. The implemented codebase instead uses **Sequelize 6** with a **repository pattern**, **npm workspaces** (not Turborepo), and a custom `scripts/dev.js` orchestrator. The sections below reflect what is actually built.

---

## 1. Service Decomposition

```
linkedin-clone/
├── services/
│   ├── api-gateway/          # Routes, rate-limits, auth middleware
│   ├── auth-service/         # Register, login, tokens, OAuth
│   ├── user-service/         # Profiles, skills, education, experience
│   ├── connection-service/   # Connect, accept, reject, block, follow
│   ├── post-service/         # Posts, articles, comments, reactions
│   ├── messaging-service/    # 1:1 and group conversations
│   ├── notification-service/ # In-app, email, push notifications
│   ├── search-service/       # Full-text search (Elasticsearch)
│   ├── media-service/        # Upload, resize, serve images/video
│   └── job-service/          # Job listings, applications, saved jobs
├── packages/
│   └── shared/               # errors, http envelopes, constants, RabbitMQ/Redis helpers, logger, middleware
├── infra/
│   ├── docker-compose.yml
│   ├── init-databases.sql    # creates one Postgres database per service
│   └── nginx/
│       └── nginx.conf
├── scripts/
│   └── dev.js                # dev orchestrator (watch shared + run all services)
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── tsconfig.base.json
└── package.json              # npm workspaces root
```

### Service Responsibilities

| Service | Port | Database | Primary Responsibility |
|---------|------|----------|----------------------|
| api-gateway | 3000 | — | Routing, rate limiting, JWT verification, request forwarding |
| auth-service | 3001 | `auth_db` | Registration, login, token lifecycle, password reset, OAuth2 |
| user-service | 3002 | `user_db` | Profiles, skills, education, experience, endorsements |
| connection-service | 3003 | `connection_db` | Connection requests, follow/unfollow, blocking, mutual checks |
| post-service | 3004 | `post_db` | Posts, articles, comments, reactions, hashtags, feed generation |
| messaging-service | 3005 | `messaging_db` | Conversations, messages, read receipts, typing indicators |
| notification-service | 3006 | `notification_db` | Notification dispatch (in-app, email, push), preferences |
| search-service | 3007 | Elasticsearch | Full-text search for users, posts, jobs, companies |
| media-service | 3008 | `media_db` | File upload (S3/MinIO), image resizing, CDN URL generation |
| job-service | 3009 | `job_db` | Job CRUD, applications, saved jobs, company pages |

---

## 2. Shared Package — `packages/shared`

```
packages/shared/
├── src/
│   ├── constants/
│   │   ├── queues.ts          # RabbitMQ exchange/queue/DLX names + types
│   │   ├── events.ts          # Routing keys + EventEnvelope shape
│   │   └── index.ts
│   ├── errors/
│   │   ├── AppError.ts        # AppError + typed subclasses (BadRequest, NotFound, ...)
│   │   └── index.ts
│   ├── http/
│   │   ├── respond.ts         # ok() / created() / noContent() envelopes
│   │   └── index.ts
│   ├── middleware/
│   │   ├── errorHandler.ts    # Global error handler + notFoundHandler
│   │   ├── validate.ts        # Zod validation middleware
│   │   ├── requireUser.ts     # requireUser / optionalUser / requireRole
│   │   ├── rateLimiter.ts     # Token-bucket via Redis
│   │   └── index.ts
│   ├── rabbitmq/
│   │   ├── connection.ts      # Channel pool manager
│   │   ├── publisher.ts       # publishEvent() with confirm + retry
│   │   ├── consumer.ts        # registerConsumer() with DLQ + retry/backoff
│   │   └── index.ts
│   ├── logger/
│   │   └── index.ts           # Pino structured logger (createLogger)
│   ├── redis/
│   │   ├── client.ts          # ioredis singleton (getRedis/closeRedis)
│   │   └── index.ts
│   ├── utils/
│   │   ├── asyncHandler.ts    # Wraps async route handlers
│   │   ├── pagination.ts      # Cursor & offset helpers
│   │   └── index.ts
│   └── index.ts               # Barrel — consumers import from '@linkedin-clone/shared'
├── package.json
└── tsconfig.json
```

### RabbitMQ Connection Pool (key excerpt)

```typescript
// packages/shared/src/rabbitmq/connection.ts
import amqp, { Connection, Channel } from 'amqplib';

class RabbitMQManager {
  private connection: Connection | null = null;
  private channels: Channel[] = [];
  private currentIndex = 0;

  async connect(url: string, poolSize = 3): Promise<void> {
    this.connection = await amqp.connect(url);
    this.connection.on('error', (err) => console.error('RabbitMQ conn error:', err));
    this.connection.on('close', () => setTimeout(() => this.connect(url, poolSize), 5000));

    for (let i = 0; i < poolSize; i++) {
      const ch = await this.connection.createChannel();
      await ch.prefetch(10);
      this.channels.push(ch);
    }
  }

  getChannel(): Channel {
    const ch = this.channels[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.channels.length;
    return ch;
  }

  async close(): Promise<void> {
    for (const ch of this.channels) await ch.close();
    await this.connection?.close();
  }
}

export const rabbit = new RabbitMQManager();
```

### Exchange & Queue Topology

```typescript
// packages/shared/src/constants/queues.ts
export const EXCHANGES = {
  USER_EVENTS:       'user.events',        // topic
  POST_EVENTS:       'post.events',        // topic
  CONNECTION_EVENTS: 'connection.events',   // topic
  NOTIFICATION:      'notification.direct', // direct
  MEDIA_PROCESSING:  'media.processing',    // direct
  JOB_EVENTS:        'job.events',          // topic
} as const;

export const QUEUES = {
  // notification-service consumers
  NOTIFY_CONNECTION_REQUEST:  'notify.connection.request',
  NOTIFY_POST_REACTION:      'notify.post.reaction',
  NOTIFY_COMMENT:             'notify.comment',
  NOTIFY_MESSAGE:             'notify.message',
  NOTIFY_JOB_APPLICATION:    'notify.job.application',

  // search-service consumers
  SEARCH_INDEX_USER:          'search.index.user',
  SEARCH_INDEX_POST:          'search.index.post',
  SEARCH_INDEX_JOB:           'search.index.job',

  // media-service consumers
  MEDIA_RESIZE:               'media.resize',
  MEDIA_THUMBNAIL:            'media.thumbnail',

  // DLQs (dead-letter queues)
  DLQ_NOTIFICATION:           'dlq.notification',
  DLQ_SEARCH:                 'dlq.search',
  DLQ_MEDIA:                  'dlq.media',
} as const;
```

---

## 3. Data Models (Sequelize)

Each service owns its database and defines models with Sequelize 6 (`Model<InferAttributes, InferCreationAttributes>` + `Model.init`). Columns map to `snake_case` via the global `define: { underscored: true }` plus explicit `field:` overrides. Schema changes ship as **sequelize-cli migrations** under each service's `migrations/` directory (run with `npm run db:migrate -w @linkedin-clone/<svc>`); models are never auto-synced in production. Each model uses a UUID primary key (`DataTypes.UUID` / `DataTypes.UUIDV4`), and migrations default ids to `gen_random_uuid()`.

The field maps below describe the implemented tables (Sequelize attribute → column type, defaults, indexes). Enums are Postgres enums (`DataTypes.ENUM`) surfaced in TS as string unions.

### 3.1 Auth Service — `auth_db`

```ts
// services/auth-service/src/models/User.ts  → table "users"
{
  id:            UUID  pk default uuidv4
  email:         STRING unique
  passwordHash:  STRING                 // password_hash
  isVerified:    BOOLEAN default false  // is_verified
  verifyToken:   STRING?                // verify_token
  resetToken:    STRING?                // reset_token
  resetExpiry:   DATE?                  // reset_expiry
  oauthProvider: STRING?                // oauth_provider
  oauthId:       STRING?                // oauth_id
  role:          ENUM('USER','ADMIN','RECRUITER') default 'USER'
  lastLoginAt:   DATE?                  // last_login_at
  createdAt / updatedAt: DATE
}
// unique (oauth_provider, oauth_id)

// services/auth-service/src/models/RefreshToken.ts  → table "refresh_tokens"
{
  id:         UUID pk
  token:      STRING unique
  userId:     UUID   // user_id  — FK users.id ON DELETE CASCADE
  deviceInfo: STRING?  // device_info
  expiresAt:  DATE     // expires_at
  createdAt:  DATE
}
// index (user_id)   ·   User hasMany RefreshToken
```

### 3.2 User Service — `user_db`

```ts
// Profile → "profiles"  (id === auth user id)
{ id:UUID pk, firstName, lastName, headline?, summary?(TEXT), avatarUrl?,
  bannerUrl?, location?, website?, industry?, isOpenToWork:BOOL default false,
  profileViews:INT default 0, createdAt, updatedAt }

// Experience → "experiences"   index(profile_id)   belongsTo Profile (CASCADE)
{ id:UUID pk, profileId, title, company, companyLogo?, location?,
  startDate:DATE, endDate?:DATE, isCurrent:BOOL default false, description?(TEXT), createdAt }

// Education → "educations"   index(profile_id)
{ id:UUID pk, profileId, school, degree?, fieldOfStudy?, startYear:INT,
  endYear?:INT, grade?, activities?(TEXT), createdAt }

// Skill → "skills"
{ id:UUID pk, name:STRING unique, category? }

// ProfileSkill → "profile_skills"  (composite pk profile_id+skill_id)
{ profileId, skillId, endorsements:INT default 0 }

// SkillEndorsement → "skill_endorsements"  (who endorsed whom for which skill;
//   prevents double-counting endorsements — see migration 2)
{ id:UUID pk, profileId, skillId, endorserId, createdAt }   // unique(profile_id,skill_id,endorser_id)

// Certification → "certifications"   index(profile_id)
{ id:UUID pk, profileId, name, issuingOrg, issueDate:DATE,
  expirationDate?:DATE, credentialId?, credentialUrl? }
```
Profile `hasMany` Experience / Education / ProfileSkill / Certification (all `ON DELETE CASCADE`); Skill `hasMany` ProfileSkill.

### 3.3 Connection Service — `connection_db`

```ts
// Connection → "connections"
{ id:UUID pk, requesterId, addresseeId,
  status:ENUM('PENDING','ACCEPTED','REJECTED','WITHDRAWN') default 'PENDING',
  note?, createdAt, updatedAt }
// unique(requester_id,addressee_id) · index(addressee_id,status) · index(requester_id,status)

// Follow → "follows"
{ id:UUID pk, followerId, followingId, createdAt }
// unique(follower_id,following_id) · index(following_id)

// Block → "blocks"
{ id:UUID pk, blockerId, blockedId, createdAt }
// unique(blocker_id,blocked_id) · index(blocked_id)
```
The three aggregates are independent (no cross-table associations).

### 3.4 Post Service — `post_db`

```ts
// Post → "posts"
{ id:UUID pk, authorId, content:TEXT, mediaUrls:ARRAY(STRING) default [],
  postType:ENUM('POST','ARTICLE','POLL','SHARE','CELEBRATION') default 'POST',
  visibility:ENUM('PUBLIC','CONNECTIONS','PRIVATE') default 'PUBLIC',
  isEdited:BOOL default false, likesCount/commentsCount/sharesCount:INT default 0,
  createdAt, updatedAt, deletedAt?:DATE }   // soft delete
// index(author_id, created_at DESC) · index(created_at DESC)

// Comment → "comments"   (self-referential threads)
{ id:UUID pk, postId, authorId, parentId?, content:TEXT, likesCount:INT default 0,
  createdAt, updatedAt }
// index(post_id, created_at) · index(parent_id) · Comment hasMany Comment ("Replies")

// Reaction → "reactions"
{ id:UUID pk, postId, userId,
  type:ENUM('LIKE','CELEBRATE','SUPPORT','LOVE','INSIGHTFUL','FUNNY') default 'LIKE' }
// unique(post_id,user_id)

// Hashtag → "hashtags"  { id:UUID pk, name:STRING unique }
// PostHashtag → "post_hashtags"  (composite pk post_id+hashtag_id)
```
Post `hasMany` Comment / Reaction / PostHashtag (`CASCADE`); Hashtag `hasMany` PostHashtag.

### 3.5 Messaging Service — `messaging_db`

```ts
// Conversation → "conversations"
{ id:UUID pk, isGroup:BOOL default false, groupName?, groupAvatar?,
  lastMessageAt?:DATE, createdAt }       // index(last_message_at DESC)

// Participant → "participants"   (timestamps:false)
{ id:UUID pk, conversationId, userId, joinedAt:DATE default now,
  lastReadAt?:DATE, isMuted:BOOL default false }
// unique(conversation_id,user_id) · index(user_id)

// Message → "messages"
{ id:UUID pk, conversationId, senderId, content?:TEXT, mediaUrl?,
  messageType:ENUM('TEXT','IMAGE','FILE','SYSTEM') default 'TEXT',
  isEdited:BOOL default false, deletedAt?:DATE, createdAt }
// index(conversation_id, created_at DESC)
```
Conversation `hasMany` Participant / Message (`CASCADE`).

### 3.6 Notification Service — `notification_db`

```ts
// Notification → "notifications"   (updatedAt:false)
{ id:UUID pk, recipientId, actorId?,
  type:ENUM('CONNECTION_REQUEST','CONNECTION_ACCEPTED','POST_LIKE','POST_COMMENT',
            'COMMENT_REPLY','ENDORSEMENT','PROFILE_VIEW','JOB_RECOMMENDATION',
            'MESSAGE_RECEIVED','MENTION'),
  entityType?, entityId?, message:STRING, isRead:BOOL default false, readAt?:DATE,
  metadata?:JSONB, createdAt }
// index(recipient_id, is_read, created_at DESC)

// NotificationPreference → "notification_preferences"   (timestamps:false)
{ id:UUID pk, userId:UUID unique, inApp:BOOL default true, email:BOOL default true,
  push:BOOL default true, connections:BOOL default true, messages:BOOL default true,
  posts:BOOL default true, jobs:BOOL default true }
```

### 3.7 Job Service — `job_db`

```ts
// Company → "companies"
{ id:UUID pk, name, slug:STRING unique, logoUrl?, bannerUrl?, website?, industry?,
  size?, description?(TEXT), location?, foundedYear?:INT,
  adminIds:ARRAY(UUID) default [], createdAt, updatedAt }

// Job → "jobs"
{ id:UUID pk, companyId, posterId, title, description:TEXT, location?,
  locationType:ENUM('ONSITE','REMOTE','HYBRID') default 'ONSITE',
  employmentType:ENUM('FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','FREELANCE'),
  experienceLevel:ENUM('ENTRY','ASSOCIATE','MID_SENIOR','DIRECTOR','EXECUTIVE'),
  salaryMin?:INT, salaryMax?:INT, salaryCurrency? default 'USD',
  skills:ARRAY(STRING) default [], isActive:BOOL default true,
  applicantsCount:INT default 0, createdAt, updatedAt }
// index(company_id) · index(is_active, created_at DESC)

// Application → "applications"
{ id:UUID pk, jobId, applicantId, resumeUrl?, coverLetter?(TEXT),
  status:ENUM('SUBMITTED','REVIEWED','SHORTLISTED','REJECTED','HIRED','WITHDRAWN')
         default 'SUBMITTED', createdAt, updatedAt }
// unique(job_id,applicant_id) · index(applicant_id)

// SavedJob → "saved_jobs"   (composite pk user_id+job_id)
{ userId, jobId, createdAt }
```
Company `hasMany` Job (`CASCADE`); Job `hasMany` Application / SavedJob (`CASCADE`).

### 3.8 Media Service — `media_db`

```ts
// Media → "media"   (metadata; bytes live in MinIO/S3)
{ id:UUID pk, uploaderId, fileName, mimeType, size:INT, url, thumbnailUrl?,
  bucket:STRING default 'uploads', key:STRING unique, width?:INT, height?:INT,
  status:ENUM('PROCESSING','READY','FAILED') default 'PROCESSING', createdAt }
// index(uploader_id)
```

> **Search Service** has no relational database — it indexes documents into **Elasticsearch** (`users`, `posts`, `jobs`, `companies` indices) populated by RabbitMQ consumers.

---

## 4. Service Boilerplate Pattern

Every service follows identical structure:

```
services/<name>-service/
├── src/
│   ├── config/
│   │   └── index.ts           # env parsing + validation via zod
│   ├── models/
│   │   ├── <Entity>.ts        # Sequelize Model.init definitions
│   │   └── index.ts           # associations wired here
│   ├── repositories/
│   │   └── <domain>.repository.ts  # all DB access (Sequelize queries)
│   ├── services/
│   │   └── <domain>.service.ts      # business logic, calls repositories + publishers
│   ├── controllers/
│   │   └── <domain>.controller.ts
│   ├── routes/
│   │   ├── <domain>.routes.ts
│   │   └── index.ts
│   ├── validators/
│   │   └── <domain>.validators.ts   # zod request schemas
│   ├── events/
│   │   ├── publishers.ts      # outgoing RabbitMQ events
│   │   └── consumers.ts       # incoming RabbitMQ handlers (only where needed)
│   ├── db/
│   │   └── sequelize.ts       # Sequelize singleton + assertDbConnection()
│   ├── app.ts                 # Express app (routes, middleware)
│   └── server.ts              # Listen + DB + RabbitMQ init + graceful shutdown
├── migrations/                # sequelize-cli migration files
├── config/
│   └── config.js              # sequelize-cli datasource (reads DATABASE_URL)
├── .sequelizerc               # points sequelize-cli at config/ + migrations/
├── Dockerfile
├── .env.example
├── tsconfig.json
└── package.json
```

> Identity is **not** parsed from JWTs in services. The gateway verifies the token and injects `x-user-id` / `x-user-role`; the shared `requireUser` middleware reads those headers into `req.userId` / `req.userRole`. Search-service omits `models/`, `db/`, `migrations/`, `config/`, `.sequelizerc` (Elasticsearch instead of Postgres); media-service additionally has a `storage/minio.ts` client.

### Boilerplate: `server.ts`

```typescript
import { rabbit, getRedis, closeRedis, createLogger } from '@linkedin-clone/shared';
import { app } from './app';
import { config } from './config';
import { sequelize, assertDbConnection } from './db/sequelize';
import { registerConsumers } from './events/consumers'; // only in services that consume

const logger = createLogger(config.SERVICE_NAME);

async function bootstrap(): Promise<void> {
  await assertDbConnection();
  await rabbit.connect(config.RABBITMQ_URL);
  await registerConsumers();               // omit in services without consumers
  if (config.REDIS_URL) getRedis(config.REDIS_URL);
  logger.info('RabbitMQ connected, consumers registered');

  const server = app.listen(config.PORT, () => {
    logger.info(`${config.SERVICE_NAME} listening on :${config.PORT}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down`);
    server.close();
    await rabbit.close();
    await closeRedis();
    await sequelize.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.fatal(err, 'fatal startup error');
  process.exit(1);
});
```

### Boilerplate: `app.ts`

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from '@linkedin-clone/shared';
import { config } from './config';
import { router } from './routes';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: config.SERVICE_NAME });
});

app.use('/api', router);

app.use(notFoundHandler);
app.use(errorHandler);
```

---

## 5. Auth Flow — JWT Strategy

### Token Architecture

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token | 15 min | Memory / `Authorization` header | API authentication |
| Refresh Token | 7 days | `httpOnly` cookie + DB row | Silent token renewal |

### Access Token Payload

```typescript
interface JwtPayload {
  sub: string;      // userId
  email: string;
  role: 'USER' | 'ADMIN' | 'RECRUITER';
  iat: number;
  exp: number;
}
```

### Auth Middleware (Gateway-level)

```typescript
// services/api-gateway/src/middleware/authenticate.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const payload = jwt.verify(header.slice(7), config.JWT_ACCESS_SECRET) as JwtPayload;
    req.headers['x-user-id'] = payload.sub;
    req.headers['x-user-role'] = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

Downstream services trust `x-user-id` and `x-user-role` headers injected by the gateway — they never parse JWTs themselves.

### Token Refresh Flow

```
Client → POST /api/auth/refresh (httpOnly cookie)
  → auth-service validates refreshToken in DB
  → rotates: deletes old token, issues new access + refresh pair
  → returns new accessToken in body, new refreshToken in cookie
```

---

## 6. API Gateway Routing

### NGINX Reverse Proxy

```nginx
# infra/nginx/nginx.conf
upstream auth      { server auth-service:3001; }
upstream users     { server user-service:3002; }
upstream connections { server connection-service:3003; }
upstream posts     { server post-service:3004; }
upstream messaging { server messaging-service:3005; }
upstream notifications { server notification-service:3006; }
upstream search    { server search-service:3007; }
upstream media     { server media-service:3008; }
upstream jobs      { server job-service:3009; }

server {
  listen 80;

  # Health
  location /health { return 200 'ok'; }

  # Auth — no JWT required
  location /api/auth/    { proxy_pass http://auth/api/; }

  # All others — routed through api-gateway for JWT verification
  location /api/ {
    proxy_pass http://api-gateway:3000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

### Gateway Route Map

```typescript
// services/api-gateway/src/routes/proxy.ts
import { createProxyMiddleware } from 'http-proxy-middleware';

const routes = [
  { path: '/api/users',        target: 'http://user-service:3002' },
  { path: '/api/connections',   target: 'http://connection-service:3003' },
  { path: '/api/posts',         target: 'http://post-service:3004' },
  { path: '/api/messaging',     target: 'http://messaging-service:3005' },
  { path: '/api/notifications', target: 'http://notification-service:3006' },
  { path: '/api/search',        target: 'http://search-service:3007' },
  { path: '/api/media',         target: 'http://media-service:3008' },
  { path: '/api/jobs',          target: 'http://job-service:3009' },
];

export function registerProxies(app: Express) {
  for (const { path, target } of routes) {
    app.use(path, authenticate, createProxyMiddleware({ target, changeOrigin: true }));
  }
}
```

---

## 7. Full API Endpoint Reference

### Auth Service — `/api/auth`
```
POST   /register              Register with email + password
POST   /login                 Login → access + refresh tokens
POST   /refresh               Rotate refresh token
POST   /logout                Revoke refresh token
POST   /forgot-password       Send reset email
POST   /reset-password        Reset via token
GET    /verify/:token         Email verification
POST   /oauth/google          Google OAuth2 callback
POST   /oauth/github          GitHub OAuth2 callback
```

### User Service — `/api/users`
```
GET    /me                    Current user profile
GET    /:id                   Public profile by ID
PUT    /me                    Update profile
PATCH  /me/avatar             Update avatar URL
PATCH  /me/banner             Update banner URL

GET    /me/experience         List experiences
POST   /me/experience         Add experience
PUT    /me/experience/:id     Update experience
DELETE /me/experience/:id     Delete experience

GET    /me/education          List educations
POST   /me/education          Add education
PUT    /me/education/:id      Update education
DELETE /me/education/:id      Delete education

GET    /me/skills             List skills
POST   /me/skills             Add skill
DELETE /me/skills/:skillId    Remove skill
POST   /me/skills/:skillId/endorse   Endorse someone's skill

GET    /me/certifications     List certifications
POST   /me/certifications     Add certification
DELETE /me/certifications/:id Delete certification
```

### Connection Service — `/api/connections`
```
GET    /                      List connections (status filter)
GET    /requests/pending      Pending incoming requests
GET    /mutual/:userId        Mutual connections
POST   /request               Send connection request
PUT    /request/:id/accept    Accept request
PUT    /request/:id/reject    Reject request
DELETE /request/:id           Withdraw request

POST   /follow/:userId        Follow user
DELETE /follow/:userId        Unfollow user
GET    /followers             List followers
GET    /following             List following

POST   /block/:userId         Block user
DELETE /block/:userId         Unblock user
```

### Post Service — `/api/posts`
```
GET    /feed                  Personalized feed (cursor pagination)
GET    /:id                   Single post
POST   /                      Create post
PUT    /:id                   Edit post
DELETE /:id                   Soft delete post

POST   /:id/react             Add/update reaction
DELETE /:id/react             Remove reaction

GET    /:id/comments          List comments (threaded)
POST   /:id/comments          Add comment
PUT    /comments/:commentId   Edit comment
DELETE /comments/:commentId   Delete comment

GET    /hashtags/trending     Trending hashtags
GET    /hashtags/:name        Posts by hashtag
```

### Messaging Service — `/api/messaging`
```
GET    /conversations                      List conversations
POST   /conversations                      Start new conversation
GET    /conversations/:id                  Conversation detail
GET    /conversations/:id/messages         Messages (cursor)
POST   /conversations/:id/messages         Send message
PUT    /conversations/:id/messages/:msgId  Edit message
DELETE /conversations/:id/messages/:msgId  Delete message
POST   /conversations/:id/read             Mark as read
```

### Notification Service — `/api/notifications`
```
GET    /                      List notifications (cursor)
GET    /unread-count          Unread count
PUT    /:id/read              Mark one as read
PUT    /read-all              Mark all as read
GET    /preferences           Get notification preferences
PUT    /preferences           Update preferences
```

### Search Service — `/api/search`
```
GET    /users?q=              Search users
GET    /posts?q=              Search posts
GET    /jobs?q=               Search jobs
GET    /companies?q=          Search companies
GET    /autocomplete?q=       Autocomplete suggestions
```

### Media Service — `/api/media`
```
POST   /upload                Multipart file upload → URL
POST   /upload/presigned      Get presigned upload URL
GET    /:id                   Get media metadata
DELETE /:id                   Delete media
```

### Job Service — `/api/jobs`
```
GET    /                      List active jobs (filter, paginate)
GET    /:id                   Job detail
POST   /                      Create job (RECRUITER/ADMIN)
PUT    /:id                   Update job
DELETE /:id                   Close/delete job

POST   /:id/apply             Apply to job
GET    /:id/applications      List applications (poster only)
PUT    /applications/:id/status  Update application status
GET    /me/applications       My applications

POST   /:id/save              Save job
DELETE /:id/save              Unsave job
GET    /me/saved              List saved jobs

GET    /companies              List companies
GET    /companies/:slug        Company detail
POST   /companies              Create company
PUT    /companies/:id          Update company
```

---

## 8. Event-Driven Communication Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RabbitMQ Exchanges                              │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  connection.events (topic)                                             │
│    routing_key: connection.requested  → notify.connection.request       │
│    routing_key: connection.accepted   → notify.connection.accepted      │
│    routing_key: connection.*          → search.index.user               │
│                                                                        │
│  post.events (topic)                                                   │
│    routing_key: post.created         → search.index.post               │
│    routing_key: post.reacted         → notify.post.reaction            │
│    routing_key: post.commented       → notify.comment                  │
│    routing_key: post.deleted         → search.remove.post              │
│                                                                        │
│  user.events (topic)                                                   │
│    routing_key: user.registered      → search.index.user               │
│    routing_key: user.updated         → search.index.user               │
│                                                                        │
│  job.events (topic)                                                    │
│    routing_key: job.created          → search.index.job                │
│    routing_key: job.applied          → notify.job.application          │
│                                                                        │
│  notification.direct (direct)                                          │
│    routing_key: email               → notification-service (email)     │
│    routing_key: push                → notification-service (push)      │
│                                                                        │
│  media.processing (direct)                                             │
│    routing_key: resize              → media-service (resize worker)    │
│    routing_key: thumbnail           → media-service (thumbnail worker) │
│                                                                        │
│  DLQ: Every queue has a dead-letter exchange → dlq.<domain>            │
│  Retry: 3 attempts with exponential backoff (1s, 5s, 25s)             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Feed Algorithm (Simplified)

The feed service fetches the viewer's social graph from connection-service over HTTP (degrading to just the viewer's own posts if that call fails), then keyset-paginates posts by `createdAt`. DB access lives in the repository; the shared `buildCursorPage` helper splits the `limit + 1` row and computes the next cursor.

```typescript
// services/post-service/src/services/feed.service.ts
public getFeed = async (userId: string, cursor?: string, limit = config.FEED_PAGE_SIZE): Promise<FeedPage> => {
  // 1–2. Connection + following ids (HTTP → connection-service)
  const [connectionIds, followingIds] = await Promise.all([
    connectionClient.getConnectionIds(userId),
    connectionClient.getFollowingIds(userId),
  ]);

  const authorIds = [...new Set([...connectionIds, ...followingIds, userId])];

  // 3. Repository runs the keyset query (Sequelize) honoring visibility:
  //    deletedAt IS NULL, createdAt < cursor, and
  //    (visibility = PUBLIC) OR (visibility = CONNECTIONS AND author ∈ connectionIds) OR (author = self)
  const rows = await postRepository.feedPage({ authorIds, connectionIds, viewerId: userId, cursor, limit });

  const { items, nextCursor, hasMore } = buildCursorPage(rows, limit, (p) => p.createdAt.toISOString());
  return { posts: items, nextCursor, hasMore };
};
```

```typescript
// services/post-service/src/repositories/post.repository.ts — the keyset query
return Post.findAll({
  where: {
    authorId: { [Op.in]: authorIds },
    deletedAt: null,
    ...(cursor ? { createdAt: { [Op.lt]: new Date(cursor) } } : {}),
    [Op.or]: [
      { visibility: 'PUBLIC' },
      { visibility: 'CONNECTIONS', authorId: { [Op.in]: connectionIds } },
      { authorId: viewerId },
    ],
  },
  order: [['createdAt', 'DESC']],
  limit: limit + 1, // one extra row drives the next cursor
});
```

---

## 10. Dockerfile (Shared Pattern)

Two-stage build using **npm workspaces** (the shared package is built first, then the service). Postgres-backed services also copy their migration assets so migrations can run against the database.

```dockerfile
# syntax=docker/dockerfile:1
# services/<name>-service/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/<name>-service ./services/<name>-service
RUN npm install --no-audit --no-fund
RUN npm run build -w @linkedin-clone/shared
RUN npm run build -w @linkedin-clone/<name>-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/<name>-service/package.json ./services/<name>-service/
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/services/<name>-service/dist ./services/<name>-service/dist
# Migration assets (Postgres services only) — run `npm run db:migrate -w @linkedin-clone/<name>-service`
COPY services/<name>-service/.sequelizerc ./services/<name>-service/
COPY services/<name>-service/config ./services/<name>-service/config
COPY services/<name>-service/migrations ./services/<name>-service/migrations
EXPOSE 300X
CMD ["node", "services/<name>-service/dist/server.js"]
```

---

## 11. Docker Compose

```yaml
# infra/docker-compose.yml
version: '3.9'

x-service-defaults: &service-defaults
  restart: unless-stopped
  networks:
    - linkedin-net
  depends_on:
    rabbitmq:
      condition: service_healthy
    redis:
      condition: service_healthy

services:
  # ─── Infrastructure ────────────────────────────────────
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - api-gateway
    networks:
      - linkedin-net

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: linkedin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-databases.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U linkedin"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - linkedin-net

  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: linkedin
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    healthcheck:
      test: rabbitmq-diagnostics -q check_running
      interval: 10s
      timeout: 10s
      retries: 5
    networks:
      - linkedin-net

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - linkedin-net

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - es-data:/usr/share/elasticsearch/data
    healthcheck:
      test: curl -s http://localhost:9200/_cluster/health | grep -q '"status":"green\|yellow"'
      interval: 15s
      timeout: 10s
      retries: 5
    networks:
      - linkedin-net

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data
    networks:
      - linkedin-net

  # ─── Services ──────────────────────────────────────────
  api-gateway:
    <<: *service-defaults
    build:
      context: ../
      dockerfile: services/api-gateway/Dockerfile
    ports:
      - "3000:3000"
    environment:
      PORT: 3000
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379

  auth-service:
    <<: *service-defaults
    build:
      context: ../
      dockerfile: services/auth-service/Dockerfile
    ports:
      - "3001:3001"
    environment:
      PORT: 3001
      DATABASE_URL: postgresql://linkedin:${POSTGRES_PASSWORD}@postgres:5432/auth_db
      RABBITMQ_URL: amqp://linkedin:${RABBITMQ_PASSWORD}@rabbitmq:5672
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}

  user-service:
    <<: *service-defaults
    build:
      context: ../
      dockerfile: services/user-service/Dockerfile
    ports:
      - "3002:3002"
    environment:
      PORT: 3002
      DATABASE_URL: postgresql://linkedin:${POSTGRES_PASSWORD}@postgres:5432/user_db
      RABBITMQ_URL: amqp://linkedin:${RABBITMQ_PASSWORD}@rabbitmq:5672
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379

  connection-service:
    <<: *service-defaults
    build:
      context: ../
      dockerfile: services/connection-service/Dockerfile
    ports:
      - "3003:3003"
    environment:
      PORT: 3003
      DATABASE_URL: postgresql://linkedin:${POSTGRES_PASSWORD}@postgres:5432/connection_db
      RABBITMQ_URL: amqp://linkedin:${RABBITMQ_PASSWORD}@rabbitmq:5672
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379

  post-service:
    <<: *service-defaults
    build:
      context: ../
      dockerfile: services/post-service/Dockerfile
    ports:
      - "3004:3004"
    environment:
      PORT: 3004
      DATABASE_URL: postgresql://linkedin:${POSTGRES_PASSWORD}@postgres:5432/post_db
      RABBITMQ_URL: amqp://linkedin:${RABBITMQ_PASSWORD}@rabbitmq:5672
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379

  messaging-service:
    <<: *service-defaults
    build:
      context: ../
      dockerfile: services/messaging-service/Dockerfile
    ports:
      - "3005:3005"
    environment:
      PORT: 3005
      DATABASE_URL: postgresql://linkedin:${POSTGRES_PASSWORD}@postgres:5432/messaging_db
      RABBITMQ_URL: amqp://linkedin:${RABBITMQ_PASSWORD}@rabbitmq:5672
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379

  notification-service:
    <<: *service-defaults
    build:
      context: ../
      dockerfile: services/notification-service/Dockerfile
    ports:
      - "3006:3006"
    environment:
      PORT: 3006
      DATABASE_URL: postgresql://linkedin:${POSTGRES_PASSWORD}@postgres:5432/notification_db
      RABBITMQ_URL: amqp://linkedin:${RABBITMQ_PASSWORD}@rabbitmq:5672
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379

  search-service:
    <<: *service-defaults
    build:
      context: ../
      dockerfile: services/search-service/Dockerfile
    ports:
      - "3007:3007"
    environment:
      PORT: 3007
      ELASTICSEARCH_URL: http://elasticsearch:9200
      RABBITMQ_URL: amqp://linkedin:${RABBITMQ_PASSWORD}@rabbitmq:5672
    depends_on:
      elasticsearch:
        condition: service_healthy

  media-service:
    <<: *service-defaults
    build:
      context: ../
      dockerfile: services/media-service/Dockerfile
    ports:
      - "3008:3008"
    environment:
      PORT: 3008
      DATABASE_URL: postgresql://linkedin:${POSTGRES_PASSWORD}@postgres:5432/media_db
      RABBITMQ_URL: amqp://linkedin:${RABBITMQ_PASSWORD}@rabbitmq:5672
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}

  job-service:
    <<: *service-defaults
    build:
      context: ../
      dockerfile: services/job-service/Dockerfile
    ports:
      - "3009:3009"
    environment:
      PORT: 3009
      DATABASE_URL: postgresql://linkedin:${POSTGRES_PASSWORD}@postgres:5432/job_db
      RABBITMQ_URL: amqp://linkedin:${RABBITMQ_PASSWORD}@rabbitmq:5672
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379

volumes:
  postgres-data:
  rabbitmq-data:
  redis-data:
  es-data:
  minio-data:

networks:
  linkedin-net:
    driver: bridge
```

### Database Initialization Script

```sql
-- infra/init-databases.sql
CREATE DATABASE auth_db;
CREATE DATABASE user_db;
CREATE DATABASE connection_db;
CREATE DATABASE post_db;
CREATE DATABASE messaging_db;
CREATE DATABASE notification_db;
CREATE DATABASE media_db;
CREATE DATABASE job_db;
```

---

## 12. GitHub Actions CI/CD

### CI Pipeline — Lint, Test, Build

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/${{ github.repository_owner }}/linkedin-clone

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci

      - name: Build shared package
        run: npm run build:shared

      - name: Lint
        run: npm run lint

      - name: Type Check
        run: npm run typecheck

      - name: Unit Tests
        run: npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      services: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            api-gateway:       ['services/api-gateway/**', 'packages/shared/**']
            auth-service:      ['services/auth-service/**', 'packages/shared/**']
            user-service:      ['services/user-service/**', 'packages/shared/**']
            connection-service:['services/connection-service/**', 'packages/shared/**']
            post-service:      ['services/post-service/**', 'packages/shared/**']
            messaging-service: ['services/messaging-service/**', 'packages/shared/**']
            notification-service:['services/notification-service/**', 'packages/shared/**']
            search-service:    ['services/search-service/**', 'packages/shared/**']
            media-service:     ['services/media-service/**', 'packages/shared/**']
            job-service:       ['services/job-service/**', 'packages/shared/**']

  build-and-push:
    needs: [lint-and-test, detect-changes]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: ${{ fromJson(needs.detect-changes.outputs.services) }}
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build & Push
        uses: docker/build-push-action@v6
        with:
          context: .
          file: services/${{ matrix.service }}/Dockerfile
          push: true
          tags: |
            ${{ env.IMAGE_PREFIX }}/${{ matrix.service }}:latest
            ${{ env.IMAGE_PREFIX }}/${{ matrix.service }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Deploy Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]

jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/linkedin-clone
            git pull origin main

            # Pull latest images
            docker compose -f infra/docker-compose.yml \
              -f infra/docker-compose.prod.yml \
              pull

            # Rolling update — one service at a time
            SERVICES=(
              api-gateway auth-service user-service
              connection-service post-service messaging-service
              notification-service search-service media-service
              job-service
            )
            for svc in "${SERVICES[@]}"; do
              docker compose -f infra/docker-compose.yml \
                -f infra/docker-compose.prod.yml \
                up -d --no-deps --build "$svc"
              sleep 10  # health check window
            done

            # Cleanup
            docker image prune -f
```

---

## 13. Environment Variables Template

```env
# .env.example

# ─── Secrets ─────────────────────────
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
POSTGRES_PASSWORD=strong-postgres-password
RABBITMQ_PASSWORD=strong-rabbitmq-password
REDIS_PASSWORD=strong-redis-password
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# ─── OAuth (auth-service) ───────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# ─── Email (notification-service) ───
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# ─── General ────────────────────────
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

---

## 14. Migration Workflow (sequelize-cli)

```bash
# Per-service commands. Run from the repo root via workspaces, e.g.:

# Create a migration after a model change (writes to services/<svc>/migrations/)
npx sequelize-cli migration:generate --name add_oauth_fields \
  --options-path services/auth-service/.sequelizerc

# Apply pending migrations (dev or prod) — DATABASE_URL is read from the env
npm run db:migrate -w @linkedin-clone/auth-service

# Roll back the last migration
npm run db:migrate:undo -w @linkedin-clone/auth-service

# Apply migrations for every service that defines db:migrate
npm run db:migrate            # root — fans out across workspaces
```

Each Postgres service has its own `migrations/` history, its own `config/config.js` datasource (reads `DATABASE_URL`), and its own database — they are completely independent. `config/config.js` enables Postgres TLS in production via the `DB_SSL` / `DB_SSL_NO_VERIFY` env vars. Search-service has no migrations (Elasticsearch indices are asserted at boot by `ensureIndices()`).

---

## 15. Redis Caching Strategy

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `session:<userId>` | 15 min | Cached JWT payload for gateway |
| `profile:<userId>` | 10 min | User profile cache |
| `connections:<userId>` | 5 min | Connection ID list |
| `feed:<userId>:<cursor>` | 2 min | Feed page cache |
| `unread:<userId>` | 30 sec | Notification unread count |
| `rate:<ip>:<endpoint>` | 1 min | Rate limit sliding window |
| `online:<userId>` | 60 sec | Presence heartbeat |
| `typing:<conversationId>:<userId>` | 5 sec | Typing indicator |

---

## 16. Project Scripts (Root `package.json`)

The monorepo uses **npm workspaces** (`packages/*`, `services/*`) — no Turborepo/pnpm. `dev` runs a custom orchestrator (`scripts/dev.js`) that builds `shared` in watch mode and starts every service with a `dev` script concurrently (services are discovered dynamically, so new ones are picked up automatically).

```json
{
  "name": "linkedin-clone",
  "private": true,
  "workspaces": ["packages/*", "services/*"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "build:shared": "npm run build -w @linkedin-clone/shared",
    "dev": "node scripts/dev.js",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "db:migrate": "npm run db:migrate --workspaces --if-present",
    "db:seed": "npm run db:seed --workspaces --if-present",
    "docker:up": "docker compose -f infra/docker-compose.yml up -d",
    "docker:down": "docker compose -f infra/docker-compose.yml down",
    "docker:logs": "docker compose -f infra/docker-compose.yml logs -f",
    "docker:build": "docker compose -f infra/docker-compose.yml build",
    "infra:up": "docker compose -f infra/docker-compose.yml up -d postgres rabbitmq redis elasticsearch minio"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "concurrently": "^8.2.2",
    "typescript": "^5.4.5"
  },
  "engines": { "node": ">=20" }
}
```

---

## 17. Development Workflow

```bash
# 1. Clone and install (npm workspaces)
git clone <repo> && cd linkedin-clone
npm install

# 2. Start infrastructure (postgres, rabbitmq, redis, elasticsearch, minio)
npm run infra:up

# 3. Build the shared package (services import its compiled dist)
npm run build:shared

# 4. Run migrations for all Postgres services
npm run db:migrate

# 5. Start all services in dev mode (shared in watch + every service, hot-reload)
npm run dev

# 6. Access
#    API:            http://localhost:80/api   (via NGINX → api-gateway)
#    RabbitMQ UI:    http://localhost:15672
#    MinIO Console:  http://localhost:9001
#    Elasticsearch:  http://localhost:9200
```

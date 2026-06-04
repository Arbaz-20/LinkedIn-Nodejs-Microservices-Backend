# LinkedIn Clone — Microservices Backend Architecture Plan

**Stack:** TypeScript · Node.js · Express 4 · Prisma ORM · PostgreSQL · Redis · RabbitMQ · JWT · Docker · GitHub Actions

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
│   └── shared/               # DTOs, constants, RabbitMQ helpers, logger
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── nginx/
│       └── nginx.conf
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── turbo.json
└── package.json              # Turborepo root
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
│   │   ├── queues.ts          # RabbitMQ queue/exchange names
│   │   └── events.ts          # Event type enums
│   ├── dto/
│   │   ├── user.dto.ts
│   │   ├── post.dto.ts
│   │   ├── notification.dto.ts
│   │   └── index.ts
│   ├── middleware/
│   │   ├── errorHandler.ts    # Global Express error handler
│   │   ├── validate.ts        # Zod validation middleware
│   │   └── rateLimiter.ts     # Token-bucket via Redis
│   ├── rabbitmq/
│   │   ├── connection.ts      # Channel pool manager
│   │   ├── publisher.ts       # Publish with retry + confirm
│   │   └── consumer.ts        # Consumer with DLQ + manual ack
│   ├── logger/
│   │   └── index.ts           # Pino structured logger
│   ├── redis/
│   │   └── client.ts          # ioredis singleton
│   └── utils/
│       ├── asyncHandler.ts    # Wraps async route handlers
│       └── pagination.ts      # Cursor & offset helpers
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

## 3. Database Schemas (Prisma)

### 3.1 Auth Service — `auth_db`

```prisma
// services/auth-service/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String    @id @default(uuid())
  email          String    @unique
  passwordHash   String    @map("password_hash")
  isVerified     Boolean   @default(false) @map("is_verified")
  verifyToken    String?   @map("verify_token")
  resetToken     String?   @map("reset_token")
  resetExpiry    DateTime? @map("reset_expiry")
  oauthProvider  String?   @map("oauth_provider")
  oauthId        String?   @map("oauth_id")
  role           Role      @default(USER)
  lastLoginAt    DateTime? @map("last_login_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  refreshTokens  RefreshToken[]

  @@unique([oauthProvider, oauthId])
  @@map("users")
}

model RefreshToken {
  id          String   @id @default(uuid())
  token       String   @unique
  userId      String   @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  deviceInfo  String?  @map("device_info")
  expiresAt   DateTime @map("expires_at")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([userId])
  @@map("refresh_tokens")
}

enum Role {
  USER
  ADMIN
  RECRUITER
}
```

### 3.2 User Service — `user_db`

```prisma
// services/user-service/prisma/schema.prisma
model Profile {
  id            String   @id @default(uuid()) // Same as auth user ID
  firstName     String   @map("first_name")
  lastName      String   @map("last_name")
  headline      String?
  summary       String?  @db.Text
  avatarUrl     String?  @map("avatar_url")
  bannerUrl     String?  @map("banner_url")
  location      String?
  website       String?
  industry      String?
  isOpenToWork  Boolean  @default(false) @map("is_open_to_work")
  profileViews  Int      @default(0) @map("profile_views")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  experiences   Experience[]
  educations    Education[]
  skills        ProfileSkill[]
  certifications Certification[]

  @@map("profiles")
}

model Experience {
  id          String    @id @default(uuid())
  profileId   String    @map("profile_id")
  profile     Profile   @relation(fields: [profileId], references: [id], onDelete: Cascade)
  title       String
  company     String
  companyLogo String?   @map("company_logo")
  location    String?
  startDate   DateTime  @map("start_date")
  endDate     DateTime? @map("end_date")
  isCurrent   Boolean   @default(false) @map("is_current")
  description String?   @db.Text
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([profileId])
  @@map("experiences")
}

model Education {
  id           String    @id @default(uuid())
  profileId    String    @map("profile_id")
  profile      Profile   @relation(fields: [profileId], references: [id], onDelete: Cascade)
  school       String
  degree       String?
  fieldOfStudy String?   @map("field_of_study")
  startYear    Int       @map("start_year")
  endYear      Int?      @map("end_year")
  grade        String?
  activities   String?   @db.Text
  createdAt    DateTime  @default(now()) @map("created_at")

  @@index([profileId])
  @@map("educations")
}

model Skill {
  id       String         @id @default(uuid())
  name     String         @unique
  category String?

  profiles ProfileSkill[]
  @@map("skills")
}

model ProfileSkill {
  profileId      String  @map("profile_id")
  skillId        String  @map("skill_id")
  profile        Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  skill          Skill   @relation(fields: [skillId], references: [id], onDelete: Cascade)
  endorsements   Int     @default(0)

  @@id([profileId, skillId])
  @@map("profile_skills")
}

model Certification {
  id             String    @id @default(uuid())
  profileId      String    @map("profile_id")
  profile        Profile   @relation(fields: [profileId], references: [id], onDelete: Cascade)
  name           String
  issuingOrg     String    @map("issuing_org")
  issueDate      DateTime  @map("issue_date")
  expirationDate DateTime? @map("expiration_date")
  credentialId   String?   @map("credential_id")
  credentialUrl  String?   @map("credential_url")

  @@index([profileId])
  @@map("certifications")
}
```

### 3.3 Connection Service — `connection_db`

```prisma
// services/connection-service/prisma/schema.prisma
model Connection {
  id          String           @id @default(uuid())
  requesterId String          @map("requester_id")
  addresseeId String          @map("addressee_id")
  status      ConnectionStatus @default(PENDING)
  note        String?
  createdAt   DateTime         @default(now()) @map("created_at")
  updatedAt   DateTime         @updatedAt @map("updated_at")

  @@unique([requesterId, addresseeId])
  @@index([addresseeId, status])
  @@index([requesterId, status])
  @@map("connections")
}

model Follow {
  id          String   @id @default(uuid())
  followerId  String   @map("follower_id")
  followingId String   @map("following_id")
  createdAt   DateTime @default(now()) @map("created_at")

  @@unique([followerId, followingId])
  @@index([followingId])
  @@map("follows")
}

model Block {
  id         String   @id @default(uuid())
  blockerId  String   @map("blocker_id")
  blockedId  String   @map("blocked_id")
  createdAt  DateTime @default(now()) @map("created_at")

  @@unique([blockerId, blockedId])
  @@map("blocks")
}

enum ConnectionStatus {
  PENDING
  ACCEPTED
  REJECTED
  WITHDRAWN
}
```

### 3.4 Post Service — `post_db`

```prisma
// services/post-service/prisma/schema.prisma
model Post {
  id          String     @id @default(uuid())
  authorId    String     @map("author_id")
  content     String     @db.Text
  mediaUrls   String[]   @map("media_urls")
  postType    PostType   @default(POST) @map("post_type")
  visibility  Visibility @default(PUBLIC)
  isEdited    Boolean    @default(false) @map("is_edited")
  likesCount  Int        @default(0) @map("likes_count")
  commentsCount Int      @default(0) @map("comments_count")
  sharesCount Int        @default(0) @map("shares_count")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")
  deletedAt   DateTime?  @map("deleted_at")

  comments    Comment[]
  reactions   Reaction[]
  hashtags    PostHashtag[]

  @@index([authorId, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@map("posts")
}

model Comment {
  id        String    @id @default(uuid())
  postId    String    @map("post_id")
  post      Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  authorId  String    @map("author_id")
  parentId  String?   @map("parent_id")
  parent    Comment?  @relation("Replies", fields: [parentId], references: [id])
  replies   Comment[] @relation("Replies")
  content   String    @db.Text
  likesCount Int      @default(0) @map("likes_count")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@index([postId, createdAt])
  @@index([parentId])
  @@map("comments")
}

model Reaction {
  id       String       @id @default(uuid())
  postId   String       @map("post_id")
  post     Post         @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId   String       @map("user_id")
  type     ReactionType @default(LIKE)

  @@unique([postId, userId])
  @@map("reactions")
}

model Hashtag {
  id    String        @id @default(uuid())
  name  String        @unique
  posts PostHashtag[]

  @@map("hashtags")
}

model PostHashtag {
  postId    String  @map("post_id")
  hashtagId String  @map("hashtag_id")
  post      Post    @relation(fields: [postId], references: [id], onDelete: Cascade)
  hashtag   Hashtag @relation(fields: [hashtagId], references: [id], onDelete: Cascade)

  @@id([postId, hashtagId])
  @@map("post_hashtags")
}

enum PostType {
  POST
  ARTICLE
  POLL
  SHARE
  CELEBRATION
}

enum Visibility {
  PUBLIC
  CONNECTIONS
  PRIVATE
}

enum ReactionType {
  LIKE
  CELEBRATE
  SUPPORT
  LOVE
  INSIGHTFUL
  FUNNY
}
```

### 3.5 Messaging Service — `messaging_db`

```prisma
// services/messaging-service/prisma/schema.prisma
model Conversation {
  id           String    @id @default(uuid())
  isGroup      Boolean   @default(false) @map("is_group")
  groupName    String?   @map("group_name")
  groupAvatar  String?   @map("group_avatar")
  lastMessageAt DateTime? @map("last_message_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  participants Participant[]
  messages     Message[]

  @@index([lastMessageAt(sort: Desc)])
  @@map("conversations")
}

model Participant {
  id              String       @id @default(uuid())
  conversationId  String       @map("conversation_id")
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId          String       @map("user_id")
  joinedAt        DateTime     @default(now()) @map("joined_at")
  lastReadAt      DateTime?    @map("last_read_at")
  isMuted         Boolean      @default(false) @map("is_muted")

  @@unique([conversationId, userId])
  @@index([userId])
  @@map("participants")
}

model Message {
  id              String       @id @default(uuid())
  conversationId  String       @map("conversation_id")
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId        String       @map("sender_id")
  content         String?      @db.Text
  mediaUrl        String?      @map("media_url")
  messageType     MessageType  @default(TEXT) @map("message_type")
  isEdited        Boolean      @default(false) @map("is_edited")
  deletedAt       DateTime?    @map("deleted_at")
  createdAt       DateTime     @default(now()) @map("created_at")

  @@index([conversationId, createdAt(sort: Desc)])
  @@map("messages")
}

enum MessageType {
  TEXT
  IMAGE
  FILE
  SYSTEM
}
```

### 3.6 Notification Service — `notification_db`

```prisma
// services/notification-service/prisma/schema.prisma
model Notification {
  id          String           @id @default(uuid())
  recipientId String           @map("recipient_id")
  actorId     String?          @map("actor_id")
  type        NotificationType
  entityType  String?          @map("entity_type")
  entityId    String?          @map("entity_id")
  message     String
  isRead      Boolean          @default(false) @map("is_read")
  readAt      DateTime?        @map("read_at")
  metadata    Json?
  createdAt   DateTime         @default(now()) @map("created_at")

  @@index([recipientId, isRead, createdAt(sort: Desc)])
  @@map("notifications")
}

model NotificationPreference {
  id          String  @id @default(uuid())
  userId      String  @unique @map("user_id")
  inApp       Boolean @default(true) @map("in_app")
  email       Boolean @default(true)
  push        Boolean @default(true)
  connections Boolean @default(true)
  messages    Boolean @default(true)
  posts       Boolean @default(true)
  jobs        Boolean @default(true)

  @@map("notification_preferences")
}

enum NotificationType {
  CONNECTION_REQUEST
  CONNECTION_ACCEPTED
  POST_LIKE
  POST_COMMENT
  COMMENT_REPLY
  ENDORSEMENT
  PROFILE_VIEW
  JOB_RECOMMENDATION
  MESSAGE_RECEIVED
  MENTION
}
```

### 3.7 Job Service — `job_db`

```prisma
// services/job-service/prisma/schema.prisma
model Company {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  logoUrl     String?  @map("logo_url")
  bannerUrl   String?  @map("banner_url")
  website     String?
  industry    String?
  size        String?
  description String?  @db.Text
  location    String?
  foundedYear Int?     @map("founded_year")
  adminIds    String[] @map("admin_ids")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  jobs        Job[]

  @@map("companies")
}

model Job {
  id              String          @id @default(uuid())
  companyId       String          @map("company_id")
  company         Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  posterId        String          @map("poster_id")
  title           String
  description     String          @db.Text
  location        String?
  locationType    LocationType    @default(ONSITE) @map("location_type")
  employmentType  EmploymentType  @map("employment_type")
  experienceLevel ExperienceLevel @map("experience_level")
  salaryMin       Int?            @map("salary_min")
  salaryMax       Int?            @map("salary_max")
  salaryCurrency  String?         @default("USD") @map("salary_currency")
  skills          String[]
  isActive        Boolean         @default(true) @map("is_active")
  applicantsCount Int             @default(0) @map("applicants_count")
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  applications    Application[]
  savedBy         SavedJob[]

  @@index([companyId])
  @@index([isActive, createdAt(sort: Desc)])
  @@map("jobs")
}

model Application {
  id          String            @id @default(uuid())
  jobId       String            @map("job_id")
  job         Job               @relation(fields: [jobId], references: [id], onDelete: Cascade)
  applicantId String            @map("applicant_id")
  resumeUrl   String?           @map("resume_url")
  coverLetter String?           @map("cover_letter") @db.Text
  status      ApplicationStatus @default(SUBMITTED)
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")

  @@unique([jobId, applicantId])
  @@index([applicantId])
  @@map("applications")
}

model SavedJob {
  userId    String   @map("user_id")
  jobId     String   @map("job_id")
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now()) @map("created_at")

  @@id([userId, jobId])
  @@map("saved_jobs")
}

enum LocationType   { ONSITE  REMOTE  HYBRID }
enum EmploymentType { FULL_TIME  PART_TIME  CONTRACT  INTERNSHIP  FREELANCE }
enum ExperienceLevel { ENTRY  ASSOCIATE  MID_SENIOR  DIRECTOR  EXECUTIVE }
enum ApplicationStatus { SUBMITTED  REVIEWED  SHORTLISTED  REJECTED  HIRED  WITHDRAWN }
```

### 3.8 Media Service — `media_db`

```prisma
// services/media-service/prisma/schema.prisma
model Media {
  id          String    @id @default(uuid())
  uploaderId  String    @map("uploader_id")
  fileName    String    @map("file_name")
  mimeType    String    @map("mime_type")
  size        Int
  url         String
  thumbnailUrl String?  @map("thumbnail_url")
  bucket      String    @default("uploads")
  key         String    @unique
  width       Int?
  height      Int?
  status      MediaStatus @default(PROCESSING)
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([uploaderId])
  @@map("media")
}

enum MediaStatus { PROCESSING  READY  FAILED }
```

---

## 4. Service Boilerplate Pattern

Every service follows identical structure:

```
services/<name>-service/
├── src/
│   ├── config/
│   │   └── index.ts           # env parsing via envalid
│   ├── controllers/
│   │   └── <domain>.controller.ts
│   ├── services/
│   │   └── <domain>.service.ts
│   ├── routes/
│   │   └── <domain>.routes.ts
│   ├── events/
│   │   ├── publishers.ts      # outgoing RabbitMQ events
│   │   └── consumers.ts       # incoming RabbitMQ event handlers
│   ├── middleware/
│   │   └── auth.ts            # JWT extraction (injected userId)
│   ├── prisma/
│   │   └── client.ts          # PrismaClient singleton
│   ├── app.ts                 # Express app (routes, middleware)
│   └── server.ts              # Listen + RabbitMQ init + graceful shutdown
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── Dockerfile
├── .env.example
├── tsconfig.json
└── package.json
```

### Boilerplate: `server.ts`

```typescript
import { app } from './app';
import { config } from './config';
import { rabbit } from '@linkedin-clone/shared/rabbitmq';
import { prisma } from './prisma/client';
import { registerConsumers } from './events/consumers';
import { logger } from '@linkedin-clone/shared/logger';

async function bootstrap() {
  await rabbit.connect(config.RABBITMQ_URL);
  await registerConsumers();
  logger.info('RabbitMQ connected, consumers registered');

  const server = app.listen(config.PORT, () => {
    logger.info(`${config.SERVICE_NAME} running on :${config.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close();
    await rabbit.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.fatal(err, 'Fatal startup error');
  process.exit(1);
});
```

### Boilerplate: `app.ts`

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from '@linkedin-clone/shared/middleware';
import { router } from './routes';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api', router);
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

```typescript
// services/post-service/src/services/feed.service.ts
async function getFeed(userId: string, cursor?: string, limit = 20) {
  // 1. Get user's connection IDs (HTTP call to connection-service)
  const connectionIds = await getConnectionIds(userId);

  // 2. Get user's followed IDs
  const followingIds = await getFollowingIds(userId);

  const authorIds = [...new Set([...connectionIds, ...followingIds, userId])];

  // 3. Fetch posts from those authors, sorted by recency + engagement score
  const posts = await prisma.post.findMany({
    where: {
      authorId: { in: authorIds },
      deletedAt: null,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      OR: [
        { visibility: 'PUBLIC' },
        { visibility: 'CONNECTIONS', authorId: { in: connectionIds } },
        { authorId: userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,  // fetch one extra for cursor
  });

  const hasMore = posts.length > limit;
  const results = hasMore ? posts.slice(0, -1) : posts;
  const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

  return { posts: results, nextCursor, hasMore };
}
```

---

## 10. Dockerfile (Shared Pattern)

```dockerfile
# services/<any>-service/Dockerfile
FROM node:20-alpine AS base
RUN corepack enable

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/<name>-service/package.json ./services/<name>-service/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/<name>-service/node_modules ./services/<name>-service/node_modules
COPY packages/shared ./packages/shared
COPY services/<name>-service ./services/<name>-service

# Build shared first, then service
RUN pnpm --filter @linkedin-clone/shared run build
RUN pnpm --filter @linkedin-clone/<name>-service run build

# Prisma generate
RUN cd services/<name>-service && npx prisma generate

# --- Production ---
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/services/<name>-service/dist ./services/<name>-service/dist
COPY --from=build /app/services/<name>-service/prisma ./services/<name>-service/prisma
COPY --from=build /app/services/<name>-service/package.json ./services/<name>-service/
COPY --from=build /app/services/<name>-service/node_modules ./services/<name>-service/node_modules

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
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm turbo lint

      - name: Type Check
        run: pnpm turbo typecheck

      - name: Unit Tests
        run: pnpm turbo test -- --coverage
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

## 14. Prisma Migration Workflow

```bash
# Per-service migration commands (run from service directory)
cd services/auth-service

# Create migration after schema change
npx prisma migrate dev --name add_oauth_fields

# Apply in production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# Generate client after schema change
npx prisma generate
```

Each service has its own `prisma/` directory, own migration history, and its own database. They are completely independent.

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

```json
{
  "name": "linkedin-clone",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "test:e2e": "turbo test:e2e",
    "db:migrate": "turbo db:migrate",
    "db:generate": "turbo db:generate",
    "db:seed": "turbo db:seed",
    "docker:up": "docker compose -f infra/docker-compose.yml up -d",
    "docker:down": "docker compose -f infra/docker-compose.yml down",
    "docker:logs": "docker compose -f infra/docker-compose.yml logs -f",
    "docker:build": "docker compose -f infra/docker-compose.yml build",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

---

## 17. Development Workflow

```bash
# 1. Clone and install
git clone <repo> && cd linkedin-clone
pnpm install

# 2. Start infrastructure
docker compose -f infra/docker-compose.yml up -d postgres rabbitmq redis elasticsearch minio

# 3. Run migrations for all services
pnpm db:migrate

# 4. Seed databases
pnpm db:seed

# 5. Start all services in dev mode (hot-reload)
pnpm dev

# 6. Access
#    API:            http://localhost:80/api
#    RabbitMQ UI:    http://localhost:15672
#    MinIO Console:  http://localhost:9001
#    Elasticsearch:  http://localhost:9200
```

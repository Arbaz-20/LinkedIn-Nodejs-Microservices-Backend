# Data Models

Each service owns its database and defines models with **Sequelize 6**
(`Model<InferAttributes, InferCreationAttributes>` + `Model.init`). Conventions applied
everywhere:

- **UUID primary keys** (`DataTypes.UUID` / `UUIDV4`); migrations default ids to `gen_random_uuid()`.
- **snake_case columns** via global `define: { underscored: true }` plus explicit `field:`
  overrides where needed.
- **Postgres enums** (`DataTypes.ENUM`) surface in TypeScript as string unions.
- Schema changes ship as **sequelize-cli migrations** under each service's `migrations/`. Models
  are never auto-synced.

Notation below: `attribute: TYPE` with `?` marking nullable, plus indexes/constraints in comments.

---

## auth-service — `auth_db`

### `users`
```
id            UUID pk default uuidv4
email         STRING unique
passwordHash  STRING                 → password_hash
isVerified    BOOLEAN default false  → is_verified
verifyToken   STRING?                → verify_token
resetToken    STRING?                → reset_token
resetExpiry   DATE?                  → reset_expiry
oauthProvider STRING?                → oauth_provider
oauthId       STRING?                → oauth_id
role          ENUM('USER','ADMIN','RECRUITER') default 'USER'
lastLoginAt   DATE?                  → last_login_at
createdAt / updatedAt  DATE
```
*unique (oauth_provider, oauth_id)*

### `refresh_tokens`
```
id         UUID pk
token      STRING unique
userId     UUID  → user_id  (FK users.id ON DELETE CASCADE)
deviceInfo STRING? → device_info
expiresAt  DATE   → expires_at
createdAt  DATE
```
*index (user_id) · User hasMany RefreshToken*

---

## user-service — `user_db`

### `profiles`  (id === auth user id)
```
id UUID pk, firstName, lastName, headline?, summary?(TEXT), avatarUrl?, bannerUrl?,
location?, website?, industry?, isOpenToWork BOOL default false,
profileViews INT default 0, createdAt, updatedAt
```

### `experiences`
```
id UUID pk, profileId, title, company, companyLogo?, location?,
startDate DATE, endDate? DATE, isCurrent BOOL default false, description?(TEXT), createdAt
```
*index (profile_id) · belongsTo Profile (CASCADE)*

### `educations`
```
id UUID pk, profileId, school, degree?, fieldOfStudy?, startYear INT,
endYear? INT, grade?, activities?(TEXT), createdAt
```
*index (profile_id)*

### `skills`
```
id UUID pk, name STRING unique, category?
```

### `profile_skills`  (composite pk profile_id + skill_id)
```
profileId, skillId, endorsements INT default 0
```

### `skill_endorsements`
```
id UUID pk, profileId, skillId, endorserId, createdAt
```
*unique (profile_id, skill_id, endorser_id) — prevents double-counting endorsements*

### `certifications`
```
id UUID pk, profileId, name, issuingOrg, issueDate DATE,
expirationDate? DATE, credentialId?, credentialUrl?
```
*index (profile_id)*

*Profile hasMany Experience / Education / ProfileSkill / Certification (all ON DELETE CASCADE);
Skill hasMany ProfileSkill.*

---

## connection-service — `connection_db`

### `connections`
```
id UUID pk, requesterId, addresseeId,
status ENUM('PENDING','ACCEPTED','REJECTED','WITHDRAWN') default 'PENDING',
note?, createdAt, updatedAt
```
*unique (requester_id, addressee_id) · index (addressee_id, status) · index (requester_id, status)*

### `follows`
```
id UUID pk, followerId, followingId, createdAt
```
*unique (follower_id, following_id) · index (following_id)*

### `blocks`
```
id UUID pk, blockerId, blockedId, createdAt
```
*unique (blocker_id, blocked_id) · index (blocked_id)*

*The three aggregates are independent (no cross-table associations).*

---

## post-service — `post_db`

### `posts`
```
id UUID pk, authorId, content TEXT, mediaUrls ARRAY(STRING) default [],
postType ENUM('POST','ARTICLE','POLL','SHARE','CELEBRATION') default 'POST',
visibility ENUM('PUBLIC','CONNECTIONS','PRIVATE') default 'PUBLIC',
isEdited BOOL default false,
likesCount / commentsCount / sharesCount INT default 0,
createdAt, updatedAt, deletedAt? DATE   (soft delete)
```
*index (author_id, created_at DESC) · index (created_at DESC)*

### `comments`  (self-referential threads)
```
id UUID pk, postId, authorId, parentId?, content TEXT, likesCount INT default 0,
createdAt, updatedAt
```
*index (post_id, created_at) · index (parent_id) · Comment hasMany Comment ("Replies")*

### `reactions`
```
id UUID pk, postId, userId,
type ENUM('LIKE','CELEBRATE','SUPPORT','LOVE','INSIGHTFUL','FUNNY') default 'LIKE'
```
*unique (post_id, user_id)*

### `hashtags`
```
id UUID pk, name STRING unique
```

### `post_hashtags`  (composite pk post_id + hashtag_id)

*Post hasMany Comment / Reaction / PostHashtag (CASCADE); Hashtag hasMany PostHashtag.*

---

## messaging-service — `messaging_db`

### `conversations`
```
id UUID pk, isGroup BOOL default false, groupName?, groupAvatar?,
lastMessageAt? DATE, createdAt
```
*index (last_message_at DESC)*

### `participants`  (timestamps: false)
```
id UUID pk, conversationId, userId, joinedAt DATE default now,
lastReadAt? DATE, isMuted BOOL default false
```
*unique (conversation_id, user_id) · index (user_id)*

### `messages`
```
id UUID pk, conversationId, senderId, content?(TEXT), mediaUrl?,
messageType ENUM('TEXT','IMAGE','FILE','SYSTEM') default 'TEXT',
isEdited BOOL default false, deletedAt? DATE, createdAt
```
*index (conversation_id, created_at DESC)*

*Conversation hasMany Participant / Message (CASCADE).*

---

## notification-service — `notification_db`

### `notifications`  (updatedAt: false)
```
id UUID pk, recipientId, actorId?,
type ENUM('CONNECTION_REQUEST','CONNECTION_ACCEPTED','POST_LIKE','POST_COMMENT',
          'COMMENT_REPLY','ENDORSEMENT','PROFILE_VIEW','JOB_RECOMMENDATION',
          'MESSAGE_RECEIVED','MENTION'),
entityType?, entityId?, message STRING, isRead BOOL default false, readAt? DATE,
metadata? JSONB, createdAt
```
*index (recipient_id, is_read, created_at DESC)*

### `notification_preferences`  (timestamps: false)
```
id UUID pk, userId UUID unique,
inApp BOOL default true, email BOOL default true, push BOOL default true,
connections BOOL default true, messages BOOL default true,
posts BOOL default true, jobs BOOL default true
```

---

## job-service — `job_db`

### `companies`
```
id UUID pk, name, slug STRING unique, logoUrl?, bannerUrl?, website?, industry?,
size?, description?(TEXT), location?, foundedYear? INT,
adminIds ARRAY(UUID) default [], createdAt, updatedAt
```

### `jobs`
```
id UUID pk, companyId, posterId, title, description TEXT, location?,
locationType ENUM('ONSITE','REMOTE','HYBRID') default 'ONSITE',
employmentType ENUM('FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','FREELANCE'),
experienceLevel ENUM('ENTRY','ASSOCIATE','MID_SENIOR','DIRECTOR','EXECUTIVE'),
salaryMin? INT, salaryMax? INT, salaryCurrency? default 'USD',
skills ARRAY(STRING) default [], isActive BOOL default true,
applicantsCount INT default 0, createdAt, updatedAt
```
*index (company_id) · index (is_active, created_at DESC)*

### `applications`
```
id UUID pk, jobId, applicantId, resumeUrl?, coverLetter?(TEXT),
status ENUM('SUBMITTED','REVIEWED','SHORTLISTED','REJECTED','HIRED','WITHDRAWN')
       default 'SUBMITTED', createdAt, updatedAt
```
*unique (job_id, applicant_id) · index (applicant_id)*

### `saved_jobs`  (composite pk user_id + job_id)
```
userId, jobId, createdAt
```

*Company hasMany Job (CASCADE); Job hasMany Application / SavedJob (CASCADE).*

---

## media-service — `media_db`

### `media`  (metadata only; bytes live in MinIO/S3)
```
id UUID pk, uploaderId, fileName, mimeType, size INT, url, thumbnailUrl?,
bucket STRING default 'uploads', key STRING unique, width? INT, height? INT,
status ENUM('PROCESSING','READY','FAILED') default 'PROCESSING', createdAt
```
*index (uploader_id)*

---

## search-service — Elasticsearch (no relational DB)

search-service indexes documents into Elasticsearch instead of Postgres. Indices are asserted at
boot (`ensureIndices()`), not migrated:

| Index | Populated by | Source events |
|-------|--------------|---------------|
| `users` | user/connection events | `user.registered`, `user.updated`, `connection.*` |
| `posts` | post events | `post.created` (removed on `post.deleted`) |
| `jobs` | job events | `job.created` |
| `companies` | job events | company create/update |

See [events.md](events.md) for the consumer bindings that keep these indices in sync.

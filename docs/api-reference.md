# API Reference

All routes are served under `/api` and reached through the gateway (NGINX → api-gateway), except
`/api/auth/*`, which NGINX routes directly to auth-service. Protected routes require an
`Authorization: Bearer <accessToken>` header; the gateway injects `x-user-id` / `x-user-role` for
downstream services.

**Conventions**

- Success responses use the shared envelope helpers (`ok` / `created` / `noContent`).
- `:id` parameters are UUIDs.
- List endpoints that say *cursor* use keyset pagination (`?cursor=&limit=`); others use
  offset/filters.
- "self" routes operate on the caller (`req.userId`); they require authentication.

---

## Auth — `/api/auth`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/register` | Register with email + password |
| POST | `/login` | Login → access + refresh tokens |
| POST | `/refresh` | Rotate refresh token, issue new access token |
| POST | `/logout` | Revoke the refresh token |
| POST | `/forgot-password` | Send a password-reset email |
| POST | `/reset-password` | Reset password via token |
| GET | `/verify/:token` | Verify email address |
| POST | `/oauth/google` | Google OAuth2 callback |
| POST | `/oauth/github` | GitHub OAuth2 callback |

---

## User — `/api/users`

**Profile**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/me` | Current user's profile |
| GET | `/:id` | Public profile by id |
| PUT | `/me` | Update profile |
| PATCH | `/me/avatar` | Update avatar URL |
| PATCH | `/me/banner` | Update banner URL |

**Experience**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/me/experience` | List experiences |
| POST | `/me/experience` | Add experience |
| PUT | `/me/experience/:id` | Update experience |
| DELETE | `/me/experience/:id` | Delete experience |

**Education**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/me/education` | List educations |
| POST | `/me/education` | Add education |
| PUT | `/me/education/:id` | Update education |
| DELETE | `/me/education/:id` | Delete education |

**Skills & endorsements**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/me/skills` | List skills |
| POST | `/me/skills` | Add a skill |
| DELETE | `/me/skills/:skillId` | Remove a skill |
| POST | `/me/skills/:skillId/endorse` | Endorse another user's skill |

**Certifications**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/me/certifications` | List certifications |
| POST | `/me/certifications` | Add certification |
| DELETE | `/me/certifications/:id` | Delete certification |

---

## Connection — `/api/connections`

**Connections**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List connections (status filter) |
| GET | `/requests/pending` | Pending incoming requests |
| GET | `/mutual/:userId` | Mutual connections with a user |
| POST | `/request` | Send a connection request |
| PUT | `/request/:id/accept` | Accept a request |
| PUT | `/request/:id/reject` | Reject a request |
| DELETE | `/request/:id` | Withdraw a request |

**Follow**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/follow/:userId` | Follow a user |
| DELETE | `/follow/:userId` | Unfollow a user |
| GET | `/followers` | List followers |
| GET | `/following` | List who you follow |

**Block**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/block/:userId` | Block a user |
| DELETE | `/block/:userId` | Unblock a user |

---

## Post — `/api/posts`

**Posts**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/feed` | Personalized feed (cursor pagination) |
| GET | `/:id` | Single post |
| POST | `/` | Create a post |
| PUT | `/:id` | Edit a post |
| DELETE | `/:id` | Soft-delete a post |

**Reactions**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/:id/react` | Add or update a reaction |
| DELETE | `/:id/react` | Remove your reaction |

**Comments (threaded)**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/:id/comments` | List comments (threaded) |
| POST | `/:id/comments` | Add a comment |
| PUT | `/comments/:commentId` | Edit a comment |
| DELETE | `/comments/:commentId` | Delete a comment |

**Hashtags**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/hashtags/trending` | Trending hashtags |
| GET | `/hashtags/:name` | Posts by hashtag |

---

## Messaging — `/api/messaging`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/conversations` | List conversations |
| POST | `/conversations` | Start a new conversation |
| GET | `/conversations/:id` | Conversation detail |
| GET | `/conversations/:id/messages` | Messages (cursor) |
| POST | `/conversations/:id/messages` | Send a message |
| PUT | `/conversations/:id/messages/:msgId` | Edit a message |
| DELETE | `/conversations/:id/messages/:msgId` | Delete a message |
| POST | `/conversations/:id/read` | Mark conversation as read |

---

## Notification — `/api/notifications`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List notifications (cursor) |
| GET | `/unread-count` | Unread count |
| PUT | `/:id/read` | Mark one as read |
| PUT | `/read-all` | Mark all as read |
| GET | `/preferences` | Get notification preferences |
| PUT | `/preferences` | Update preferences |

---

## Search — `/api/search`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/users?q=` | Search users |
| GET | `/posts?q=` | Search posts |
| GET | `/jobs?q=` | Search jobs |
| GET | `/companies?q=` | Search companies |
| GET | `/autocomplete?q=` | Autocomplete suggestions |

---

## Media — `/api/media`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/upload` | Multipart file upload → URL |
| POST | `/upload/presigned` | Get a presigned upload URL |
| GET | `/:id` | Get media metadata |
| DELETE | `/:id` | Delete media |

---

## Job — `/api/jobs`

**Jobs**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List active jobs (filter, paginate) |
| GET | `/:id` | Job detail |
| POST | `/` | Create a job (RECRUITER/ADMIN) |
| PUT | `/:id` | Update a job |
| DELETE | `/:id` | Close / delete a job |

**Applications**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/:id/apply` | Apply to a job |
| GET | `/:id/applications` | List applications (poster only) |
| PUT | `/applications/:id/status` | Update application status |
| GET | `/me/applications` | My applications |

**Saved jobs**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/:id/save` | Save a job |
| DELETE | `/:id/save` | Unsave a job |
| GET | `/me/saved` | List saved jobs |

**Companies**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/companies` | List companies |
| GET | `/companies/:slug` | Company detail |
| POST | `/companies` | Create a company |
| PUT | `/companies/:id` | Update a company |

---

## Health checks

Every service exposes an unauthenticated health endpoint:

```
GET /health  →  { "status": "ok", "service": "<service-name>" }
```

NGINX also exposes `GET /health` at the edge returning `ok`.

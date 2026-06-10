# Event-Driven Communication (RabbitMQ)

Cross-service side effects flow through RabbitMQ instead of direct calls. A service that changes
state publishes a **domain event**; any number of other services consume it without the publisher
knowing or caring who listens. This keeps services decoupled and the request path fast.

## Topology

Exchanges and queues are declared centrally in
[`packages/shared/src/constants/queues.ts`](../packages/shared/src/constants/queues.ts).

### Exchanges

| Exchange | Type | Emitted by |
|----------|------|-----------|
| `user.events` | topic | user-service |
| `post.events` | topic | post-service |
| `connection.events` | topic | connection-service |
| `job.events` | topic | job-service |
| `notification.direct` | direct | notification dispatch (email/push) |
| `media.processing` | direct | media-service |

### Routing keys → queues

```
connection.events (topic)
  connection.requested  → notify.connection.request    (notification-service)
  connection.accepted   → notify.connection.accepted   (notification-service)
  connection.*          → search.index.user            (search-service)

post.events (topic)
  post.created          → search.index.post            (search-service)
  post.reacted          → notify.post.reaction         (notification-service)
  post.commented        → notify.comment               (notification-service)
  post.deleted          → search.remove.post           (search-service)

user.events (topic)
  user.registered       → search.index.user            (search-service)
  user.updated          → search.index.user            (search-service)

job.events (topic)
  job.created           → search.index.job             (search-service)
  job.applied           → notify.job.application        (notification-service)

notification.direct (direct)
  email                 → notification-service (email worker)
  push                  → notification-service (push worker)

media.processing (direct)
  resize                → media.resize     (media worker — see status note)
  thumbnail             → media.thumbnail  (media worker — see status note)
```

## Event envelope

Every published message uses a consistent envelope (defined in
[`packages/shared/src/constants/events.ts`](../packages/shared/src/constants/events.ts)), so
consumers can rely on a stable shape:

```ts
interface EventEnvelope<T = unknown> {
  eventId: string;     // UUID — for idempotency / dedup
  type: string;        // routing key, e.g. "post.reacted"
  occurredAt: string;  // ISO timestamp
  producer: string;    // service name that emitted it
  data: T;             // event-specific payload
}
```

Consumers should treat handlers as **idempotent** — use `eventId` (or a natural key) to avoid
double-processing on redelivery.

## Publishing

The shared helper opens a confirm channel, publishes, and retries on failure:

```ts
import { publishEvent, EXCHANGES, ROUTING_KEYS } from '@linkedin-clone/shared';

await publishEvent(EXCHANGES.POST_EVENTS, ROUTING_KEYS.POST_REACTED, {
  postId, authorId, actorId: userId, reactionType,
});
```

A topic publish is fire-and-forget from the caller's perspective; delivery durability comes from
publisher confirms plus the broker's persistence.

## Consuming

Consumers register through the shared `registerConsumer`, which wires up the queue, its binding,
and the dead-letter machinery:

```ts
import { registerConsumer, QUEUES } from '@linkedin-clone/shared';

await registerConsumer(QUEUES.NOTIFY_POST_REACTION, async (event) => {
  await notificationService.createFromEvent(event);
  // throw to nack → retry/backoff → DLQ after max attempts
});
```

A handler that throws nacks the message; the retry/backoff path takes over.

## Reliability — DLQ & retry

- **Dead-letter queues.** Every consumer queue has a dead-letter exchange routing failed messages
  to `dlq.<domain>` (`dlq.notification`, `dlq.search`, `dlq.media`).
- **Retry with backoff.** A failed message is retried up to **3 times** with exponential backoff
  (≈ 1s → 5s → 25s). After the final attempt it lands in the DLQ for inspection/replay.
- **Prefetch.** Channels set a prefetch so a single consumer doesn't hog unacked messages.

## Per-service event responsibilities

| Service | Publishes | Consumes |
|---------|-----------|----------|
| auth-service | (account events) | — |
| user-service | `user.registered`, `user.updated` | (profile-related inbound events) |
| connection-service | `connection.requested`, `connection.accepted`, … | — |
| post-service | `post.created`, `post.reacted`, `post.commented`, `post.deleted` | — |
| job-service | `job.created`, `job.applied` | — |
| media-service | `media.resize`, `media.thumbnail` | — *(worker consumers not yet built)* |
| notification-service | — | all `notify.*` queues |
| search-service | — | all `search.index.*` / `search.remove.*` queues |

> **Status note.** media-service publishes resize/thumbnail jobs, but the worker that consumes
> `media.resize` / `media.thumbnail` and produces the processed images is not yet implemented, so
> uploaded media remains in `PROCESSING`. See [development.md](development.md#known-gaps).

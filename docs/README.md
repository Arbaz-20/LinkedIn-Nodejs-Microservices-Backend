# Documentation

Detailed documentation for the LinkedIn Clone microservices backend. Start with the root
[README](../README.md) for the high-level overview and quick start, then dive into a topic below.

| Doc | What's inside |
|-----|---------------|
| [architecture.md](architecture.md) | Service decomposition, the API gateway & auth/token model, the shared package, and the end-to-end request lifecycle. |
| [api-reference.md](api-reference.md) | Every REST endpoint across all services, grouped by service. |
| [data-models.md](data-models.md) | All Sequelize models — columns, types, defaults, indexes, associations — plus the Elasticsearch indices. |
| [events.md](events.md) | RabbitMQ exchange/queue topology, routing keys, the event envelope, and DLQ/retry semantics. |
| [development.md](development.md) | Local setup, npm scripts, migrations, coding conventions, and how to add a new service. |
| [deployment.md](deployment.md) | Dockerfiles, compose files, environment, and the CI/CD pipelines. |

For the original end-to-end design document, see
[`../linkedin-clone-backend-plan.md`](../linkedin-clone-backend-plan.md). The initial spec lives
under [`superpowers/specs/`](superpowers/specs/).

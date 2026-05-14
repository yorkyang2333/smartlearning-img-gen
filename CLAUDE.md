# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

晋彩智绘 — a teacher/student AI image-generation platform. Three runtimes work together: Vue 3 frontend, Spring Boot backend, and a New API "AI Gateway" (Docker) that fronts all upstream LLM/image providers.

## Common commands

One-shot dev (gateway + backend + frontend):

```bash
sh start.sh        # boots gateway:4000, backend:8080, frontend:5173; Ctrl+C tears all down
```

Run pieces individually:

```bash
# AI Gateway (Docker) — required before backend can call any model
./scripts/gateway/start_gateway.sh
./scripts/gateway/stop_gateway.sh

# Backend (from backend/)
mvn spring-boot:run -Dspring-boot.run.profiles=dev -DskipTests
mvn test                                                   # all tests
mvn -Dtest=ModelConfigUtilTest test                        # single test class
mvn -Dtest=ModelConfigUtilTest#methodName test             # single test method
mvn package                                                # builds jar to target/

# Frontend (from frontend/)
npm install
npm run dev          # vite on :5173
npm run build        # vue-tsc + vite build
```

Default seeded accounts (created on first boot when users table is empty, see [DataSeeder.java](backend/src/main/java/com/smartlearning/backend/config/DataSeeder.java)): `teacher / 123456`, `student / 123456`. Gateway admin panel: `root / 12345678` at http://localhost:4000.

## Architecture

### Three-tier request flow

```
Vue (5173)  ──JWT──▶  Spring Boot (8080)  ──OpenAI-compatible──▶  New API Gateway (4000)  ──▶  upstream providers
```

The backend never talks to OpenAI/Anthropic/Google directly. Everything goes through the gateway as OpenAI-format calls (`/v1/chat/completions`, `/v1/images/generations`). The gateway owns provider keys, routing, and retries. See [docs/gateway.md](docs/gateway.md).

### Backend (Spring Boot 3, Java 17 in pom — README says 21)

Layout under [backend/src/main/java/com/smartlearning/backend/](backend/src/main/java/com/smartlearning/backend/):

- `controller/` — REST endpoints. Path prefixes encode auth scope: `/api/auth/**` (public), `/api/public/**` (public), `/api/teacher/**` (role TEACHER), everything else authenticated. Configured in [SecurityConfig.java](backend/src/main/java/com/smartlearning/backend/config/SecurityConfig.java).
- `entity/` + `repository/` — JPA entities and Spring Data repos. `User` has a `role` of `TEACHER` or `STUDENT` and (for students) a `teacherId` linking them to their teacher.
- `security/` — `JwtRequestFilter` runs before `UsernamePasswordAuthenticationFilter`; `JwtUtil` issues/parses tokens; `CustomUserDetailsService` adapts `User` to Spring Security.
- `service/` — `GatewayAiClient` and `NewApiGatewayClient` are the chokepoint for outbound model calls; `GatewayConfigService` resolves the active gateway URL/key (DB row > env var, see below); `GatewayModelSyncService` pulls the gateway's model catalogue into the local `Model` table.
- `config/`
  - [DataSeeder.java](backend/src/main/java/com/smartlearning/backend/config/DataSeeder.java) — seeds default users + models on empty DB.
  - [DatabaseMigrationRunner.java](backend/src/main/java/com/smartlearning/backend/config/DatabaseMigrationRunner.java) — manual migrations layered on top of Hibernate `ddl-auto: update`.
  - [GatewayProperties.java](backend/src/main/java/com/smartlearning/backend/config/GatewayProperties.java) — binds `gateway.base-url` / `gateway.api-key` from env.

Gateway config precedence: a `GatewayConfig` row in the database overrides the `NEWAPI_BASE_URL` / `NEWAPI_API_KEY` env vars. The teacher UI (Models page → "AI Gateway 网关管理") writes that row.

Datasource: [application.yml](backend/src/main/resources/application.yml) is configured for MySQL on localhost (`jincai_zhihui` schema, root user, empty password). H2 is on the classpath as a fallback. The README mentions SQLite but the live config is MySQL — verify which is actually running before assuming.

### Frontend (Vue 3 + TS + Vite + Pinia)

Layout under [frontend/src/](frontend/src/):

- `views/teacher/` and `views/student/` — role-segregated pages. Routes are gated by `meta.requiresAuth` and `meta.role` in [router/index.ts](frontend/src/router/index.ts); the navigation guard redirects to the role-appropriate home if a teacher hits `/student/*` or vice versa.
- `stores/auth.ts` — JWT + user, drives `isAuthenticated` / `isTeacher` used by the guard.
- `stores/chat.ts` — conversation state for the student workspace.
- `components/` — shared UI: `PromptBuilder`, `PromptOptimizer`, `TutorDrawer`, `TutorReview` etc.

Key student flow: `Workspace.vue` (chat-style generation) → `ClassGallery.vue` (history) → `StudentAssignments.vue` → `AssignmentDetail.vue` / `AssignmentPlay.vue`. Key teacher flow: `Dashboard` → `Models` (sync from gateway) → `Assignments` (create/grade) → `Live` → `Settings` / `Templates`.

CORS is locked to `http://localhost:5173` and `http://localhost:3000` in `SecurityConfig`; if you expose the backend elsewhere, update both lists.

## Design system

[DESIGN.md](DESIGN.md) is the source of truth for the "Warm Editorial" / Anthropic-Claude-inspired visual language (cream canvas, coral primary, Copernicus serif display). Match those tokens when adding UI rather than introducing new colors/typography.

# TVS Collections

TVS Collections is a full-stack collections lead management application for agents and administrators. It includes a React frontend, a Spring Boot backend, MySQL-backed lead and feedback storage, JWT authentication, product-level access control, Excel lead uploads, feedback export, and an optional campaign webhook observer.

## Project Structure

```text
tvs-collections/
|-- backend/          # Spring Boot API, security, JPA models, services, repositories
|-- frontend/         # React + Vite client application
|-- webhook-server/   # Express + Socket.IO campaign webhook observer
`-- README.md
```

## Main Features

- Login/logout with JWT-based authentication.
- Agent dashboards for Consumer Durable, Retail, and Commercial products.
- Product access validation per user.
- Lead search, lead detail view, Excel upload, and feedback submission.
- Admin dashboard with upload status management, active-user tracking, user management, dialer status proxy, and feedback export.
- Optional webhook server for campaign call observations over Socket.IO.

## Tech Stack

- Frontend: React 19, Vite 8, ESLint.
- Backend: Java 17, Spring Boot 3.3, Spring Security, Spring Data JPA, MySQL, Apache POI.
- Webhook server: Node.js, Express, Socket.IO.

## Prerequisites

- Node.js and npm.
- Java 17.
- Maven.
- MySQL database reachable from the backend.

## Backend Setup

1. Update backend configuration in `backend/src/main/resources/application.properties`.

   Important values include:

   - `server.port`
   - `spring.datasource.url`
   - `spring.datasource.username`
   - `spring.datasource.password`
   - `jwt.secret`
   - `vicidial.host`
   - `vicidial.api-user`
   - `vicidial.api-pass`

2. Start the backend:

```bash
cd backend
mvn spring-boot:run
```

The backend is configured to run on port `4000` by default.

Useful backend commands:

```bash
mvn clean package
mvn test
```

The Maven build produces a WAR package for deployment.

## Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the development server:

```bash
npm run dev
```

The Vite development server proxies `/api` requests to `http://localhost:4000`.

Useful frontend commands:

```bash
npm run build
npm run lint
npm run preview
```

For deployed environments, set `VITE_API_BASE_URL` if the API is not served from `/api`.

## Webhook Server Setup

The webhook server is optional and listens for campaign webhook events.

```bash
cd webhook-server
npm install
npm start
```

Default port: `3001`.

Supported webhook URL formats:

```text
http://<host>:3001/webhook/<CAMPAIGN_ID>?phoneNo=<PHONE>
http://<host>:3001/<CAMPAIGN_ID>/webhook?phoneNo=<PHONE>
```

Environment variables:

- `PORT` - webhook server port.
- `HOST_LABEL` - host label printed in startup logs.
- `ALLOWED_DIALER_IPS` - comma-separated list of allowed dialer IPs.

## API Overview

Public endpoints:

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`

Authenticated agent endpoints:

- `GET /api/user/dashboard`
- `GET /api/{productKey}/leads/search?q=...`
- `GET /api/{productKey}/leads/{leadId}`
- `POST /api/{productKey}/leads/upload`
- `POST /api/{productKey}/leads/{leadId}/feedback`

Admin endpoints:

- `GET /api/admin/dashboard`
- `GET /api/admin/uploads`
- `POST /api/admin/uploads/{uploadId}/activate`
- `POST /api/admin/uploads/{uploadId}/deactivate`
- `GET /api/admin/users`
- `GET /api/admin/users/options`
- `POST /api/admin/users`
- `PUT /api/admin/users/{userId}`
- `POST /api/admin/users/{userId}/activate`
- `POST /api/admin/users/{userId}/deactivate`
- `GET /api/admin/export/feedback?startDate=yyyy-MM-dd&endDate=yyyy-MM-dd`
- `GET /api/admin/dialer/agents`
- `GET /api/admin/dialer/agent?user=...`

## Development Notes

- The frontend base path is configured as `/tvs/` in `frontend/vite.config.js`.
- Local frontend origins are allowed in the backend CORS configuration.
- Protected API calls require an `Authorization: Bearer <token>` header.
- Uploaded Excel files are processed by the backend with Apache POI.
- Feedback exports are returned as `.xlsx` files.
- Do not commit production credentials or long-lived secrets in `application.properties`; use environment-specific configuration for production deployments.

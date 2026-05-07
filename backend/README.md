# TVS Collections Backend

This backend is implemented with Spring Boot and H2 database connectivity for lead search, retrieval, and feedback.

## Setup

1. Open a terminal in `backend`
2. Run `mvn clean package`
3. Run `mvn spring-boot:run`

> The application uses H2 file-based storage in `backend/data/tvscollections` and starts on port `4000`.

## API Endpoints

- `GET /api/:productKey/leads/search?q=...`
- `GET /api/:productKey/leads/:leadId`
- `POST /api/:productKey/leads/:leadId/feedback`
- `POST /api/:productKey/leads/upload`

## Notes

- Sample consumer, retail, and commercial leads are seeded automatically on startup.
- The frontend proxy is configured to forward `/api` requests to `http://localhost:4000`.

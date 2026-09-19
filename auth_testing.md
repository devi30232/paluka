# VaaniStock AI authentication testing

Use the credentials in `/app/memory/test_credentials.md`.

1. POST `/api/auth/login` with email and password; confirm a token and user are returned.
2. Send `Authorization: Bearer <token>` to `/api/auth/me`; confirm the user is returned without password data.
3. POST `/api/auth/demo`; confirm a demo user and seeded inventory are returned.
4. Register a new account, then verify `/api/bootstrap` returns its shop and seeded products.
5. Confirm invalid credentials return a friendly 401 response.
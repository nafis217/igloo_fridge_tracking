# IglooTrack

IglooTrack is now an Expo mobile/web app that talks to an external ASP.NET API.

## Project Structure

```text
apps/
  mobile/
    App.tsx        Navigation and field screens
    src/api.ts     API client and offline queue
    src/theme.ts   Visual tokens
    src/ui.tsx     Shared components
```

The old Node/Express API has been removed from this repository.

## API Configuration

Set the ASP.NET API base URL in `apps/mobile/.env`:

```env
EXPO_PUBLIC_API_URL="http://localhost:5047/api"
```

The login call goes to:

```text
POST http://localhost:5047/api/Auth/login
```

The ASP.NET API should also provide these routes for the rest of the app:

```text
GET  /api/reports/summary
GET  /api/fridges
POST /api/fridges
GET  /api/fridges/{id}
POST /api/fridges/{id}/scan
POST /api/fridges/{id}/transfer
GET  /api/shop-owners
POST /api/shop-owners
GET  /api/shop-owners/{id}
```

## Run Web

```bash
npm install
npm run web
```

Open:

```text
http://localhost:8081
```

Your ASP.NET API must allow CORS from `http://localhost:8081`.

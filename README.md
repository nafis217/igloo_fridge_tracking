# IglooTrack

IglooTrack keeps the React/Expo frontend and ASP.NET Core Web API as separate runnable projects in one repository.

## Project structure

```text
IglooTrack/
|-- frontend/          React/Expo application
|-- backend/           ASP.NET Core Web API
|-- IglooTrack.sln     Visual Studio solution
`-- README.md
```

Generated folders such as `node_modules`, `bin`, and `obj` are not part of the source structure.

## Run the frontend

The frontend uses Expo with React Native Web. From the repository root:

```powershell
cd frontend
npm install
npm run dev
```

`npm run start` starts Expo's interactive development server. `npm run web` starts the web target directly. The web application normally opens at `http://localhost:8081`.

Configure the frontend in `frontend/.env`:

```env
EXPO_PUBLIC_API_URL="http://localhost:5047/api"
EXPO_PUBLIC_COMPANY_ID="1"
```

## Run the backend

From the repository root:

```powershell
cd backend
dotnet restore
dotnet run
```

The HTTP launch profile serves the API at `http://localhost:5047`; Swagger is at `http://localhost:5047/swagger`.

## Frontend-to-backend connection

The frontend API helper reads `EXPO_PUBLIC_API_URL` and sends requests to the ASP.NET controllers. The default login endpoint is:

```text
POST http://localhost:5047/api/Auth/login
```

The backend CORS policy allows local React development origins on ports `3000`, `5173`, and Expo web port `8081` (including their `127.0.0.1` equivalents).

## SQL Server 2012 configuration

Set `ConnectionStrings:DefaultConnection` in `backend/appsettings.json`, `backend/appsettings.Development.json`, or preferably through an environment variable:

```powershell
$env:ConnectionStrings__DefaultConnection="Server=YOUR_SERVER;Database=IglooTrack;User Id=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=True;"
dotnet run --project backend
```

The EF Core SQL provider is configured with compatibility level `110`, which corresponds to SQL Server 2012. Replace the checked-in localhost connection string with the correct server/database details for your environment. Do not commit production credentials.

## Visual Studio

Open `IglooTrack.sln`. The solution contains the backend project. The frontend remains independently managed with npm and can be opened in the same editor or terminal.

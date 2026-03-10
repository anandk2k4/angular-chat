# Anonymous Chat — Angular

This is the **Angular conversion** of the original Next.js Anonymous Chat project. The UI and structure are faithfully preserved; only the framework has changed.

---

## Project Structure

```
anonymous-chat-angular/
├── src/
│   └── app/
│       ├── app.component.ts         # Root component with router outlet
│       ├── app.config.ts            # ApplicationConfig (replaces AppModule)
│       ├── app.routes.ts            # Route definitions
│       ├── components/
│       │   ├── home/                # Landing page (room ID + username form)
│       │   ├── chat-room/           # Main chat view
│       │   ├── message-bubble/      # Individual message display
│       │   ├── message-input/       # Text input + send button
│       │   └── user-list/           # Online users sidebar
│       ├── services/
│       │   └── chat.service.ts      # HTTP polling + Angular signals
│       └── models/
│           └── chat.model.ts        # TypeScript interfaces
├── server/
│   └── server.js                   # Express backend (replaces Next.js API routes)
├── proxy.conf.json                  # Dev proxy: /api → localhost:3000 (auto-loaded by ng serve)
├── angular.json                     # proxyConfig wired in under serve.options
├── package.json
└── tsconfig.json
```

---

## Getting Started

### 1. Install dependencies

```bash
# Angular frontend
npm install

# Express backend
cd server && npm install && cd ..
```

### 2. Run in development

Open **two terminals**:

```bash
# Terminal 1 — Express API server (port 3000)
npm run server

# Terminal 2 — Angular dev server (port 4200)
ng serve
# or: npm start
```

The proxy in `angular.json` automatically forwards all `/api/*` requests from `ng serve` (port 4200) to the Express server (port 3000), so no CORS issues.

Open **http://localhost:4200**.

### Or run both at once

```bash
npm run dev
```

---

## Key Differences from Next.js

| Next.js | Angular |
|---|---|
| `useState` / `useEffect` hooks | Angular Signals (`signal`) |
| `useRouter` + `useSearchParams` | `ActivatedRoute` + `Router` |
| Next.js API Routes | Express.js (`server/server.js`) |
| `shadcn/ui` components | Custom CSS (same visual style) |
| `use-socket` hook + polling | `ChatService` using RxJS `interval` |
| `next/navigation` | `@angular/router` |

---

## API Endpoints (Express)

| Method | Path | Description |
|---|---|---|
| POST | `/api/chat/join` | Join a room |
| POST | `/api/chat/leave` | Leave a room |
| POST | `/api/chat/message` | Send a message |
| GET | `/api/chat/poll` | Poll for updates |
| POST | `/api/chat/typing` | Update typing status |

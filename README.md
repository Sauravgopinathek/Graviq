# Graviq

Graviq is a Conversational AI Lead Generation Platform.

## Project Architecture

This is a monorepo containing the following components:

- `client/`: The client-side application (Dashboard and Landing Page).
- `server/`: The backend server that handles logic, API endpoints, and data processing.
- `widget/`: The embeddable chat widget component that users can integrate into their websites.

## Getting Started

1. Set up the environment variables:
   Copy `.env.example` to `.env` and fill in the required values.

2. Install dependencies:
   ```bash
   npm install
   ```

## Running Locally

Start the **server** (runs on `http://localhost:3000`):
```bash
cd server
npm run dev
```

Start the **client** (runs on `http://localhost:5173`):
```bash
cd client
npm run dev
```

## Testing the Widget

A built-in test page is available to preview the chat widget without needing an external website.

1. Start the server:
   ```bash
   cd server
   npm start
   ```

2. Open [http://localhost:3000/test](http://localhost:3000/test) in your browser.

This loads `test-website.html` — a dummy page with the Graviq widget embedded in the bottom-right corner. You can chat with the bot and see lead qualification in action.

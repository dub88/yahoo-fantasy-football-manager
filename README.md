# Yahoo Fantasy Football Manager

A web-based application to manage a Yahoo Fantasy Football team, including roster retrieval, lineup optimization, trade analysis, and waiver wire recommendations using the Yahoo Fantasy Sports API.

## Features

- OAuth 2.0 authentication with Yahoo
- Team roster management
- Lineup optimizer (planned)
- Trade analyzer (planned)
- Waiver wire assistant (planned)
- Performance tracking with charts

## Tech Stack

- [React](https://reactjs.org/) v18.3.1
- [Tailwind CSS](https://tailwindcss.com/) v3.4.14
- [Vite](https://vitejs.dev/) for build tooling
- [React Router](https://reactrouter.com/) v6.27.0
- [Axios](https://axios-http.com/) v1.7.7
- [Chart.js](https://www.chartjs.org/) v4.4.4 with [react-chartjs-2](https://react-chartjs-2.js.org/) v5.2.0

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the values with your Yahoo API credentials
4. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_YAHOO_CLIENT_ID=your_yahoo_client_id_here
VITE_YAHOO_CLIENT_SECRET=your_yahoo_client_secret_here
VITE_YAHOO_REDIRECT_URI=http://localhost:3000/auth/callback
```

## Deployment to Vercel

1. Initialize a Git repository and commit the code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
2. Connect the repository to Vercel via the Vercel dashboard
3. Add environment variables in Vercel:
   - `VITE_YAHOO_CLIENT_ID`
   - `VITE_YAHOO_CLIENT_SECRET`
   - `VITE_YAHOO_REDIRECT_URI` (set to your Vercel URL + /auth/callback)
4. Deploy the project
5. Update the Yahoo Developer Console with the callback URL (e.g., https://your-project.vercel.app/auth/callback)

## Project Structure

```
src/
├── components/
│   ├── AuthButton.jsx
│   ├── RosterDisplay.jsx
│   ├── LineupOptimizer.jsx
│   ├── TradeAnalyzer.jsx
│   ├── WaiverAssistant.jsx
│   └── PerformanceChart.jsx
├── pages/
│   ├── index.jsx
│   ├── auth/callback.jsx
│   └── dashboard.jsx
├── utils/
│   ├── yahooApi.js
│   └── auth.js
└── styles/
    └── globals.css
```

## Next Steps

1. Register the app in the Yahoo Developer Console to obtain client ID and secret
2. Implement OAuth 2.0 flow using the provided callback URL
3. Test API calls to fetch roster data
4. Iterate on features like lineup optimization and trade analysis

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

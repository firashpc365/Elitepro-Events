
# Kanchana Events Hub - Deployment Guide

This is a React Single Page Application (SPA) built with Vite and TypeScript. It uses `@google/genai` for AI features.

## Prerequisites

1.  **Node.js**: Ensure you have Node.js installed locally.
2.  **API Key**: You need a valid Google Gemini API Key. Get one at [aistudio.google.com](https://aistudio.google.com/).

## Local Development

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Create a `.env` file in the root directory:
    ```env
    API_KEY=your_actual_api_key_here
    ```
    *(Note: For Vite, use `VITE_API_KEY` if you adjust the `vite.config.ts`, but this project uses `define` in config to inject `process.env.API_KEY`).*

3.  Run the development server:
    ```bash
    npm run dev
    ```

---

## Deployment Options

### Option 1: Vercel (Recommended)

1.  **Push to GitHub**: Create a repository on GitHub and push this code.
2.  **Import to Vercel**:
    *   Go to [Vercel](https://vercel.com).
    *   Click "Add New" > "Project".
    *   Import your GitHub repository.
3.  **Configure Project**:
    *   **Framework Preset**: Vite
    *   **Root Directory**: `./`
    *   **Environment Variables**: Add a new variable:
        *   Key: `API_KEY`
        *   Value: `your_gemini_api_key`
4.  **Deploy**: Click Deploy.
5.  **Note**: The included `vercel.json` ensures that refreshing pages works correctly (SPA routing).

### Option 2: Netlify

1.  **Push to GitHub**.
2.  **Import to Netlify**:
    *   Go to [Netlify](https://netlify.com).
    *   "Add new site" > "Import an existing project".
    *   Connect GitHub.
3.  **Build Settings**:
    *   **Build command**: `npm run build`
    *   **Publish directory**: `dist`
4.  **Environment Variables**:
    *   Go to "Site settings" > "Build & deploy" > "Environment".
    *   Add `API_KEY` with your key.
5.  **Deploy**.
6.  **Note**: The included `netlify.toml` handles redirects for SPA routing.

### Option 3: GitHub Pages

Since GitHub Pages is static hosting, you need to set up a workflow or use the `gh-pages` package.

1.  **Update `vite.config.ts`**: Set `base: '/your-repo-name/'`.
2.  **Install gh-pages**: `npm install gh-pages --save-dev`
3.  **Add script to `package.json`**:
    ```json
    "scripts": {
      "predeploy": "npm run build",
      "deploy": "gh-pages -d dist"
    }
    ```
4.  **Environment Variables**: GitHub Pages doesn't support server-side env vars easily. You might need to make the API Key public (NOT RECOMMENDED) or use a proxy. 
    *   *Warning*: For a secure deployment with API keys, Vercel or Netlify is preferred over GitHub Pages for this specific app structure.

### Option 4: Supabase (Hosting)

If you are using Supabase for the backend (future state), you can deploy the frontend to Vercel/Netlify as described above. Supabase itself usually hosts the Database and Auth, not the frontend UI directly (though they have Edge Functions).

---

## Important Security Note

This is a client-side application. **Your API Key is embedded in the build.**
For production usage, it is highly recommended to move the AI interaction logic to a backend server (e.g., Vercel Functions, Netlify Functions, or a dedicated Node.js server) to keep your API Key secret.

For this Proof of Concept (PoC), the key is injected via build configuration. Ensure you restrict your API Key in the Google AI Studio console to specific domains (e.g., your Vercel URL) to prevent misuse.

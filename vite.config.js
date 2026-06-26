import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Source-map upload only runs when an auth token is present (CI / prod builds).
      // Keep SENTRY_AUTH_TOKEN out of git — set it in Netlify env vars, not in .env committed to the repo.
      env.SENTRY_AUTH_TOKEN
        ? sentryVitePlugin({
            org: env.SENTRY_ORG,            // e.g. "candor"
            project: env.SENTRY_PROJECT,    // e.g. "candor-web"
            authToken: env.SENTRY_AUTH_TOKEN,
            // Upload source maps to Sentry, then delete them from the build
            // output so they are never served publicly on candorhsa.com.
            sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
          })
        : undefined,
    ],
    build: {
      // 'hidden' generates source maps for Sentry but does NOT expose them publicly
      // via //# sourceMappingURL comments — keeps source private while errors stay readable.
      sourcemap: 'hidden',
    },
  }
})

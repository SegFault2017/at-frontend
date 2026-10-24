# Does `@clerk/nextjs` 6 on Next.js 16 need `clerkMiddleware()` for client-only use?

Research for https://github.com/SegFault2017/at-auth/issues/3. Date: 2026-10-24.
Versions checked: `@clerk/nextjs` 6.38.1 (lockfile), `next` 16.1.6, App Router.
Our wiring: `src/components/AuthProvider.tsx` (`"use client"`) renders `ClerkProvider` and re-exports `useAuth`, `SignIn`, `SignUp`; no `src/middleware.ts`, no `src/proxy.ts`; `next.config.ts` sets COOP `same-origin` + COEP `require-corp` on `/(.*)` for Pyodide's `SharedArrayBuffer`.

## TL;DR

**No.** `clerkMiddleware()` is only needed for server-side `auth()` / `getAuth()` (and the things built on them: `currentUser()`, `<ClerkProvider dynamic>`, server-side route protection). The client-side `ClerkProvider`, `useAuth()`, `getToken()`, `<SignIn/>`, `<SignUp/>` work from the publishable key alone. For a client-only app the `proxy.ts` file can be omitted entirely; if one is ever added, the minimal no-op is `export default clerkMiddleware()` in `src/proxy.ts`. The COOP/COEP headers do not block Clerk's script, API calls or images (all served with CORS + CORP headers); the two things they *can* break are OAuth-in-a-popup and the Cloudflare Turnstile bot-check iframe on sign-up. Only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is needed; `CLERK_SECRET_KEY` is unused in a client-only setup.

## 1. Is `clerkMiddleware()` mandatory for `ClerkProvider` + client hooks?

**Only for server-side `auth()`.** Evidence:

- Clerk's `clerkMiddleware()` reference never calls it required. It says: "The `clerkMiddleware()` helper integrates Clerk authentication into your Next.js application through Middleware" and, on route protection, "Middleware is not the best place to protect routes" — "protect access as close to the resource as possible". https://clerk.com/docs/reference/nextjs/clerk-middleware
- The error that appears when it is missing is tied to the server helper, not to hooks. Clerk's error page quotes it: "Clerk: auth() was called but Clerk can't detect usage of clerkMiddleware(). Please ensure the following: clerkMiddleware() is used in your Next.js middleware or proxy file. Your middleware or proxy matcher is configured to match this route or page. If you are using the src directory, make sure the middleware or proxy file is inside of it." The page lists two causes, both server-side: `auth()` running with no `<ClerkProvider>` above it, and 404 requests that bypass the matcher. It does not mention `useAuth` or any client hook. https://clerk.com/docs/reference/nextjs/errors/auth-was-called (short link in the message: https://clerk.com/err/auth-middleware)
- The SDK source agrees. `@clerk/nextjs@6.38.1/dist/esm/server/errors.js` has the middleware-detection errors (`authAuthHeaderMissing`, `getAuthAuthHeaderMissing`, `authSignatureInvalid` — "usually means the Clerk middleware did not run") only under `server/`. https://unpkg.com/@clerk/nextjs@6.38.1/dist/esm/server/errors.js
- Which `ClerkProvider` we actually render: the root export does `import * as ComponentsModule from "#components"` (https://unpkg.com/@clerk/nextjs@6.38.1/dist/esm/index.js), and `dist/esm/package.json` maps `#components` to `./components.server.js` under the `react-server` condition and `./components.client.js` otherwise (https://unpkg.com/@clerk/nextjs@6.38.1/dist/esm/package.json). Because `AuthProvider.tsx` is `"use client"`, we get `client-boundary/ClerkProvider` (https://unpkg.com/@clerk/nextjs@6.38.1/dist/esm/app-router/client/ClerkProvider.js), which never calls `auth()` or `next/headers`; it merges `NEXT_PUBLIC_CLERK_*` env vars into props, loads clerk-js, and calls `router.refresh()` after auth-state changes (controlled by `__unstable_invokeMiddlewareOnAuthStateChange`, default `true` — harmless with no middleware).
- Even the server `ClerkProvider` is middleware-free unless `dynamic` is set: without `dynamic` it resolves `initialState` to `null` and nonce to `""` and never touches `auth()`/`headers()` (https://unpkg.com/@clerk/nextjs@6.38.1/dist/esm/app-router/server/ClerkProvider.js). Clerk's rendering-modes guide: "Without the `dynamic` prop, `<ClerkProvider>` doesn't need a boundary" and "using `auth()` opts your entire route into dynamic rendering". https://clerk.com/docs/nextjs/guides/development/rendering-modes
- `useAuth().getToken()` is served by clerk-js talking to Clerk's Frontend API over `fetch` (the `connect-src` host in Clerk's CSP guide, see §3); no Next.js server hop is involved.

Net: with no `auth()`/`currentUser()`/`<ClerkProvider dynamic>`/`<Protect>` server usage anywhere, nothing in our tree can raise the middleware error.

## 2. Next.js 16: `middleware.ts` → `proxy.ts`; minimal no-op

- Next.js 16: "Middleware is deprecated and renamed to Proxy. Proxy defaults to the Node.js runtime" (version history). "The `middleware` file convention is deprecated and has been renamed to `proxy`." The file lives at the project root "or inside `src` if applicable" and "must export a single function, either as a default export or named `proxy`." https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Upgrade guide: "The `edge` runtime is **NOT** supported in `proxy`. The `proxy` runtime is `nodejs`, and it cannot be configured. If you want to continue using the `edge` runtime, keep using `middleware`." Codemod: `npx @next/codemod@canary middleware-to-proxy .` https://nextjs.org/docs/app/guides/upgrading/version-16#middleware-to-proxy
- Clerk's current guidance: "Create a `proxy.ts` file at the root of your project, or in your `src/` directory if you have one." "If you're using Next.js ≤15, name your file `middleware.ts` instead of `proxy.ts`." "The code itself remains the same; only the filename changes." https://clerk.com/docs/reference/nextjs/clerk-middleware — and the quickstart: "`proxy.ts` on Next.js 16+, `middleware.ts` on 15 and below." https://clerk.com/docs/nextjs/getting-started/quickstart
- Minimal form that protects no routes (Clerk's own example; all routes are public unless you call `auth.protect()` / `auth()` inside the callback):

  ```ts
  // src/proxy.ts
  import { clerkMiddleware } from '@clerk/nextjs/server'

  export default clerkMiddleware()

  export const config = {
    matcher: [
      '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
      '/(api|trpc)(.*)',
      '/__clerk/(.*)',
    ],
  }
  ```

  Note this *does* need `CLERK_SECRET_KEY` (the proxy verifies/handshakes session cookies server-side). For our client-only design the right "minimal form" is **no file at all**.

## 3. Do the COOP/COEP headers break Clerk's components?

Mechanics (MDN): under `require-corp` "A document can only load resources requested in `no-cors` mode from the same origin, or resources that have explicitly set the `Cross-Origin-Resource-Policy` header"; CORS-capable resources must be "requested in `cors` mode"; "The policy applies to loaded resources, and resources in `<iframe>`s and nested frames." https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy. web.dev adds that for iframes "The entire chain of the documents, including parent frames and child frames, must be cross-origin isolated, too", and that COOP `same-origin` means for popups "isolation is enforced for opened windows and mutual communication between both windows is disabled" (`window.opener` severed). https://web.dev/articles/coop-coep

What Clerk's prebuilt components load cross-origin, per Clerk's CSP guide (https://clerk.com/docs/guides/secure/best-practices/csp-headers): `script-src` = Frontend API host + `https://challenges.cloudflare.com` (+ `*.protect.clerk.com`); `connect-src` = Frontend API host; `img-src` = `https://img.clerk.com`; `frame-src` = `https://challenges.cloudflare.com` (+ `*.protect.clerk.com`); `worker-src 'self' blob:`.

Checked against the headers those hosts actually send (read-only `curl -I`, 2026-10-24):

| Resource | How it is loaded | Headers observed | Under `require-corp` |
|---|---|---|---|
| clerk-js (`https://<fapi>/npm/@clerk/clerk-js@5/dist/clerk.browser.js`) | `<script async crossOrigin="anonymous">` (https://unpkg.com/@clerk/shared@latest/dist/loadClerkJsScript.mjs) | `access-control-allow-origin: *`, `cross-origin-resource-policy: cross-origin` (checked on `clerk.clerk.com`, 307 → 200 both carry them) | OK |
| Frontend API calls (`/v1/...`) | `fetch` in `cors` mode | n/a (CORS, not `no-cors`) | OK — COEP only restricts `no-cors` loads |
| `img.clerk.com` (avatars, OAuth provider icons) | `<img>` | `access-control-allow-origin: *`, `cross-origin-resource-policy: cross-origin` (on `/static/google.svg`, 405 but headers present) | OK |
| Turnstile script `challenges.cloudflare.com/turnstile/v0/api.js` | `<script>` | `access-control-allow-origin: *`, `cross-origin-resource-policy: cross-origin` (302 → 200 both) | OK |
| Turnstile challenge **iframe** (`challenges.cloudflare.com/cdn-cgi/challenge-platform/...`) | `<iframe>` injected by the widget | **not confirmed** — iframe URL is generated at runtime; my guessed path returned 404 | At risk: a nested frame must itself send COEP and CORP. A Cloudflare community thread reports exactly this iframe being blocked under COEP. |
| OAuth provider sign-in | redirect, or popup when `oauthFlow` resolves to `"popup"` | n/a | Popup flow breaks under COOP `same-origin` (opener link severed) |

Two concrete exposures, then:

1. **Bot protection on sign-up.** Clerk: "Clerk runs a Cloudflare Turnstile check in the user's browser", "Clerk's prebuilt `<SignUp />` component shows the challenge inside the sign-up form", default rule challenges only "Suspicious sign-ups" (automated-traffic detection, VPN/Tor/proxy), and "It never challenges a sign-in." https://clerk.com/docs/security/bot-protection. So `/login` is unaffected; `/register` may fail for the minority of sign-ups that get challenged, if the challenge iframe is COEP-blocked. Symptom to look for in DevTools: `net::ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByCoep` on a `challenges.cloudflare.com` frame. Fixes if it bites (Clerk documents none specific to COEP): (a) Dashboard → bot protection set to not challenge (removes the iframe), or (b) stop sending COOP/COEP on `/register` and `/login` via the `source` matcher in `next.config.ts` `headers()` — with the caveat that cross-origin isolation is a *per-document* property, so a soft (client-side) navigation from an un-isolated `/register` into the Pyodide page will leave `crossOriginIsolated === false` until a hard reload; a `window.location` (full) navigation after sign-up avoids that. `COEP: credentialless` does not help here — it relaxes `no-cors` subresources, not nested frames.
2. **OAuth popup.** `<SignIn/>`/`<SignUp/>` take an `oauthFlow` prop: `"redirect"` — "Redirect to the OAuth provider on the current page"; `"popup"` — "Open a popup window"; "Defaults to `"auto"`" (auto picks popup on domains that "typically" need it). https://clerk.com/docs/nextjs/reference/components/authentication/sign-in. Under COOP `same-origin` the popup cannot talk back to the opener, so if social providers are enabled in the Clerk dashboard, pass `oauthFlow="redirect"` explicitly on both widgets. Email/password and email-code flows are unaffected.

Everything else Clerk's widgets do (inline styles via CSS-in-JS, `blob:` workers from our own origin, `fetch` to the Frontend API) is unaffected by the two headers.

## 4. Env vars

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — "Your Clerk app's Publishable Key. It will be prefixed with `pk_test_` in development instances." `CLERK_SECRET_KEY` — "Your Clerk app's Secret Key... Do not expose this on the frontend with a public environment variable." https://clerk.com/docs/deployments/clerk-environment-variables
- The client `ClerkProvider` reads only `NEXT_PUBLIC_CLERK_*` variables (18 of them, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → `publishableKey`); no `secretKey` anywhere in that path. https://unpkg.com/@clerk/nextjs@6.38.1/dist/esm/utils/mergeNextClerkPropsWithEnv.js
- The secret key is consumed by `clerkMiddleware()` / `auth()` / Backend API calls (the `clerkMiddleware` reference lists a `secretKey` option and notes "The `CLERK_ENCRYPTION_KEY` environment variable must be set when providing secretKey as an option"). https://clerk.com/docs/reference/nextjs/clerk-middleware. With no proxy file and no server helpers, the frontend never reads it. Our backend (`at-auth`) verifies tokens with JWKS (`clerk_jwks_url`, `PyJWKClient`), not the secret key, so no Clerk secret is needed anywhere in the frontend deployment.
- If the publishable key is missing in development, the client provider falls into "keyless" mode (lazy keyless creator/reader in `app-router/client/ClerkProvider.js`); the quickstart describes `npx clerk@latest init` writing both keys to `.env.local`. For CI/production builds set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` at build time (it is inlined into the client bundle). https://clerk.com/docs/nextjs/getting-started/quickstart

## What this means for the frontend

Keep the current design: no `proxy.ts`, no `middleware.ts`, client-side gating on `isSignedIn` only; provide `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and nothing else. Two cheap guards worth adding when touching the auth pages: `oauthFlow="redirect"` on `<SignIn/>`/`<SignUp/>` if any OAuth provider is enabled, and a manual check of `/register` in a browser with DevTools open to see whether the Turnstile iframe loads under COEP (if it is blocked, pick fix (a) or (b) in §3). Never add `auth()`/`currentUser()`/`<ClerkProvider dynamic>`/server `<Protect>` without also adding `src/proxy.ts` and `CLERK_SECRET_KEY`.

## Not confirmed

- Headers on the Turnstile challenge iframe document itself (runtime-generated URL). Verify in a browser.
- `npm run build` could not be used as a check: `node_modules/@clerk` is absent on this machine even though `@clerk/nextjs` is in the lockfile (the earlier `npm ci` ran with install scripts blocked); `npm install` was out of scope.
- `@clerk/nextjs` 7.x exists on npm; this note covers 6.38.1 only.

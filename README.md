This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Services and accounts

The app calls the tutor on port 8000, set by `NEXT_PUBLIC_API_URL`, and `at-auth` on port 8002, set by `NEXT_PUBLIC_AT_USER_URL`.
Solving works signed out. Signing in turns on Attempt recording, Mastery and problem sets.

Set up a fresh Clerk instance like this:

- Make email a required identifier.
- Customize the session token to include `{ "email": "{{user.primary_email_address}}" }`. `at-auth` rejects a token without it.
- Turn off bot sign-up protection. Its Turnstile check never completes under the app's COOP/COEP headers. If sign-up opens beyond invited users, move to Clerk's hosted Account Portal.
- Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env.local`. This client-only setup needs no secret key.
- Use the development instance's test mode. An email like `you+clerk_test@example.com` signs in with code `424242`.
- Set `CLERK_JWKS_URL` in `at-auth`'s own `.env`.

Sign-in uses `oauthFlow="redirect"`, because OAuth popups cannot open under COOP `same-origin`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

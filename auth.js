import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

// Only accounts on this email domain may sign in.
const ALLOWED_DOMAIN = 'cscapital.com.au';

// Routes that require a logged-in @cscapital.com.au user.
// Add more paths here to protect them (e.g. '/' for the counterparties home).
const PROTECTED_PREFIXES = ['/projects', '/offtakers'];

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Vercel sets a trusted host automatically, but this keeps preview/custom domains happy.
  trustHost: true,
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      // Tenant-specific issuer => only your organisation's directory can log in.
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    // Second line of defence: even within the tenant, require the company domain.
    async signIn({ profile }) {
      const email = (profile?.email || profile?.preferred_username || '').toLowerCase();
      return email.endsWith('@' + ALLOWED_DOMAIN);
    },
    // Used by middleware to decide whether a request to a protected route is allowed.
    authorized({ auth: session, request: { nextUrl } }) {
      const needsAuth = PROTECTED_PREFIXES.some(
        (p) => nextUrl.pathname === p || nextUrl.pathname.startsWith(p + '/')
      );
      if (!needsAuth) return true; // public route
      return !!session?.user; // protected route -> must be logged in
    },
  },
});

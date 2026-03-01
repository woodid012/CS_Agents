import { neon } from '@neondatabase/serverless';

// Lazy initialisation — neon() doesn't open a connection until a query runs,
// so this is safe at build time even when DATABASE_URL is not yet injected.
export const sql = neon(process.env.DATABASE_URL || '');

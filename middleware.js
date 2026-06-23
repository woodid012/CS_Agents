// Runs on the matched routes below and enforces the `authorized` callback in auth.js.
// Unauthenticated users are redirected to /login automatically.
export { auth as middleware } from './auth';

export const config = {
  // Only run the auth middleware on the protected CRM routes.
  // Add more matchers here if you protect more pages later.
  matcher: ['/projects/:path*', '/offtakers/:path*'],
};

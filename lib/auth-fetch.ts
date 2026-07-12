// Clerk's auth.protect() returns 404 (not 401) for non-page requests (plain fetch calls)
// when signed out, to avoid revealing route existence to unauthenticated clients.
export function isUnauthenticated(status: number): boolean {
  return status === 401 || status === 404;
}

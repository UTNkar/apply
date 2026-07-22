/**
 * The backend returns relative paths like "/media/team_logos/dg.png".
 * Next.js Image Optimization fetches the source server-side, so we must
 * prepend an absolute base URL that the Next.js server can reach.
 *
 *   NEXT_PUBLIC_API_URL  →  derived base (strip "/api")
 *   Client-side          →  window.location.origin  (nginx proxies /media/)
 *   SSR (Docker dev)     →  http://backend:8000
 *
 * In production without NEXT_PUBLIC_API_URL set to an absolute URL,
 * SSR-rendered pages will briefly reference "http://backend:8000" which
 * won't resolve.  The client hydration fixes it immediately, but the
 * proper fix is to set the env var.
 */
export function getImageUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Relative paths must start with /media/ – otherwise treat as local
  if (!url.startsWith("/media/")) {
    return url;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Absolute env var – derive backend base from it
  if (apiUrl && (apiUrl.startsWith("http://") || apiUrl.startsWith("https://"))) {
    return `${apiUrl.replace(/\/api\/?$/, "")}${url}`;
  }

  // Client-side – nginx proxies /media/ to Django on the same domain
  if (typeof window !== "undefined") {
    return `${window.location.origin}${url}`;
  }

  // SSR without absolute env var – assume Docker Compose dev
  return `http://backend:8000${url}`;
}

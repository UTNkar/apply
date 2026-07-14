/**
 * The backend returns relative paths like "/media/team_logos/dg.png".
 * Next.js Image Optimization fetches the source server-side, so we must
 * prepend an absolute base URL that the Next.js server can reach.
 *
 * Production        → set NEXT_PUBLIC_API_URL to a full absolute URL
 *                     (e.g. "https://applytest.utn.se/api"), or the
 *                     current origin is used when running on the client.
 * Docker Compose    → defaults to "http://backend:8000"
 */
export function getImageUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // 1. Absolute env var – derive backend base from it
  if (apiUrl && (apiUrl.startsWith("http://") || apiUrl.startsWith("https://"))) {
    return `${apiUrl.replace(/\/api\/?$/, "")}${url}`;
  }

  // 2. Server-side rendering (Docker Compose)
  if (typeof window === "undefined") {
    return `http://backend:8000${url}`;
  }

  // 3. Client-side production – nginx proxies /media/ to Django
  return `${window.location.origin}${url}`;
}

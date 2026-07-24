/**
 * The backend returns relative paths like "/media/team_logos/dg.png".
 *
 * The URL is used as the `src` of Next.js `<Image>`.  The browser never
 * loads it directly — it only sees `/_next/image?url=…`.  So the URL
 * must be reachable from the Next.js **server**.
 *
 * Docker dev        → http://backend:8000   (always correct inside Docker)
 * Production        → window.location.origin (nginx proxies /media/ to Django)
 *
 * Set NEXT_PUBLIC_API_URL at **build time** to an absolute URL to override
 * the Docker default (e.g. for local dev: http://localhost:8000/api).
 */
export function getImageUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Paths that don't start with /media/ are local Next.js files
  if (!url.startsWith("/media/")) {
    return url;
  }

  // Build-time env var override (NEXT_PUBLIC_* are inlined at build time)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && (apiUrl.startsWith("http://") || apiUrl.startsWith("https://"))) {
    return `${apiUrl.replace(/\/api\/?$/, "")}${url}`;
  }

  // Client-side
  if (typeof window !== "undefined") {
    // Docker dev – don't use localhost:3000, the Next.js server needs
    // to reach the backend container at backend:8000
    if (window.location.hostname === "localhost") {
      return `http://backend:8000${url}`;
    }
    // Production – nginx proxies /media/ to Django on the same domain
    return `${window.location.origin}${url}`;
  }

  // SSR default: Docker Compose (Next.js server reaches backend:8000)
  return `http://backend:8000${url}`;
}

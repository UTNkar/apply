/**
 * The backend returns relative paths like "/media/team_logos/dg.png".
 *
 * The URL returned here is used as the `src` of Next.js `<Image>`.  The
 * browser never loads this URL directly — it only sees the optimized
 * `/_next/image?url=…` endpoint.  So the URL must be reachable from
 * wherever the Next.js **server** runs:
 *
 *   Docker Compose   → http://backend:8000   (default)
 *   Local dev        → set NEXT_PUBLIC_API_URL=http://localhost:8000/api
 *   Production       → set NEXT_PUBLIC_API_URL=https://applytest.utn.se/api
 */
export function getImageUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Paths that don't start with /media/ are local files – return as-is
  if (!url.startsWith("/media/")) {
    return url;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const base = (apiUrl && (apiUrl.startsWith("http://") || apiUrl.startsWith("https://")))
    ? apiUrl.replace(/\/api\/?$/, "")
    : "http://backend:8000";

  return `${base}${url}`;
}

/**
 * The backend returns relative paths like "/media/team_logos/dg.png".
 * Next.js Image Optimization fetches the source server-side, so we must
 * prepend an absolute base URL that the Next.js server can reach.
 *
 * Set NEXT_PUBLIC_API_URL in production (e.g. "https://applytest.utn.se/api").
 * The default "http://backend:8000" is the Docker Compose service name.
 */
export function getImageUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const base = apiUrl
    ? apiUrl.replace(/\/api\/?$/, "")
    : "http://backend:8000";

  return `${base}${url}`;
}

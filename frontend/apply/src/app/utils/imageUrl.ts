/**
 * Transforms image URLs for Next.js Image optimization.
 * Next.js fetches images server-side for optimization, so the URL
 * must be accessible from inside the Docker container (backend:8000).
 */
export function getImageUrl(url: string): string {
  return url
    .replace('http://localhost:8000', 'http://backend:8000')
    .replace('http://127.0.0.1:8000', 'http://backend:8000');
}

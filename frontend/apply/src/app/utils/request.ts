const BASE_URL = process.env.API_URL || "http://localhost:8000/api"; // Replace with actual url or make an environment variable

export enum Method {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE"
}

function getCsrfTokenFromCookies() {
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];  // Extract CSRF token from the cookies
    return csrfToken;
  };


/**
 * Sends an HTTP request to the specified URL with the given method and optional body and headers.
 * Automatically includes credentials and handles CSRF tokens for non-GET requests.
 *
 * @param method - The HTTP method to use for the request (GET, POST, PUT, DELETE)
 * @param url - The URL endpoint to send the request to (without the base URL), use the URLs object for convenience
 * @param body - Optional request body to send as JSON
 * @param headers - Optional additional headers to include in the request
 * @returns A promise that resolves to the response from the server
 * @throws Error if the request fails
 */
export async function request(method: Method, url: string, body?: object, headers?: object) {
    const options: RequestInit = {
        method,
        headers: { ...headers },
        credentials: 'include',
    };

    if (body) {
        options.body = JSON.stringify(body);
        options.headers = {
            'Content-Type': 'application/json',
            ...headers
        };
    }

    if (method !== Method.GET) {
        options.headers = {
            // VERY IMPORTANT: CSRF token must be included in the headers for non-GET requests
            "X-CSRFToken": getCsrfTokenFromCookies() || "",
            ...options.headers,
        };
    }

    return fetch(`${BASE_URL}${url}`, options)
        .then(response => {
            return response
        })
        .catch(error => {
            throw error;
        });
}

import { APIRequestContext } from '@playwright/test';

/**
 * API-based authentication service for the-internet.herokuapp.com.
 * Handles login via API instead of UI, returning session cookies.
 */
export class ApiAuth {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseURL: string,
  ) {}

  /**
   * Login via API and return session cookies.
   * POST /login with form data (username, password).
   */
  async login(username: string, password: string): Promise<Record<string, string>> {
    const response = await this.request.post(`${this.baseURL}/login`, {
      data: {
        username,
        password,
      },
    });

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()} ${response.statusText()}`);
    }

    // Extract cookies from the response
    const cookieHeader = response.headers()['set-cookie'];
    const cookies: Record<string, string> = {};

    if (cookieHeader) {
      const cookieList = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
      cookieList.forEach((cookie) => {
        const [pair] = cookie.split(';');
        const [name, value] = pair.split('=');
        if (name && value) {
          cookies[name.trim()] = value.trim();
        }
      });
    }

    return cookies;
  }

  /**
   * Alternative: get session cookies by parsing response body.
   * Some sites return auth tokens in JSON response instead of Set-Cookie headers.
   */
  async loginAndGetToken(username: string, password: string): Promise<string | null> {
    const response = await this.request.post(`${this.baseURL}/login`, {
      data: {
        username,
        password,
      },
    });

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()} ${response.statusText()}`);
    }

    try {
      const body = await response.json();
      return body?.token || body?.sessionId || null;
    } catch {
      return null;
    }
  }
}

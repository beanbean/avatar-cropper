import { validateURL } from './ssrf';

const FETCH_TIMEOUT_MS = parseInt(process.env.FETCH_TIMEOUT_MS || '8000');
const MAX_INPUT_BYTES = parseInt(process.env.MAX_INPUT_BYTES || '8000000');

export class FetchError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function fetchImage(url: string): Promise<Buffer> {
  // 1. SSRF Check
  try {
    await validateURL(url);
  } catch (e: any) {
    throw new FetchError('Private or blocked URL', 400);
  }

  // 2. Fetch with Timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new FetchError(`Upstream returned ${response.status}`, 422);
    }

    // 3. Content Type Validation
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new FetchError('Target is not an image', 415);
    }

    // 4. Content Length Check (Header)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_INPUT_BYTES) {
      throw new FetchError('File too large (header)', 413);
    }

    // 5. Read Body with Limit
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_INPUT_BYTES) {
      throw new FetchError('File too large (body)', 413);
    }

    return buffer;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new FetchError('Fetch timeout', 504);
    }
    if (error instanceof FetchError) throw error;
    throw new FetchError('Failed to fetch image', 422);
  }
}
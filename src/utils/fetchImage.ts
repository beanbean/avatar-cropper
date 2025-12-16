import { validateURL } from './ssrf';

const FETCH_TIMEOUT_MS = parseInt(process.env.FETCH_TIMEOUT_MS || '8000');
const MAX_INPUT_BYTES = parseInt(process.env.MAX_INPUT_BYTES || '8000000');

// --- CẤU HÌNH WHITELIST ---
// Cho phép tải ảnh từ các domain này mà không cần check SSRF chặt
const ALLOWED_DOMAINS = [
  '.zdn.vn',       // Ví dụ: photo-stal-12.zdn.vn
  '.zalo.me',      // Ví dụ: s120.zalo.me
  '.zalo-file.me',
  '.zadn.vn'
];

export class FetchError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Hàm kiểm tra xem URL có thuộc whitelist không
function isWhitelisted(urlStr: string): boolean {
  try {
    const parsedUrl = new URL(urlStr);
    const hostname = parsedUrl.hostname;
    // Kiểm tra nếu hostname kết thúc bằng domain trong whitelist
    return ALLOWED_DOMAINS.some(domain => hostname.endsWith(domain));
  } catch (e) {
    return false; // URL lỗi thì coi như không whitelist
  }
}

export async function fetchImage(url: string): Promise<Buffer> {
  // 1. SSRF Check (Đã nâng cấp)
  try {
    // CHỈ chạy validateURL nếu domain KHÔNG nằm trong whitelist
    if (!isWhitelisted(url)) {
       await validateURL(url);
    }
  } catch (e: any) {
    // Nếu validateURL báo lỗi thì throw
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
    
    // Log lỗi chi tiết ra console server để debug nếu cần
    console.error('Fetch Image Error:', error);
    throw new FetchError('Failed to fetch image', 422);
  }
}

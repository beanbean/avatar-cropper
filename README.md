# Avatar Cropper Service

Microservice chuyên biệt để xử lý ảnh avatar (Crop & Resize).
Service này **stateless**, không lưu trữ, chỉ nhận URL ảnh và trả về Base64 đã xử lý.

## Tech Stack
- **Runtime:** Node.js 20
- **Framework:** Fastify
- **Image Engine:** Sharp (libvips)
- **Validation:** Zod
- **Security:** SSRF Protection

## Size Policy
Service chỉ chấp nhận 2 output size:
- **256x256** (Default)
- **512x512** (Dùng cho ảnh lớn/tuyên dương)

---

## Deployment Guide (Dokploy UI)

Thực hiện đúng trình tự các bước sau trên giao diện Dokploy:

### 1. Create Application
- Vào Project -> Click **"Create Service"** -> Chọn **"Application"**.
- **Name**: `avatar-cropper`
- **Repository**: (Chọn repo GitHub chứa code này)
- **Branch**: `main`
- **Build Path**: `/`

### 2. Environment Variables (Environment Tab)
Copy và paste nội dung dưới đây vào khung ENV:

```env
PORT=3000
FETCH_TIMEOUT_MS=8000
MAX_INPUT_BYTES=8000000
LOG_LEVEL=info
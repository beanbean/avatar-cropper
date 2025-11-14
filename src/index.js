import { Ai } from "@cloudflare/ai";

export default {
  async fetch(request, env) {
    try {
      if (request.method !== "POST") {
        return new Response("Use POST", { status: 405 });
      }

      // ---- 1. Nhận file từ form-data
      const contentType = request.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return new Response("Invalid upload", { status: 400 });
      }

      const form = await request.formData();
      const file = form.get("image");
      if (!file) {
        return new Response("Missing file", { status: 400 });
      }

      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      // ---- 2. Detect mặt bằng Cloudflare AI
      const ai = new Ai(env.AI);

      const detection = await ai.run("@cf/face-detection", {
        image: [...uint8]
      });

      if (!detection || !detection.faces || detection.faces.length === 0) {
        return new Response(JSON.stringify({ error: "No face detected" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const face = detection.faces[0].bbox;
      const { x, y, w, h } = face;

      // ---- 3. Crop bằng WASM (Cloudflare Canvas API)
      const img = await env.AI.preprocessImage(uint8);

      const cropped = await img.crop({
        left: x,
        top: y,
        width: w,
        height: h,
      });

      const resized = await cropped.resize({
        width: 500,
        height: 500,
        fit: "cover",
      });

      const output = await resized.toBuffer("image/png");

      // ---- 4. Upload vào R2
      const filename = `avatar_${Date.now()}.png`;

      await env.AVATAR.put(filename, output, {
        httpMetadata: {
          contentType: "image/png",
        },
      });

      const publicUrl = `https://pub-${env.ACCOUNT_ID}.r2.dev/${filename}`;

      return new Response(
        JSON.stringify({
          url: publicUrl,
          status: "ok",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    } catch (err) {
      return new Response(err.toString(), { status: 500 });
    }
  },
};

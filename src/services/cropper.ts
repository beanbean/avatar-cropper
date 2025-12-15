import sharp from 'sharp';

interface CropOptions {
  buffer: Buffer;
  size: number;
  format: 'png' | 'jpeg';
}

export async function processAvatar({ buffer, size, format }: CropOptions) {
  try {
    const pipeline = sharp(buffer)
      .rotate() // Auto rotate EXIF
      .resize(size, size, {
        fit: 'cover',
        position: 'center',
      });

    if (format === 'png') {
      pipeline.png({ quality: 80, force: true }); // PNG giữ transparency
    } else {
      pipeline.jpeg({ quality: 80, mozjpeg: true, force: true }) // JPEG optimize
      pipeline.flatten({ background: { r: 255, g: 255, b: 255 } }); // Nền trắng
    }

    const outputBuffer = await pipeline.toBuffer();
    const base64 = `data:image/${format};base64,${outputBuffer.toString('base64')}`;

    return {
      width: size,
      height: size,
      format,
      image_base64: base64
    };
  } catch (error) {
    throw new Error('IMAGE_PROCESSING_FAILED');
  }
}
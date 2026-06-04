// pages/api/upload-ad-image.js
// Ad image upload endpoint.
// Accepts base64-encoded image data, validates file type + size
// via magic bytes, uploads to Supabase Storage, returns public URL.
// ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BUCKET       = 'ad-images';
const MAX_SIZE     = 5 * 1024 * 1024; // 5 MB

// ── Magic bytes detection (not just extension sniffing) ─────
function detectMimeFromBytes(buf) {
  const b = new Uint8Array(buf);
  if (b.length < 4) return null;

  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
  // JPEG: FF D8 FF
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF)              return 'image/jpeg';
  // GIF: 47 49 46 38 (GIF8)
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  // WebP: RIFF (52 49 46 46) ... WEBP (57 45 42 50) at offset 8
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b.length >= 12 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';

  return null;
}

const MIME_EXT = {
  'image/png':  'png',
  'image/jpeg': 'jpg',
  'image/gif':  'gif',
  'image/webp': 'webp',
};

// ── Upload to Supabase Storage via REST API ─────────────────
async function uploadToStorage(fileBuffer, mimeType, ext) {
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey':        SUPABASE_KEY,
      'Content-Type':  mimeType,
    },
    body: fileBuffer,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase Storage upload failed (${res.status}): ${errText}`);
  }

  // Public URL to the uploaded file
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
}

// ── Request size limit middleware check ─────────────────────
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb', // slightly above MAX_SIZE to allow for base64 overhead
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { file, purpose } = req.body || {};

  if (!file || typeof file !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid file data (base64 string expected).' });
  }

  // ── Strip data URL prefix if present ─────────────────────
  let raw = file;
  let declaredMime = null;
  const dataUrlMatch = file.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    declaredMime = dataUrlMatch[1];
    raw = dataUrlMatch[2];
  }

  // ── Decode base64 ───────────────────────────────────────
  let buffer;
  try {
    buffer = Buffer.from(raw, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64 encoding.' });
  }

  // ── Size check ──────────────────────────────────────────
  if (buffer.length > MAX_SIZE) {
    return res.status(400).json({
      error: `File too large. Maximum is ${MAX_SIZE / 1024 / 1024} MB. Received ${(buffer.length / 1024 / 1024).toFixed(1)} MB.`,
    });
  }

  // ── Magic byte validation ───────────────────────────────
  const detectedMime = detectMimeFromBytes(buffer);
  if (!detectedMime) {
    return res.status(400).json({ error: 'Invalid image format. Only PNG, JPEG, GIF, and WebP are accepted.' });
  }

  const ext = MIME_EXT[detectedMime];

  // ── Upload to Supabase Storage ──────────────────────────
  try {
    const publicUrl = await uploadToStorage(buffer, detectedMime, ext);
    return res.status(200).json({ ok: true, url: publicUrl, mimeType: detectedMime });
  } catch (err) {
    console.error('Image upload error:', err);
    return res.status(500).json({ error: 'Could not upload image. Please try again.' });
  }
}

// Urban Radar 本地静态服务器(零依赖)
// 用法: node scripts/local-server.mjs [port]  默认 8080,监听 0.0.0.0
// 服务目录: dist-local (SPA fallback -> index.html)
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'dist-local');
const PORT = Number(process.argv[2] || process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webm': 'video/webm',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    // 防 目录穿越
    let filePath = path.join(ROOT, path.normalize(urlPath).replace(/^([.][.][/\\])+/, ''));
    if (!filePath.startsWith(ROOT)) filePath = path.join(ROOT, 'index.html');

    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      // SPA fallback
      filePath = path.join(ROOT, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
    });
    createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500);
    res.end('Internal Error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[urban-radar] serving ${ROOT}`);
  console.log(`[urban-radar] local   -> http://localhost:${PORT}/`);
});

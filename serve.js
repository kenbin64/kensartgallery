#!/usr/bin/env node
// Shows the built gallery on this computer, at http://localhost:8080
//
//   node serve.js
//
// The 3D halls need the pages to come from a web address, not straight from a
// folder: browsers will not load the 3D engine from a file opened by double
// click. This small server is that address, for looking at the gallery before
// it is published. Stop it with Ctrl+C.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, 'site');
const PORT = Number(process.argv[2]) || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };

http.createServer((req, res) => {
  let file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }          // never serve anything outside the site folder
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  if (!fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`The gallery is at http://localhost:${PORT}  (Ctrl+C to stop)`));

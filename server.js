// server.js - simple Node server to serve UCWG app on 127.0.0.1:3434
const express = require('express');
const compression = require('compression');
const path = require('path');
const app = express();
app.use(compression());
app.use(express.json({limit:'10mb'}));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT ? Number(process.env.PORT) : 3434;
const HOST = process.env.HOST || '127.0.0.1';

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, HOST, () => {
  console.log(`UCWG listening on http://${HOST}:${PORT}`);
  console.log('Warning: Server binds to localhost by default. Do not expose to untrusted networks.');
});

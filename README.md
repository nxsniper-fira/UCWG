# UCWG Rebuild — Ultimate Common Wordlist Generator

This rebuild fixes the dead site issue and replaces the placeholder base words with the provided `data/usernames.txt`.
It also lets you upload additional username files to extend the list.

## Quick Start
1. Unzip the package.
2. Install server deps:
   ```
   npm install express compression
   ```
3. Run:
   ```
   node server.js
   ```
4. Open http://127.0.0.1:3434

## Notes
- The UI loads `public/data/usernames.txt` on startup and populates the Base Words textarea.
- You can upload other username `.txt` files via the "Load more usernames" input to append unique names.
- Client mode uses a Web Worker and has a safe cap (500k) to avoid browser crashes. For larger datasets, consider server-side streaming (not implemented here).

## Ethical Use
Use this tool only for authorized penetration testing.


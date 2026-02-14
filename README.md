# E2EE Demo — End-to-End Encryption

Interactive demo of end-to-end encryption using the Web Crypto API.

Demonstrates **ECDH (P-256)** key exchange and **AES-256-GCM** encryption in the browser — no server-side crypto, no dependencies beyond the Web Crypto API.

## How it works

1. **Key generation** — Alice and Bob each generate ECDH key pairs (P-256 curve)
2. **Public key exchange** — they swap public keys over an open channel
3. **Shared secret** — each side computes `ECDH(myPrivate, theirPublic)` → identical AES-256 key
4. **Encryption** — plaintext → UTF-8 bytes → AES-256-GCM with random 96-bit IV
5. **Transmission** — server only sees `{iv, ciphertext}` and cannot decrypt
6. **Decryption** — recipient decrypts with the shared key

## Features

- Step-by-step visualization of the key exchange process
- Real-time encryption pipeline showing each stage (plaintext → bytes → IV → ciphertext → decryption)
- Chat between Alice and Bob with a "server" panel showing only encrypted data
- Key inspector showing public/private keys and the derived shared secret
- RU / EN localization

## Tech stack

- React 19
- Vite 6
- Web Crypto API (ECDH + AES-GCM)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  main.jsx      — entry point
  App.jsx       — main component (setup, keys, chat, pipeline tabs)
  App.css       — styles
  crypto.js     — ECDH key exchange + AES-GCM encrypt/decrypt
  i18n.js       — RU/EN translations
index.html      — HTML shell
vite.config.js  — Vite config
```

## License

MIT

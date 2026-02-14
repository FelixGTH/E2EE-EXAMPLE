export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  )
  return keyPair
}

export async function exportPublicKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(raw)))
}

export async function exportPrivateKey(key) {
  const jwk = await crypto.subtle.exportKey('jwk', key)
  return jwk.d
}

export async function deriveSharedKey(privateKey, publicKey) {
  const key = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  return key
}

export async function exportAesKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key)
  return Array.from(new Uint8Array(raw))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function encrypt(sharedKey, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  )

  const ivBase64 = btoa(String.fromCharCode(...iv))
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')
  const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)))
  const plaintextHex = Array.from(encoded).map(b => b.toString(16).padStart(2, '0')).join('')

  return { iv: ivBase64, ivHex, ciphertext: cipherBase64, plaintextHex }
}

export async function decrypt(sharedKey, ivBase64, cipherBase64) {
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
  const cipherBuffer = Uint8Array.from(atob(cipherBase64), c => c.charCodeAt(0))

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    cipherBuffer
  )

  return new TextDecoder().decode(plainBuffer)
}

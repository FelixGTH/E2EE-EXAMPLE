export const ALGORITHMS = {
  'P-256': {
    name: 'ECDH',
    namedCurve: 'P-256',
    keyBits: 256,
    securityBits: 128,
    label: 'NIST P-256',
    desc: 'secp256r1',
  },
  'P-384': {
    name: 'ECDH',
    namedCurve: 'P-384',
    keyBits: 384,
    securityBits: 192,
    label: 'NIST P-384',
    desc: 'secp384r1',
  },
  'P-521': {
    name: 'ECDH',
    namedCurve: 'P-521',
    keyBits: 521,
    securityBits: 256,
    label: 'NIST P-521',
    desc: 'secp521r1',
  },
  'X25519': {
    name: 'X25519',
    keyBits: 256,
    securityBits: 128,
    label: 'X25519',
    desc: 'Curve25519',
  },
}

export const AES_MODES = {
  128: { length: 128, label: 'AES-128-GCM' },
  256: { length: 256, label: 'AES-256-GCM' },
}

export async function generateKeyPair(curve = 'P-256') {
  const algo = ALGORITHMS[curve]
  if (curve === 'X25519') {
    return await crypto.subtle.generateKey(
      { name: 'X25519' },
      true,
      ['deriveKey', 'deriveBits']
    )
  }
  return await crypto.subtle.generateKey(
    { name: algo.name, namedCurve: algo.namedCurve },
    true,
    ['deriveKey']
  )
}

export async function exportPublicKey(key, curve = 'P-256') {
  const raw = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(raw)))
}

export async function exportPublicKeyBytes(key) {
  const raw = await crypto.subtle.exportKey('raw', key)
  return new Uint8Array(raw).length
}

export async function exportPrivateKey(key, curve = 'P-256') {
  const jwk = await crypto.subtle.exportKey('jwk', key)
  return jwk.d
}

export async function deriveSharedKey(privateKey, publicKey, curve = 'P-256', aesLength = 256) {
  if (curve === 'X25519') {
    return await crypto.subtle.deriveKey(
      { name: 'X25519', public: publicKey },
      privateKey,
      { name: 'AES-GCM', length: aesLength },
      true,
      ['encrypt', 'decrypt']
    )
  }
  return await crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: aesLength },
    true,
    ['encrypt', 'decrypt']
  )
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

export async function benchmarkAlgorithm(curve = 'P-256', aesLength = 256) {
  const times = {}

  let t0 = performance.now()
  const aliceKeys = await generateKeyPair(curve)
  times.keygen1 = performance.now() - t0

  t0 = performance.now()
  const bobKeys = await generateKeyPair(curve)
  times.keygen2 = performance.now() - t0

  t0 = performance.now()
  const sharedKey = await deriveSharedKey(aliceKeys.privateKey, bobKeys.publicKey, curve, aesLength)
  times.derive = performance.now() - t0

  const testPlaintext = 'Hello, World! Benchmark test message for E2EE demo.'

  t0 = performance.now()
  const { iv, ciphertext } = await encrypt(sharedKey, testPlaintext)
  times.encrypt = performance.now() - t0

  const sharedKey2 = await deriveSharedKey(bobKeys.privateKey, aliceKeys.publicKey, curve, aesLength)

  t0 = performance.now()
  await decrypt(sharedKey2, iv, ciphertext)
  times.decrypt = performance.now() - t0

  const pubKeyBytes = await exportPublicKeyBytes(aliceKeys.publicKey)
  const aesKeyHex = await exportAesKey(sharedKey)

  return {
    times,
    total: times.keygen1 + times.keygen2 + times.derive + times.encrypt + times.decrypt,
    pubKeyBytes,
    aesKeyBytes: aesLength / 8,
    aesKeyHex,
  }
}

export async function tryRandomDecrypt(ivBase64, cipherBase64) {
  const randomKeyData = crypto.getRandomValues(new Uint8Array(32))
  const randomKey = await crypto.subtle.importKey(
    'raw',
    randomKeyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  const keyHex = Array.from(randomKeyData).map(b => b.toString(16).padStart(2, '0')).join('')

  try {
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
    const cipherBuffer = Uint8Array.from(atob(cipherBase64), c => c.charCodeAt(0))
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, randomKey, cipherBuffer)
    return { keyHex, success: true }
  } catch {
    return { keyHex, success: false }
  }
}

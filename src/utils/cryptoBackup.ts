import { EncryptedBackupEnvelope } from '../types/health';

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function computeSha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function deriveAesGcmKey(passphrase: string, salt: Uint8Array, iterations = 100000): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts arbitrary JSON payload using Web Crypto AES-GCM 256-bit and PBKDF2-SHA256.
 */
export async function encryptVaultData(
  payloadJson: string,
  passphrase: string,
  recordCount: number
): Promise<EncryptedBackupEnvelope> {
  if (!passphrase || passphrase.trim().length < 4) {
    throw new Error('Encryption passphrase must be at least 4 characters.');
  }

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const iterations = 100000;

  const key = await deriveAesGcmKey(passphrase, salt, iterations);
  const encoder = new TextEncoder();
  const encodedPayload = encoder.encode(payloadJson);

  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encodedPayload
  );

  const ciphertextBytes = new Uint8Array(encryptedBuffer);
  const checksumHex = await computeSha256Hex(payloadJson);

  return {
    version: 1,
    algorithm: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iterations,
    createdAt: new Date().toISOString(),
    saltBase64: uint8ToBase64(salt),
    ivBase64: uint8ToBase64(iv),
    ciphertextBase64: uint8ToBase64(ciphertextBytes),
    recordCount,
    checksumHex,
  };
}

/**
 * Decrypts an EncryptedBackupEnvelope using the provided passphrase and verifies SHA-256 integrity.
 */
export async function decryptVaultData(
  envelope: EncryptedBackupEnvelope,
  passphrase: string
): Promise<string> {
  const salt = base64ToUint8(envelope.saltBase64);
  const iv = base64ToUint8(envelope.ivBase64);
  const ciphertext = base64ToUint8(envelope.ciphertextBase64);

  const key = await deriveAesGcmKey(passphrase, salt, envelope.iterations || 100000);

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ciphertext as unknown as BufferSource
    );
  } catch {
    throw new Error('Decryption failed: Invalid passphrase or corrupted ciphertext.');
  }

  const decoder = new TextDecoder();
  const plaintext = decoder.decode(decryptedBuffer);
  const actualChecksum = await computeSha256Hex(plaintext);
  if (envelope.checksumHex && actualChecksum !== envelope.checksumHex) {
    throw new Error('Integrity verification failed: SHA-256 checksum mismatch.');
  }

  return plaintext;
}

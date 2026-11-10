import { randomBytes, scryptSync, scrypt, timingSafeEqual, createHash, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import config from '../config/index.js';

const scryptAsync = promisify(scrypt);

/**
 * Şifreyi scrypt ile asenkron hash'ler (Event-loop bloklamaz).
 */
export async function hashPasswordAsync(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Asenkron şifre doğrulama.
 */
export async function verifyPasswordAsync(password, storedHash) {
  if (!password || !storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, key] = storedHash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = await scryptAsync(password, salt, 64);
  return timingSafeEqual(keyBuffer, derivedKey);
}

/**
 * Şifreyi scrypt ile senkron tuzlayarak (salt) hash'ler.
 * Format: salt:hash
 */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Düz metin şifreyi saklanan salt:hash ile karşılaştırır (timing-attack korumalı).
 */
export function verifyPassword(password, storedHash) {
  if (!password || !storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, key] = storedHash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = scryptSync(password, salt, 64);
  return timingSafeEqual(keyBuffer, derivedKey);
}

/**
 * Güvenli rastgele oturum token'ı ve hash'ini üretir.
 */
export function generateSessionToken() {
  const token = randomBytes(32).toString('hex');
  const hash = hashToken(token);
  return { token, hash };
}

/**
 * Token'ı SHA-256 ile hash'ler (veritabanında arama için).
 */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verilen veriyi (örn. talep_no) HMAC SHA-256 ile imzalar (QR Kod ve IDOR Koruması).
 */
export function generateHmacSignature(data) {
  const secret = config.sessionSecret || 'kampusstok-default-hmac-secret';
  return createHmac('sha256', secret).update(String(data)).digest('hex').substring(0, 16);
}

/**
 * HMAC imzasını sabit zamanlı güvenli karşılaştırma (timingSafeEqual) ile doğrular.
 */
export function verifyHmacSignature(data, signature) {
  if (!signature || typeof signature !== 'string') return false;
  try {
    const expected = generateHmacSignature(data);
    const bufExpected = Buffer.from(expected);
    const bufSig = Buffer.from(signature);
    if (bufExpected.length !== bufSig.length) return false;
    return timingSafeEqual(bufExpected, bufSig);
  } catch {
    return false;
  }
}


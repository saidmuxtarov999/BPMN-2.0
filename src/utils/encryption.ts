import { SecurityAuditEntry } from '../types/bpmn';

// --- Enterprise AES-GCM 256-bit Web Crypto Utilities ---

async function getKeyMaterial(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await getKeyMaterial(passphrase);
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPayload {
  version: 'AES-256-GCM';
  cipherText: string;
  iv: string;
  salt: string;
  hash: string;
  createdAt: string;
}

export async function computeSha256(data: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function encryptData(plainText: string, passphrase: string): Promise<EncryptedPayload> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const enc = new TextEncoder();
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    enc.encode(plainText)
  );

  const cipherText = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const hash = await computeSha256(plainText);

  return {
    version: 'AES-256-GCM',
    cipherText,
    iv: ivBase64,
    salt: saltBase64,
    hash,
    createdAt: new Date().toISOString(),
  };
}

export async function decryptData(payload: EncryptedPayload, passphrase: string): Promise<string> {
  const salt = new Uint8Array(
    atob(payload.salt)
      .split('')
      .map((c) => c.charCodeAt(0))
  );
  const iv = new Uint8Array(
    atob(payload.iv)
      .split('')
      .map((c) => c.charCodeAt(0))
  );
  const cipherBytes = new Uint8Array(
    atob(payload.cipherText)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  const key = await deriveKey(passphrase, salt);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    cipherBytes as BufferSource
  );

  const dec = new TextDecoder();
  const decryptedText = dec.decode(decryptedBuffer);

  const checkHash = await computeSha256(decryptedText);
  if (checkHash !== payload.hash) {
    throw new Error('Integrity verification failed: payload hash mismatch.');
  }

  return decryptedText;
}

// --- PII Sanitization & Data Masking Engine ---

export interface SanitizationResult {
  sanitizedText: string;
  replacementCount: number;
  maskingLog: { type: string; original: string; token: string }[];
}

export function sanitizePii(input: string): SanitizationResult {
  let text = input;
  const maskingLog: { type: string; original: string; token: string }[] = [];

  // Email pattern
  let emailCount = 0;
  text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (match) => {
    emailCount++;
    const token = `[CONFIDENTIAL_EMAIL_${emailCount}]`;
    maskingLog.push({ type: 'Email', original: match, token });
    return token;
  });

  // Credit Card numbers
  let cardCount = 0;
  text = text.replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, (match) => {
    cardCount++;
    const token = `[MASKED_PAN_${cardCount}]`;
    maskingLog.push({ type: 'Credit Card', original: match, token });
    return token;
  });

  // US SSN / National IDs
  let ssnCount = 0;
  text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, (match) => {
    ssnCount++;
    const token = `[GOV_ID_${ssnCount}]`;
    maskingLog.push({ type: 'National ID', original: match, token });
    return token;
  });

  // Phone numbers
  let phoneCount = 0;
  text = text.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, (match) => {
    // Avoid false matching short sequences
    if (match.replace(/\D/g, '').length >= 10) {
      phoneCount++;
      const token = `[PHONE_NUM_${phoneCount}]`;
      maskingLog.push({ type: 'Phone Number', original: match, token });
      return token;
    }
    return match;
  });

  // IP addresses
  let ipCount = 0;
  text = text.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, (match) => {
    ipCount++;
    const token = `[INTERNAL_IP_${ipCount}]`;
    maskingLog.push({ type: 'IP Address', original: match, token });
    return token;
  });

  return {
    sanitizedText: text,
    replacementCount: maskingLog.length,
    maskingLog,
  };
}

// --- Security Audit Logging ---

const AUDIT_STORAGE_KEY = 'bpmn_analyst_security_audit_log';

export function getAuditLogs(): SecurityAuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function appendAuditLog(
  action: SecurityAuditEntry['action'],
  details: string,
  integrityHash: string = 'N/A'
): SecurityAuditEntry {
  const entry: SecurityAuditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    action,
    details,
    integrityHash,
  };

  try {
    const existing = getAuditLogs();
    const updated = [entry, ...existing].slice(0, 100);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to append security audit log:', err);
  }

  return entry;
}

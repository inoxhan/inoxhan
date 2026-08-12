import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;
const COST = 16384; // N

function scryptAsync(
  password: string,
  salt: string,
  keylen: number,
  options: { N: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/** Biçim: scrypt$N$saltHex$hashHex */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, KEY_LEN, { N: COST });
  return `scrypt$${COST}$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const [, costStr, salt, hashHex] = parts;
  const derived = await scryptAsync(password, salt, KEY_LEN, {
    N: Number(costStr),
  });
  const expected = Buffer.from(hashHex, "hex");
  return expected.length === derived.length && timingSafeEqual(derived, expected);
}

import { customAlphabet } from "nanoid";

// Crockford-ish alphabet: no 0/O, 1/I/L confusion — readable tracking codes.
const alphabet = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const gen = customAlphabet(alphabet, 10);

// Public tracking code attached to each VideoJob, e.g. "ADE-7K3MQ9XBVT".
export function trackingCode(): string {
  return `ADE-${gen()}`;
}

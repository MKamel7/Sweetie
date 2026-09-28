// Opens a time-locked gift. The key is drand's beacon for the gift's round,
// which does not exist anywhere until that moment.
import { tlockDecrypt } from './vendor/tlock.js';

export async function unseal(ciphertext) {
  return JSON.parse(await tlockDecrypt(ciphertext));
}

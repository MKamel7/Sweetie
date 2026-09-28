// Browser entry for the time-lock decrypter; bundled into js/vendor/tlock.js by scripts/build-tlock.mjs.
import { timelockDecrypt, HttpChainClient, HttpCachingChain, defaultChainInfo } from 'tlock-js';

// Several independent mirrors of drand's "quicknet" beacon. Every beacon's
// BLS signature is verified against the chain's public key, so a mirror can't fake one.
const HOSTS = [
  'https://api.drand.sh',
  'https://api2.drand.sh',
  'https://api3.drand.sh',
  'https://drand.cloudflare.com',
];

function client(host) {
  return new HttpChainClient(new HttpCachingChain(`${host}/${defaultChainInfo.hash}`), {
    disableBeaconVerification: false,
    noCache: false,
    chainVerificationParams: { chainHash: defaultChainInfo.hash, publicKey: defaultChainInfo.public_key },
  });
}

// A mirror that hangs must not block the others.
const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('drand mirror timed out')), ms)),
]);

export async function tlockDecrypt(ciphertext) {
  let lastError;
  for (const host of HOSTS) {
    try {
      const plain = await withTimeout(timelockDecrypt(ciphertext, client(host)), 8000);
      return new TextDecoder().decode(plain);
    } catch (e) {
      lastError = e;
      if (/too early/i.test(String(e?.message))) throw e;
    }
  }
  throw lastError;
}

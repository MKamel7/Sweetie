# My Baby's Birthday Quest

An installable Android web app (PWA) in pixel art. Surprises sit along a path and each one unlocks at a real-world time (Berlin time).

## How the lock works
Every clue, title and letter is **time-lock encrypted** with [drand](https://drand.love) (the "quicknet" randomness beacon run by the League of Entropy). Each surprise is sealed to the beacon round published at its unlock time. The key for that round does not exist anywhere until that second, so nothing can open early. That includes reading the source code, changing the phone's clock, or asking the author.

- The plaintext lives only in `secrets/content.json`, which is gitignored and never committed.
- `npm run seal` writes the ciphertext to `js/sealed.js`, the only form that ships.
- Opening a surprise needs a few seconds of internet so the phone can fetch the beacon from drand's mirrors. Every beacon's signature is verified.
- Once opened, a surprise is kept on the phone and works offline.

## Schedule (Berlin time)
| When | What |
|---|---|
| Tue 29 Sep, 00:00 | Surprise 1 |
| Fri 2 Oct, 14:00 | Surprise 2 |
| Fri 2 Oct, 14:45 | Surprise 3 |
| Fri 2 Oct, 15:30 | Surprise 4 |
| Fri 2 Oct, 17:00 | Surprise 5, then the cake once all are opened |

## Changing content
1. Edit `secrets/content.json` (plaintext) and/or the times and teasers in `js/config.js`.
2. `npm run seal`
3. Bump `VERSION` in `sw.js`, run `npm test`, then commit and push to `main`.

## Develop / test
```bash
npm install
npm start            # http://localhost:8080
npm test             # unit tests: time logic, sealing rounds, no plaintext leaks
npm run test:e2e     # Playwright on a Pixel 7 viewport, with stand-in content
```
CI also runs `tests/drand-smoke.mjs`, which seals a message to a past beacon round and opens it in Chromium against the live drand network, so a broken unlock path never deploys.

## Deploy
`.github/workflows/deploy.yml` runs the tests and deploys to GitHub Pages on every push to `main`.
Pages must be enabled with **Settings → Pages → Source: GitHub Actions**, and on a free plan the repository has to be public.

On Android: open the link in Chrome → ⋮ → **Install app**.

## Credits
The pixel cat GIFs and envelope come from [lovesulei/valentine-ask](https://github.com/lovesulei/valentine-ask).

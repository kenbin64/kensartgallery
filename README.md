# Ken's Art Gallery

The source of [kensartgallery.com](https://kensartgallery.com): a walk-through 3D art gallery that runs in a
web browser with nothing to install.

- **Walk through it:** https://kensartgallery.com/walk
- **How it was built, and who did what:** https://kensartgallery.com/built

## What is here

| File | What it does |
|---|---|
| `works.js` | The one list of works, titles and settings. Everything else is built from it. |
| `build.js` | Turns that list into every page of the site. |
| `hall3d.js` | The 3D gallery (three.js): the rooms lay themselves out from the number of works. |
| `people3d.js` | The visitors, built in code from simple shapes. |
| `sound3d.js` | The sound, made in the browser with the Web Audio API. No recordings. |
| `cinema3d.js` | The screening room. |
| `make-images.py`, `signature.py` | The picture pipeline: web copies, watermark, one consistent signature, duplicate check. |
| `worker.js`, `ask-core.mjs`, `ask_test.mjs` | The contact form's server program (Cloudflare Workers) and its tests. |
| `how-built.js` | The words of the "How it was built" page. |

## What is not here, on purpose

- **The original photographs of the paintings** (`originals/`). The site publishes copies that carry a
  watermark and a signature; the unmarked full-size files stay private. Without them the build cannot run
  as it stands.
- **The films** shown in the cinema, which are large.
- **`wrangler.jsonc`**, which holds the address the contact form sends to. `wrangler.example.jsonc` shows its shape.

## Running the tests

    node ask_test.mjs

## Credit

Concept and direction: Kenneth W. Bingham. Built with Claude under a standing directive to be skeptical, to
insist on proof, and to make no claim that has not been run. The ideas are the author's; the AI implemented
and verified them. The paintings are his, made by hand.

## Copyright

© 2026 Ken Bingham. All rights reserved, except as allowed by fair use. The code is published to be read.
The images may be shared with attribution as long as the watermark and the signature stay visible; no
prints may be made and no image sold.

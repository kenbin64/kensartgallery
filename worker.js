// The one piece of the gallery that runs on a server: the contact form.
// Everything else is plain files.
//
//   POST /api/ask     a visitor sends a message. It is emailed to the artist.
//
// The artist's email address is set in wrangler.jsonc and lives only here on
// the server. It is not in any page, so it cannot be read or collected from
// the site. The visitor's own address goes in Reply-To, so pressing Reply in
// the inbox answers them directly.
//
// Nothing is kept except one number a day (count:<date>): how many messages
// were sent, so the form cannot be used to flood the inbox. Messages are not
// stored, and nothing about the visitor's device or network address is recorded.
//
// The rules live in ask-core.mjs, which has its own tests.
import { EmailMessage } from 'cloudflare:email';
import { LIMITS, validate, buildEmail, newId } from './ask-core.mjs';

const SITE_HOST = 'kensartgallery.com';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const today = () => new Date().toISOString().slice(0, 10);

async function receive(request, env, url) {
  // Only the gallery's own pages may post here: the request must come from the address it is sent to.
  if ((request.headers.get('origin') || '') !== url.origin) return json({ ok: false, error: 'This form only works from the gallery itself.' }, 403);
  let body;
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: 'That did not arrive in one piece. Please try again.' }, 400); }
  const checked = validate(body);
  if (!checked.ok) {
    // An automatic form-filler is told it worked, so it does not try again another way.
    if (checked.error === 'spam') return json({ ok: true });
    return json({ ok: false, error: checked.error }, 400);
  }
  // A ceiling on emails per day protects the inbox if the form is abused.
  const countKey = 'count:' + today();
  const sentToday = Number((await env.GALLERY.get(countKey)) || 0);
  if (sentToday >= LIMITS.perDay) return json({ ok: false, error: 'The form has had a lot of use today. Please try again tomorrow.' }, 429);

  const raw = buildEmail({ from: env.FROM_EMAIL, to: env.OWNER_EMAIL, value: checked.value, id: newId() });
  try { await env.MAIL.send(new EmailMessage(env.FROM_EMAIL, env.OWNER_EMAIL, raw)); }
  catch (e) { console.error('gallery email failed:', e && e.message); return json({ ok: false, error: 'Your message could not be sent just now. Please try again later.' }, 502); }
  await env.GALLERY.put(countKey, String(sentToday + 1), { expirationTtl: 3 * 86400 });
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // One address for every page: the secure one, without "www". Anything else is sent there
    // for good, so search engines and visitors see a single copy of the gallery.
    if (url.hostname === 'www.' + SITE_HOST || (url.hostname === SITE_HOST && url.protocol === 'http:')) {
      return Response.redirect(`https://${SITE_HOST}${url.pathname}${url.search}`, 301);
    }
    if (url.pathname === '/api/ask' && request.method === 'POST') return receive(request, env, url);
    if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'Not found.' }, 404);
    return env.ASSETS.fetch(request);
  },
};

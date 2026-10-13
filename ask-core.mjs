// The rules of the gallery's contact form, kept apart from the server program
// so they can be tested on their own (node ask_test.mjs).
//
// A visitor fills in the form on a page. worker.js checks it with validate()
// and turns it into an email with buildEmail(). The email goes to the artist.
// The artist's address is known only to the server: it is never in any page.

export const LIMITS = { message: 2000, messageMin: 5, name: 80, email: 120, work: 120, perDay: 40 };

// Take out anything that could start a new header line in an email.
const oneLine = (text) => String(text == null ? '' : text).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

// Check what was sent. Returns { ok: true, value } with tidied fields, or { ok: false, error }.
// `website` is a box people never see. Only an automatic form-filler fills it in.
export function validate(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Nothing was sent.' };
  if (oneLine(body.website) !== '') return { ok: false, error: 'spam' };
  const message = String(body.message == null ? '' : body.message).replace(/\r\n/g, '\n').trim();
  if (message.length < LIMITS.messageMin) return { ok: false, error: 'Please write a little more.' };
  if (message.length > LIMITS.message) return { ok: false, error: `Please keep it under ${LIMITS.message} characters.` };
  const name = oneLine(body.name);
  if (name.length > LIMITS.name) return { ok: false, error: 'That name is too long.' };
  // An email address is required: without one there is no way to reply.
  const email = oneLine(body.email);
  if (email.length > LIMITS.email || !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) return { ok: false, error: 'Please give an email address so Ken can reply.' };
  return { ok: true, value: { message, name, email, work: oneLine(body.work).slice(0, LIMITS.work) } };
}

// ── The email ──────────────────────────────────────────────────────────────
// Written out by hand as a plain-text message. The body is base64 so any
// characters a visitor types arrive intact and cannot break the headers.
const base64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/(.{76})/g, '$1\r\n');
};
export function emailBody(value) {
  return [
    value.work ? `A message from the gallery about "${value.work}"` : 'A message from the gallery',
    '',
    value.message,
    '',
    '----',
    `Name: ${value.name || '(not given)'}`,
    `Email: ${value.email}`,
    '',
    'Press Reply to answer them directly.',
  ].join('\n');
}
// The subject is fixed words only. The picture's title is in the body, where it cannot touch the headers.
export function buildEmail({ from, to, value, id, now = new Date() }) {
  return [
    `From: Gallery contact form <${from}>`,
    `To: <${to}>`,
    `Reply-To: <${value.email}>`,
    `Subject: Gallery message${value.work ? ' about a picture' : ''}`,
    `Date: ${now.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${id}@${from.split('@')[1]}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
  ].join('\r\n') + '\r\n\r\n' + base64(emailBody(value)) + '\r\n';
}
export function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return [...bytes].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20);
}

// Tests for the contact form's rules. Run: node ask_test.mjs
import { LIMITS, validate, emailBody, buildEmail } from './ask-core.mjs';

let passed = 0, failed = 0;
function check(name, ok) { if (ok) passed++; else { failed++; console.log('FAIL: ' + name); } }

const good = { name: 'Ann', email: 'ann@example.com', message: 'I love the castle.', work: 'Castle', website: '' };
check('a good message is accepted', validate(good).ok);
check('the fields come back tidied', validate({ ...good, name: '  Ann \n' }).value.name === 'Ann');
check('nothing sent is refused', !validate(null).ok);
check('a filled trap box is treated as spam', validate({ ...good, website: 'http://x' }).error === 'spam');
check('a message that is too short is refused', !validate({ ...good, message: 'hi' }).ok);
check('a message that is too long is refused', !validate({ ...good, message: 'x'.repeat(LIMITS.message + 1) }).ok);
check('a missing email is refused', !validate({ ...good, email: '' }).ok);
check('a bad email is refused', !validate({ ...good, email: 'ann@' }).ok);
check('an email with a line break in it is refused', !validate({ ...good, email: 'ann@example.com\nBcc: x@y.z' }).ok);
check('a name that is too long is refused', !validate({ ...good, name: 'n'.repeat(LIMITS.name + 1) }).ok);
check('a name is optional', validate({ ...good, name: '' }).ok);
check('the picture is optional', validate({ ...good, work: undefined }).value.work === '');
check('a line break in the picture title is flattened', !/[\r\n]/.test(validate({ ...good, work: 'Castle\r\nBcc: x@y.z' }).value.work));

const value = validate(good).value;
const mail = buildEmail({ from: 'gallery@example.org', to: 'owner@example.net', value, id: 'abc123', now: new Date(0) });
const [head, body] = mail.split('\r\n\r\n');
check('the email goes to the owner', head.includes('To: <owner@example.net>'));
check('a reply goes to the visitor', head.includes('Reply-To: <ann@example.com>'));
check('the subject holds none of the visitor\'s words', head.includes('Subject: Gallery message about a picture\r\n'));
check('the headers hold nothing the visitor typed except their email', !head.includes('Castle') && !head.includes('Ann') && !head.includes('love'));
const text = Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8');
check('the body carries the message', text.includes('I love the castle.'));
check('the body names the picture', text.includes('about "Castle"'));
check('the body gives the visitor\'s email', text.includes('Email: ann@example.com'));
check('the body is what emailBody makes', text === emailBody(value));
check('a general message says so', emailBody({ ...value, work: '' }).startsWith('A message from the gallery\n'));

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

/* Creates a staff account, or resets the password on an existing one.
   The name is what the audit log records against every action, so give people
   their own account rather than sharing one: "Winston approved this quote" is
   worth having and "Operations approved this quote" is not.

     node seed.mjs winston@example.com 'a long generated password' Winston > /tmp/seed.sql
     npx wrangler d1 execute tenga --remote --file=/tmp/seed.sql -y          */
const [email, pw, ...rest] = process.argv.slice(2);
const name = rest.join(' ') || 'Operations';
if (!email || !pw) { console.error('usage: node seed.mjs <email> <password> [name]'); process.exit(1) }
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { console.error('that does not look like an email address'); process.exit(1) }
// The values are interpolated into SQL below, so refuse anything that would
// need escaping rather than trying to escape it.
if (/'/.test(email + name)) { console.error('no apostrophes in the email or name'); process.exit(1) }
// The KDF is tuned down to fit a Worker's CPU budget, so the password's own
// length is doing the security. Generated, not chosen.
if (pw.length < 16) { console.error('use at least 16 characters, and generate it rather than choose it'); process.exit(1) }

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
const bits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const stored = hex(salt) + '$' + hex(bits);

console.log(`INSERT OR REPLACE INTO staff (email,name,pw_hash,role,created_at)
VALUES ('${email.toLowerCase()}','${name}','${stored}','ops',${Date.now()});`);

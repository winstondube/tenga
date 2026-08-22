/* Creates the first staff account. Run once:
     node seed.mjs ops@tenga.uk 'a long passphrase' > /tmp/seed.sql
     npx wrangler d1 execute tenga --local --file=/tmp/seed.sql   */
const [email, pw] = process.argv.slice(2);
if (!email || !pw) { console.error('usage: node seed.mjs <email> <password>'); process.exit(1) }
if (pw.length < 12) { console.error('use at least 12 characters'); process.exit(1) }

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
const bits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, key, 256);
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const stored = hex(salt) + '$' + hex(bits);

console.log(`INSERT OR REPLACE INTO staff (email,name,pw_hash,role,created_at)
VALUES ('${email.toLowerCase()}','Operations','${stored}','ops',${Date.now()});`);

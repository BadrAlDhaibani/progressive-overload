#!/usr/bin/env node
// Generates the Apple "client secret" JWT that Supabase asks for
// when configuring Sign in with Apple. Rotate every 6 months.
//
// Usage:
//   node scripts/apple-client-secret.mjs \
//     --team T88Y585VZ3 --key 463T98CDYR \
//     --services app.provolone.signin --p8 ./AuthKey_463T98CDYR.p8

import crypto from 'node:crypto';
import fs from 'node:fs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const teamId     = arg('team');
const keyId      = arg('key');
const servicesId = arg('services');
const p8Path     = arg('p8');
const months     = Number(arg('months', '6'));

if (!teamId || !keyId || !servicesId || !p8Path) {
  console.error('Missing required flags: --team --key --services --p8');
  process.exit(1);
}

const privateKey = crypto.createPrivateKey({
  key: fs.readFileSync(p8Path, 'utf8'),
  format: 'pem',
});

const b64url = (buf) =>
  Buffer.from(buf)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const now = Math.floor(Date.now() / 1000);
const exp = now + months * 30 * 24 * 60 * 60;

const header  = { alg: 'ES256', kid: keyId, typ: 'JWT' };
const payload = {
  iss: teamId,
  iat: now,
  exp,
  aud: 'https://appleid.apple.com',
  sub: servicesId,
};

const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;

const signature = crypto.sign('SHA256', Buffer.from(signingInput), {
  key: privateKey,
  dsaEncoding: 'ieee-p1363',
});

const jwt = `${signingInput}.${b64url(signature)}`;

process.stdout.write(jwt + '\n');
process.stderr.write(
  `\nExpires: ${new Date(exp * 1000).toISOString()} (in ${months} months)\n`
);

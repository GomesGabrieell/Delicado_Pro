import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, cp, readdir, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const envFile = new URL('.env', root);
if (existsSync(envFile)) process.loadEnvFile(envFile);

function httpsUrl(name, value) {
  const url = URL.parse(value);
  if (!url || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error(`Defina ${name} como uma URL HTTPS sem credenciais, parâmetros ou fragmento.`);
  }
  return url;
}

const project = httpsUrl('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL?.trim());
if (project.pathname !== '/') throw new Error('EXPO_PUBLIC_SUPABASE_URL deve conter apenas a origem do projeto.');
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
if (!/^sb_publishable_[\w-]+$/.test(key ?? '')) {
  throw new Error('Defina EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY com a chave publicável do Supabase.');
}
const endpoint = httpsUrl('DELICADO_PROPOSAL_ENDPOINT', process.env.DELICADO_PROPOSAL_ENDPOINT?.trim()
  || new URL('/functions/v1/public-proposal', project).href);
const config = { url: project.origin, key, portal: process.env.DELICADO_PORTAL_SLUG?.trim() || 'delicado-pro' };

const output = new URL('dist-cloudflare/', root);
const expo = spawnSync(process.execPath, [
  fileURLToPath(new URL('node_modules/expo/bin/cli', root)),
  'export', '--platform', 'web', '--output-dir', fileURLToPath(output), '--max-workers', '2',
], { cwd: root, stdio: 'inherit', env: { ...process.env, EXPO_NO_DOTENV: '1' } });
if (expo.error) throw expo.error;
if (expo.status !== 0) process.exit(expo.status ?? 1);

await rename(new URL('index.html', output), new URL('expo-shell.html', output));
const portal = new URL('public-proposal/', root);
for (const file of await readdir(portal, { withFileTypes: true })) {
  if (file.isFile() && /\.(html|css|js)$/.test(file.name)) {
    await copyFile(new URL(file.name, portal), new URL(file.name, output));
  }
}
await cp(new URL('assets/', portal), new URL('assets/', output), { recursive: true });
for (const name of ['_headers', '_redirects']) {
  await copyFile(new URL(name, import.meta.url), new URL(name, output));
}
await copyFile(new URL('node_modules/@supabase/supabase-js/dist/umd/supabase.js', root), new URL('supabase.js', output));
await writeFile(new URL('orcamento-config.js', output), `globalThis.delicadoConfig = ${JSON.stringify(config)};\n`);
await writeFile(new URL('config.js', output), `export const endpoint = ${JSON.stringify(endpoint.href)};\n`);

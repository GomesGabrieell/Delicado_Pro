import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';

const envFile = new URL('../.env', import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);
const sdk = new URL('../node_modules/@supabase/supabase-js/dist/umd/supabase.js', import.meta.url);
const webBuild = new URL('../dist/', import.meta.url);
const config = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim(),
  key: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim().startsWith('sb_publishable_')
    ? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim()
    : null,
  portal: process.env.DELICADO_PORTAL_SLUG?.trim() || 'delicado-pro',
};
const proposalEndpoint = process.env.DELICADO_PROPOSAL_ENDPOINT?.trim() ||
  (config.url ? config.url.replace(/\/$/, '') + '/functions/v1/public-proposal' : null);
const types = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  webp: 'image/webp',
  woff2: 'font/woff2',
  txt: 'text/plain; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  ttf: 'font/ttf',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
};
const routes = new Set([
  '/index.html', '/site.css', '/home.css', '/home.js', '/entrada.js', '/orcamento.html', '/orcamento.js', '/proposta.html',
  '/sobre.html', '/contato.html',
  '/catalogo.html', '/catalogo.js', '/catalogo.css', '/portal-session.js',
  '/cliente.html', '/cliente.css', '/cliente.js',
  '/proposal.js', '/proposal.css', '/config.js', '/assets/celebracao.webp', '/assets/casamento.webp',
  '/assets/celebracao-768.webp', '/assets/casamento-768.webp',
  '/assets/recepcao-ilustrativa.webp', '/assets/recepcao-ilustrativa-640.webp', '/assets/mesa-floral-ilustrativa.webp',
  '/assets/instrument-serif-latin.woff2', '/assets/instrument-serif-OFL.txt',
  '/assets/icone-delicado.png',
]);
const headers = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { ...headers, Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    let route = pathname === '/' ? '/index.html' : pathname;
    if (['/login', '/cadastro'].includes(route)) route = '/orcamento.html';
    if (/^\/cliente(?:\/(?:orcamentos(?:\/[a-f0-9-]{36})?|propostas|eventos|perfil))?\/?$/i.test(route)) route = '/cliente.html';
    const adminPage = /^\/admin(?:\/(?:inicio|solicitacoes|orcamentos|clientes|agenda|catalogo|propostas|equipe))?\/?$/.test(route)
      || /^\/(?:entrar|agenda|orcamento|orcamentos|catalogo|clientes|calculadora|propostas|perfil|solicitacoes|mais|sobre|contato|design-system)$/.test(route);
    const expoAsset = /^\/(?:_expo\/static|assets)\/[A-Za-z0-9_@.\[\]/-]+\.(?:js|css|png|jpe?g|webp|svg|ttf|woff2)$/i.test(route)
      && !route.split('/').some((segment) => segment === '.' || segment === '..');
    let body;
    if (route === '/orcamento-config.js') {
      body = `globalThis.delicadoConfig = ${JSON.stringify(config)};`;
    } else if (route === '/config.js' && proposalEndpoint) {
      body = `export const endpoint = ${JSON.stringify(proposalEndpoint)};`;
    } else if (route === '/supabase.js') {
      body = await readFile(sdk);
    } else if (routes.has(route) || /^\/assets\/catalogo\/(0[1-9]|1[0-5])\.webp$/.test(route)) {
      body = await readFile(new URL('.' + route, import.meta.url));
    } else if (adminPage || expoAsset || route === '/favicon.ico') {
      if (adminPage) route = '/index.html';
      try {
        body = await readFile(new URL('.' + route, webBuild));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        response.writeHead(adminPage ? 503 : 404, { ...headers, 'Content-Type': types.txt });
        response.end(adminPage ? 'A área da empresa ainda precisa do bundle Expo Web. Execute npm run portal:build.' : undefined);
        return;
      }
    } else {
      response.writeHead(404, headers).end();
      return;
    }

    response.writeHead(200, {
      ...headers,
      'Cache-Control': route.startsWith('/assets/') || route.startsWith('/_expo/static/') ? 'public, max-age=300' : headers['Cache-Control'],
      'Content-Type': types[route.split('.').pop()],
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(503, headers).end();
  }
});

const port = Number(process.argv[2] ?? 8786);
server.listen(port, '127.0.0.1', () => console.log(`Delicado Pro em http://127.0.0.1:${port}/`));

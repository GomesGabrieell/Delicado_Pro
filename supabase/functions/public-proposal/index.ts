import { createClient } from '@supabase/supabase-js';
import { proposalPdf } from './pdf.mjs';

const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const url = Deno.env.get('SUPABASE_URL');
const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
}) : null;
const allowedOrigins = new Set((Deno.env.get('PROPOSAL_WEB_ORIGIN') ?? '')
  .split(',').map((value) => value.trim()).filter(Boolean));

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  });
  const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
  if (origin && !allowedOrigins.has(origin)) return json({ error: 'Origem inválida.' }, 403);
  if (origin) headers.set('Access-Control-Allow-Origin', origin);
  if (!supabase || !allowedOrigins.size) return json({ error: 'Portal indisponível no momento.' }, 503);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return json({ error: 'Método inválido.' }, 405);

  try {
    // Requests have a fixed small shape. Bound the stream even when Content-Length is absent.
    const reader = req.body?.getReader();
    if (!reader) return json({ error: 'Requisição inválida.' }, 400);
    let length = 0;
    const decoder = new TextDecoder();
    let body = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 4096) {
        await reader.cancel();
        return json({ error: 'Requisição muito longa.' }, 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    const input = JSON.parse(body + decoder.decode());
    if (!input || !['read','respond','pdf','customer_pdf'].includes(input.action)
      || (input.action !== 'customer_pdf' && (typeof input.token !== 'string' || !/^[0-9a-f]{64}$/.test(input.token)))) {
      return json({ error: 'Requisição inválida.' }, 400);
    }
    if (input.action === 'respond') {
      if (typeof input.decision !== 'string' || (input.wantsRevision != null && typeof input.wantsRevision !== 'boolean')) {
        return json({ error: 'Resposta inválida.' }, 400);
      }
      const { data, error } = await supabase.rpc('respond_public_proposal', {
        p_token: input.token, p_decision: input.decision ?? null, p_wants_revision: input.wantsRevision ?? null,
      });
      if (error?.code === '23505') return json({ error: 'Já recebemos uma resposta.' }, 409);
      if (error?.code === '22023') return json({ error: 'Resposta inválida.' }, 400);
      if (error) throw error;
      return data ? json(data) : json({ error: 'Proposta indisponível ou expirada.' }, 404);
    }

    let source;
    if (input.action === 'customer_pdf') {
      const bearer = req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
      if (!bearer) return json({ error: 'Sessão necessária.' }, 401);
      if (typeof input.proposalId !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input.proposalId)) {
        return json({ error: 'Requisição inválida.' }, 400);
      }
      const { data: auth, error: authError } = await supabase.auth.getUser(bearer);
      if (authError || !auth.user || auth.user.is_anonymous) return json({ error: 'Sessão inválida.' }, 401);
      source = await supabase.rpc('customer_proposal_pdf_source', { p_user: auth.user.id, p_proposal: input.proposalId });
    } else {
      source = await supabase.rpc('read_public_proposal', { p_token: input.token });
    }
    const { data, error } = source;
    if (error) throw error;
    if (!data) return json({ error: 'Proposta indisponível ou expirada.' }, 404);
    const { paths, ...proposal } = data;
    const storage = supabase.storage.from('quote-inspiration');
    if (input.action === 'read') {
      const ttl = Math.max(1, Math.min(120, Math.ceil((Date.parse(proposal.expiresAt) - Date.now()) / 1000)));
      const signed = paths.length ? await storage.createSignedUrls(paths, ttl) : null;
      if (signed?.error) throw signed.error;
      return json({ ...proposal, images: signed?.data?.flatMap((image) => image.signedUrl ? [image.signedUrl] : []) ?? [] });
    }
    const images: Uint8Array[] = [];
    let bytes = 0;
    for (const path of paths as string[]) {
      const { data: file, error: downloadError } = await storage.download(path);
      if (downloadError) throw downloadError;
      bytes += file.size;
      if (bytes > 12 * 1024 * 1024) return json({ error: 'As imagens excedem o limite do PDF. Consulte a proposta pelo link.' }, 422);
      images.push(new Uint8Array(await file.arrayBuffer()));
    }
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', 'attachment; filename="proposta-' + proposal.content.code + '.pdf"');
    return new Response(proposalPdf(proposal, images), { headers });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'Requisição inválida.' }, 400);
    return json({ error: 'Não foi possível concluir a operação. Tente novamente.' }, 500);
  }
});

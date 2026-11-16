import type { SupabaseClient } from '@supabase/supabase-js';

export const decisions = { approved: 'Aprovada', negotiate: 'Alterações solicitadas', declined: 'Recusada' } as const;
export type Decision = keyof typeof decisions;
export type ProposalContent = {
  code: string; title: string; customer: string; decoration?: string; payment?: string;
  total?: string; eventDate?: string | null; location?: string;
};
export type ProposalRow = {
  id: string; quote_id: string; version: number; content: ProposalContent;
  sent_at: string; expires_at: string; revoked_at: string | null; decision: Decision | null;
  wants_revision: boolean | null; responded_at: string | null; notification_read_at: string | null;
};
export const proposalDate = (value: string) => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export async function listProposals(client: SupabaseClient, company: string, {
  quote, id, unread, decision, search = '', offset = 0, limit = 21, responses = false,
}: { quote?: string; id?: string; unread?: boolean; decision?: Decision | 'sent'; search?: string; offset?: number; limit?: number; responses?: boolean } = {}) {
  let query = client.from('commercial_proposals')
    .select('id,quote_id,version,content,sent_at,expires_at,revoked_at,decision,wants_revision,responded_at,notification_read_at')
    .eq('company_id', company);
  if (quote) query = query.eq('quote_id', quote);
  if (id) query = query.eq('id', id);
  if (responses) query = query.not('responded_at', 'is', null);
  if (unread) query = query.is('notification_read_at', null);
  if (decision === 'sent') query = query.is('decision', null).is('revoked_at', null).gt('expires_at', new Date().toISOString());
  else if (decision) query = query.eq('decision', decision);
  const term = search.trim().replace(/[^\p{L}\p{N} -]/gu, ' ').trim();
  if (term) query = query.or(`content->>customer.ilike.*${term}*,content->>title.ilike.*${term}*`);
  const order = quote ? 'version' : responses ? 'responded_at' : 'sent_at';
  const { data, error } = await query.order(order, { ascending: false }).order('id')
    .range(offset, offset + limit - 1).returns<ProposalRow[]>();
  if (error) throw error;
  return data;
}

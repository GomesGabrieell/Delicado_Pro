import type { SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import type { Company } from '../catalog/model';
import { Screen } from '../components/Screen';
import { useQuoteFeed } from '../dashboard/useQuoteFeed';
import { EmptyState, FormField, ListItem, LoadingState, PrimaryButton, SecondaryButton, StatusBadge } from '../design-system';
import { space, type } from '../design-system/tokens';
import { confirmAction } from '../components/confirmAction';

const roles = { owner: 'Proprietário', admin: 'Administrador', member: 'Membro' } as const;
type Membership = { user_id: string; role: keyof typeof roles; status: 'active' | 'revoked'; display_name: string | null; email: string | null };

export function TeamScreen({ client, company, userId }: { client: SupabaseClient; company: Company; userId: string }) {
  const [page, setPage] = useState(0);
  const load = useCallback(async (connection: SupabaseClient, scope: string) => {
    const { data, error } = await connection.rpc('list_company_team', { p_company: scope, p_offset: page * 20 });
    if (error) throw error;
    return data as Membership[];
  }, [page]);
  const feed = useQuoteFeed(client, company.id, load);
  const [email, setEmail] = useState('');
  const [invitedRole, setRole] = useState<'member' | 'admin'>('member');
  const [invitation, setInvitation] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await operation(); }
    catch { setError('Não foi possível concluir. Confira os dados, as permissões e a atualização do banco.'); }
    finally { setBusy(false); }
  }

  return <Screen title="Equipe" description={company.name} layout="wide">
    <Text style={type.body}>Envie o convite ao e-mail informado. O acesso exige que a pessoa confirme esse e-mail no Supabase.</Text>
    <FormField label="E-mail da pessoa convidada" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
    <Text style={type.detail}>Papel do convite: {roles[invitedRole]}</Text>
    {company.role === 'owner' && <SecondaryButton label={invitedRole === 'member' ? 'Convidar como administrador' : 'Convidar como membro'}
      onPress={() => setRole(invitedRole === 'member' ? 'admin' : 'member')} disabled={busy} />}
    <PrimaryButton label="Gerar convite" loading={busy} disabled={!email.trim()} onPress={() => void run(async () => {
      setInvitation('');
      const { data, error: cause } = await client.rpc('issue_company_invitation', {
        p_company: company.id, p_email: email.trim(), p_role: invitedRole,
      });
      if (cause || typeof data !== 'string') throw cause ?? new Error();
      setInvitation(globalThis.location.origin + '/login#convite=' + data);
    })} />
    {!!invitation && <View style={{ gap: space.xs }}>
      <Text style={type.section}>Convite válido por 7 dias</Text>
      <Text selectable style={type.body}>{invitation}</Text>
    </View>}
    {!!notice && <Text accessibilityRole="alert" style={type.body}>{notice}</Text>}
    {!!error && <Text accessibilityRole="alert" style={type.body}>{error}</Text>}
    <Text style={type.section}>Vínculos da empresa</Text>
    {feed.loading ? <LoadingState /> : feed.error ? <EmptyState title="Não foi possível consultar a equipe" error
      action={{ label: 'Tentar novamente', onPress: feed.retry }} /> : feed.rows.slice(0, 20).map((row) => {
      const canChange = row.user_id !== userId && (company.role === 'owner' || row.role === 'member');
      const action = row.status === 'active' ? 'Revogar acesso' : 'Reativar acesso';
      return <View key={row.user_id} style={{ gap: space.xs }}>
        <ListItem title={row.user_id === userId ? 'Você' : row.display_name || row.email || 'Integrante da equipe'}
          detail={[roles[row.role], row.email].filter(Boolean).join(' · ')}
          trailing={<StatusBadge label={row.status === 'active' ? 'Ativo' : 'Revogado'} />} />
        {canChange && <SecondaryButton label={action} disabled={busy} onPress={() => confirmAction(action, 'Confirme a alteração deste vínculo.', action,
          () => void run(async () => {
            const { error: cause } = await client.rpc('set_company_member', {
              p_company_id: company.id, p_user_id: row.user_id, p_role: row.role,
              p_status: row.status === 'active' ? 'revoked' : 'active',
            });
            if (cause) throw cause;
            setNotice('Vínculo atualizado.');
            feed.retry();
          }))} />}
      </View>;
    })}
    {page > 0 && <SecondaryButton label="Página anterior" onPress={() => setPage(page - 1)} />}
    {feed.rows.length > 20 && <SecondaryButton label="Próxima página" onPress={() => setPage(page + 1)} />}
  </Screen>;
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { useState } from 'react';

import { Screen } from '../components/Screen';
import { ConfirmDialog, SecondaryButton } from '../design-system';

export function AccountScreen({ client, email }: { client: SupabaseClient; email?: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function signOut() {
    setBusy(true);
    setFailed(false);

    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      setFailed(Boolean(error));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Sua conta" description={email}>
      <SecondaryButton label="Sair da conta" icon="log-out" onPress={() => { setFailed(false); setConfirming(true); }} />
      <ConfirmDialog visible={confirming} title="Sair da conta?"
        description="Sua sessão será encerrada neste dispositivo." confirmLabel="Sair" destructive loading={busy}
        error={failed ? 'Não foi possível sair. Tente novamente.' : undefined}
        onClose={() => { setConfirming(false); setFailed(false); }} onConfirm={() => void signOut()} />
    </Screen>
  );
}

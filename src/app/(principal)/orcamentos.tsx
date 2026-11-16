import type { SupabaseClient } from '@supabase/supabase-js';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '../../components/Screen';
import { CompanyPicker, WorkspaceList, WorkspaceRow, WorkspaceState } from '../../components/WorkspaceControls';
import { useCompanies } from '../../navigation/useCompanies';
import { routeId } from '../../navigation/routes';
import { useRouteSession } from '../../navigation/useRouteSession';
import { CompanyQuotes } from '../../quotes/QuotesScreen';
import { colors } from '../../theme';

function QuoteTab({ client, userId, pending }: { client: SupabaseClient; userId: string; pending: boolean }) {
  const { company, companies, loading, error, retry, selectCompany } = useCompanies(client, userId);
  const [choosing, setChoosing] = useState(false);

  if (company && !error && !choosing) {
    return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.offWhite }}>
      <CompanyQuotes key={company.id} client={client} company={company}
        initialFilter={pending ? 'pending' : ''} canSwitch={companies.length > 1}
        back={() => setChoosing(true)}
        websiteRequests={company.role === 'owner' ? () => router.push({
          pathname: '/solicitacoes', params: { company: company.id, origem: 'site' },
        }) : undefined}
        compose={(quote) => router.push({ pathname: '/calculadora', params: { company: company.id, quote } })}
        newComposition={() => router.push({ pathname: '/calculadora', params: { company: company.id } })}
        proposals={(quote) => router.push({ pathname: '/propostas', params: { company: company.id, quote } })} />
    </SafeAreaView>;
  }
  return <Screen title="Orçamentos" topInset>
    {!loading && !error && company ? <>
      <CompanyPicker company={company} companies={companies} onSelect={(id) => { selectCompany(id); setChoosing(false); }} />
      <WorkspaceList><WorkspaceRow title="Ver orçamentos" icon="file-text" onPress={() => setChoosing(false)} /></WorkspaceList>
    </> : <WorkspaceList>
      <WorkspaceState loading={loading} error={error} retry={retry} message="Peça ao responsável da empresa para vincular sua conta." />
    </WorkspaceList>}
  </Screen>;
}

export default function Quotes() {
  const auth = useRouteSession();
  const params = useLocalSearchParams();
  const company = routeId(params.company);
  const clientId = routeId(params.clientId);
  const quoteId = routeId(params.quoteId);
  const pending = params.filtro === 'pendentes';
  if (company && (clientId || quoteId)) return <Redirect href={{ pathname: '/orcamento', params: { company, clientId, quoteId } }} />;
  return auth && <QuoteTab key={String(params.visita ?? params.filtro ?? '')} client={auth.client} userId={auth.user.id} pending={pending} />;
}

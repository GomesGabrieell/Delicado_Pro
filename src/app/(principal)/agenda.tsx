import type { SupabaseClient } from '@supabase/supabase-js';
import { useState } from 'react';

import { AgendaCalendar } from '../../agenda/AgendaCalendar';
import { shiftMonth, today } from '../../agenda/calendar';
import { Screen } from '../../components/Screen';
import { CompanyPicker, WorkspaceList, WorkspaceState } from '../../components/WorkspaceControls';
import { useCompanies } from '../../navigation/useCompanies';
import { useRouteSession } from '../../navigation/useRouteSession';

function CompanyAgenda({ client, userId }: { client: SupabaseClient; userId: string }) {
  const [month, setMonth] = useState(() => shiftMonth(today(), 0));
  const { company, companies, loading, error, retry, selectCompany } = useCompanies(client, userId);
  return (
    <Screen title="Agenda" description="Eventos dos orçamentos ativos" topInset layout="full">
      {!loading && !error && company ? <>
        <CompanyPicker company={company} companies={companies} onSelect={selectCompany} />
        <AgendaCalendar key={company.id} client={client} company={company.id} month={month} setMonth={setMonth} />
      </> : <WorkspaceList>
        <WorkspaceState loading={loading} error={error} retry={retry} message="Sua conta ainda não tem uma empresa ativa." />
      </WorkspaceList>}
    </Screen>
  );
}

export default function Agenda() {
  const auth = useRouteSession();
  return auth && <CompanyAgenda client={auth.client} userId={auth.user.id} />;
}

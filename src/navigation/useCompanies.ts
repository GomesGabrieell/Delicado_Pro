import type { SupabaseClient } from '@supabase/supabase-js';
import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useState } from 'react';

import type { Company } from '../catalog/model';
import { catalogError, listCompanies } from '../catalog/repository';

export const SelectedCompanyContext = createContext({
  companyId: '',
  selectCompany: (_companyId: string) => {},
});

export function useCompanies(client: SupabaseClient, userId: string) {
  const { companyId, selectCompany } = useContext(SelectedCompanyContext);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    void listCompanies(client, userId)
      .then((rows) => { if (active) setCompanies(rows); })
      .catch((cause) => {
        if (active) {
          setCompanies([]);
          setError(catalogError(cause));
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // Changing the revision retries the membership request while focused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, userId, revision]));

  return {
    companies, company: companies.find(({ id }) => id === companyId) ?? companies[0],
    loading, error, selectCompany, retry: () => setRevision((value) => value + 1),
  };
}

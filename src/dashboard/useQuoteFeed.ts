import type { SupabaseClient } from '@supabase/supabase-js';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { quoteError } from '../quotes/repository';

type Loader<T> = (client: SupabaseClient, company: string) => Promise<T[]>;
type Feed<T> = { company: string; load: Loader<T>; revision: number; rows: T[]; error?: string };

export function useQuoteFeed<T>(client: SupabaseClient, company: string, load: Loader<T>) {
  const [feed, setFeed] = useState<Feed<T>>();
  const [revision, setRevision] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setFeed(undefined);
    void load(client, company).then((rows) => {
      if (active) setFeed({ company, load, revision, rows });
    }).catch((cause) => {
      if (active) setFeed({ company, load, revision, rows: [], error: quoteError(cause) });
    });
    return () => { active = false; };
  }, [client, company, load, revision]));

  const current = feed?.company === company && feed.load === load && feed.revision === revision ? feed : undefined;
  return {
    rows: current?.rows ?? [], error: current?.error, loading: !current,
    retry: () => setRevision((value) => value + 1),
  };
}

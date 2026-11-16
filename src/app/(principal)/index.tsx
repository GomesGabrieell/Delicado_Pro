import { Redirect } from 'expo-router';

import { useRouteSession } from '../../navigation/useRouteSession';
import { Dashboard, SetupDashboard } from '../../screens/Dashboard';
import { supabase } from '../../services/supabase';

export default function Index() {
  const auth = useRouteSession();
  if (auth) return <Dashboard client={auth.client} userId={auth.user.id} />;
  if (supabase) return <Redirect href="/entrar" />;
  return <SetupDashboard />;
}

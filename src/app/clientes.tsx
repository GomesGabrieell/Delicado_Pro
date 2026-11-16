import { router, useLocalSearchParams } from 'expo-router';
import { ClientsScreen } from '../clients/ClientsScreen';
import { useRouteSession } from '../navigation/useRouteSession';
import { routeId } from '../navigation/routes';

export default function Clients() {
  const auth = useRouteSession();
  const { company } = useLocalSearchParams();
  return auth && <ClientsScreen client={auth.client} userId={auth.user.id} initialCompany={routeId(company)}
    openQuote={(params) => router.push({ pathname: '/orcamento', params })} />;
}

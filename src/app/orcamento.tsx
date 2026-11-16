import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { QuotesScreen } from '../quotes/QuotesScreen';
import { backTo, routeId } from '../navigation/routes';
import { useRouteSession } from '../navigation/useRouteSession';

export default function Quotes() {
  const auth = useRouteSession();
  const params = useLocalSearchParams();
  const company = routeId(params.company);
  const clientId = routeId(params.clientId);
  const quoteId = routeId(params.quoteId);
  const create = params.novo === '1';
  if (!company || (!clientId && !quoteId && !create)) return <Redirect href="/orcamentos" />;
  return auth && <QuotesScreen client={auth.client} userId={auth.user.id}
    target={{ company, clientId, quoteId, create }}
    onBack={() => backTo('/orcamentos')}
    compose={(company, quote) => router.push({ pathname: '/calculadora', params: { company, quote } })}
    proposals={(company, quote) => router.push({ pathname: '/propostas', params: { company, quote } })} />;
}

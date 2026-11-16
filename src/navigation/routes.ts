import { router } from 'expo-router';

export function backTo(path: '/' | '/clientes' | '/orcamentos') {
  if (router.canGoBack()) router.back();
  else router.replace(path);
}

export function routeId(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase() : undefined;
}

export function openQuote(company: string, quoteId: string) {
  router.push({ pathname: '/orcamento', params: { company, quoteId } });
}

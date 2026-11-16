import { SafeAreaView } from 'react-native-safe-area-context';
import { CatalogScreen } from '../../catalog/CatalogScreen';
import { useRouteSession } from '../../navigation/useRouteSession';
import { openQuote } from '../../navigation/routes';
import { colors } from '../../theme';

export default function Catalog() {
  const auth = useRouteSession();
  return auth && <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.offWhite }}>
    <CatalogScreen client={auth.client} userId={auth.user.id} openQuote={openQuote} />
  </SafeAreaView>;
}

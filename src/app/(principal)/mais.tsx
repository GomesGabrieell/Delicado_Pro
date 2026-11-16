import { router } from 'expo-router';

import { Screen } from '../../components/Screen';
import { WorkspaceList, WorkspaceRow } from '../../components/WorkspaceControls';
import { useRouteSession } from '../../navigation/useRouteSession';

export default function More() {
  const auth = useRouteSession();
  return auth && (
    <Screen title="Mais" topInset>
      <WorkspaceList>
        <WorkspaceRow title="Clientes" icon="users" onPress={() => router.push('/clientes')} />
        <WorkspaceRow title="Minha conta" icon="user" onPress={() => router.push('/perfil')} />
      </WorkspaceList>
    </Screen>
  );
}

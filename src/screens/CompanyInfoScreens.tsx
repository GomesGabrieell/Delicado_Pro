import { useState } from 'react';
import { Linking, Text } from 'react-native';

import { Screen } from '../components/Screen';
import { WorkspaceList, WorkspaceRow } from '../components/WorkspaceControls';
import { palette, type } from '../design-system/tokens';

const location = 'Ipatinga, Minas Gerais';
const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
const contactUrl = process.env.EXPO_PUBLIC_CONTACT_PAGE_URL?.trim();

function ExternalRow({ title, detail, icon, url }: {
  title: string;
  detail?: string;
  icon: 'map-pin' | 'external-link';
  url: string;
}) {
  const [error, setError] = useState(false);

  const open = async () => {
    setError(false);
    try {
      await Linking.openURL(url);
    } catch {
      setError(true);
    }
  };

  return <>
    <WorkspaceList>
      <WorkspaceRow title={title} detail={detail} icon={icon} onPress={() => void open()} />
    </WorkspaceList>
    {error && <Text accessibilityRole="alert" style={[type.detail, { color: palette.danger }]}>
      Não foi possível abrir o link. Tente novamente.
    </Text>}
  </>;
}

export function AboutScreen() {
  return (
    <Screen title="Sobre" description="Delicado Pro" topInset>
      <Text style={type.body}>
        O Delicado Pro cria arranjos, mesas e cenários para casamentos, noivados, aniversários e outras comemorações.
      </Text>
      <ExternalRow title="Ver cidade no mapa" detail={location} icon="map-pin" url={mapUrl} />
    </Screen>
  );
}

export function ContactScreen() {
  return (
    <Screen title="Contato" topInset>
      {contactUrl && /^https?:\/\//i.test(contactUrl) ? <>
        <Text style={type.body}>
          Para conversar com a equipe sobre a decoração do seu evento, envie uma solicitação pelo site.
        </Text>
        <ExternalRow title="Abrir contato no site" icon="external-link" url={contactUrl} />
      </> : <Text style={type.body}>O canal de atendimento pelo site está indisponível nesta instalação.</Text>}
    </Screen>
  );
}

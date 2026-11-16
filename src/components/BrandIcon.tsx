import { Image, StyleSheet } from 'react-native';

import appIcon from '../../public-proposal/assets/icone-delicado.png';

export function BrandIcon() {
  return <Image source={appIcon} accessible={false} style={styles.icon} />;
}

const styles = StyleSheet.create({
  icon: { width: 36, height: 36, borderRadius: 9 },
});

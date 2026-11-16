import { router } from 'expo-router';

import { DesignSystemScreen } from '../screens/DesignSystemScreen';

export default function DesignSystem() {
  return <DesignSystemScreen onBack={() => {
    if (router.canGoBack()) router.back();
    else router.replace('/mais');
  }} />;
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { FormField, SecondaryButton } from '../design-system';
import { cardElevation, corners, palette } from '../design-system/tokens';
import { colors, spacing } from '../theme';

export function SignInScreen({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function switchMode(next: boolean) {
    setRegistering(next);
    setPassword('');
    setConfirmation('');
    setError('');
    setNotice('');
  }

  async function submit() {
    const address = email.trim();
    if (registering && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError('Informe um e-mail válido.');
      return;
    }
    if (registering && password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (registering && password !== confirmation) {
      setError('As senhas precisam ser iguais.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const credentials = { email: address, password };
      const result = registering
        ? await client.auth.signUp({
            ...credentials,
            options: Platform.OS === 'web' ? { emailRedirectTo: window.location.origin } : undefined,
          })
        : await client.auth.signInWithPassword(credentials);

      if (result.error) {
        switch (result.error.code) {
          case 'invalid_credentials':
            setError('E-mail ou senha inválidos.');
            break;
          case 'email_not_confirmed':
            setError('Confirme seu e-mail pelo link recebido antes de entrar.');
            break;
          case 'weak_password':
            setError('Escolha uma senha mais forte.');
            break;
          case 'over_email_send_rate_limit':
          case 'over_request_rate_limit':
            setError('Aguarde alguns minutos antes de tentar novamente.');
            break;
          case 'email_address_not_authorized':
            setError('O serviço de e-mail deste projeto ainda precisa ser configurado para enviar a confirmação ao seu endereço.');
            break;
          case 'signup_disabled':
            setError('O cadastro está desativado neste projeto.');
            break;
          default:
            setError(registering ? 'Não foi possível criar a conta. Tente novamente.' : 'Não foi possível entrar. Tente novamente.');
        }
      } else if (registering && !result.data.session) {
        switchMode(false);
        setNotice('Confira sua caixa de entrada e o spam. Se receber um link de confirmação, abra-o e volte aqui para entrar. Se já tiver uma conta, use sua senha.');
      }
    } catch {
      setError('Não foi possível conectar. Verifique sua conexão e tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      layout="compact"
      title={registering ? 'Criar conta de cliente' : 'Entrar'}
      description={registering ? 'Informe seu e-mail e escolha uma senha.' : 'Use o e-mail e a senha da sua conta.'}
    >
      <View style={styles.form}>
        {notice !== '' && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
          <FormField
            label="E-mail"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!busy}
            keyboardType="email-address"
            onChangeText={setEmail}
            value={email}
          />
          <FormField
            label="Senha"
            autoCapitalize="none"
            autoComplete={registering ? 'new-password' : 'current-password'}
            autoCorrect={false}
            editable={!busy}
            onChangeText={setPassword}
            secureTextEntry
            value={password}
          />
        {registering && (
            <FormField
              label="Confirmar senha"
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              editable={!busy}
              onChangeText={setConfirmation}
              secureTextEntry
              value={confirmation}
            />
        )}
        {error !== '' && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <ActionButton
          disabled={busy || !email.trim() || !password || (registering && !confirmation)}
          label={registering ? (busy ? 'Criando conta…' : 'Cadastrar') : (busy ? 'Entrando…' : 'Entrar')}
          onPress={() => void submit()}
        />
      </View>
      <SecondaryButton label={registering ? 'Voltar para entrar' : 'Criar conta de cliente'} onPress={() => switchMode(!registering)} disabled={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { ...cardElevation, gap: spacing.medium, padding: spacing.large, backgroundColor: palette.background, borderRadius: corners.surface },
  error: { color: colors.error, fontSize: 16 },
  notice: { color: colors.graphite, fontSize: 16, lineHeight: 24 },
});

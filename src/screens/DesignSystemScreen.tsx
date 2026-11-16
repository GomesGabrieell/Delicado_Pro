import { useState, type PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppHeader, BottomSheet, ConfirmDialog, EmptyState, FilterChips, FloatingActionButton,
  FormField, IconButton, ListItem, LoadingState, PrimaryButton, SearchBar, SecondaryButton, StatusBadge,
} from '../design-system';
import { corners, palette, space, type } from '../design-system/tokens';

const filters = [
  { id: 'all', label: 'Todos' },
  { id: 'open', label: 'Em aberto' },
  { id: 'done', label: 'Concluídos' },
] as const;
const examples = [
  { id: 'open', title: 'Orçamento em revisão', detail: 'Comercial', badge: 'Em aberto', tone: 'warning', icon: 'file-text' },
  { id: 'done', title: 'Cadastro de acervo', detail: 'Catálogo', badge: 'Concluído', tone: 'positive', icon: 'grid' },
] as const;

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={type.section}>{title}</Text>
    {children}
  </View>;
}

export function DesignSystemScreen({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [name, setName] = useState('');
  const [validation, setValidation] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [sheet, setSheet] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [errorPreview, setErrorPreview] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const wide = width >= 760 && fontScale <= 1.25;
  const results = examples.filter((example) =>
    (filter === 'all' || filter === example.id) &&
    `${example.title} ${example.detail}`.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')));

  function resetSearch() {
    setQuery('');
    setFilter('all');
  }

  function reset() {
    resetSearch();
    setName('');
    setValidation(false);
    setErrorPreview(false);
    setConfirm(false);
    setFeedback('Demonstração restaurada.');
  }

  function validate() {
    setValidation(true);
    setFeedback(name.trim() ? 'Campo validado nesta demonstração.' : '');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <AppHeader title="Delicado Pro" subtitle="Prévia interna" onBack={onBack}
        action={<IconButton icon="rotate-ccw" label="Restaurar demonstração" onPress={() => setConfirm(true)} />} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={styles.content}>
          <View style={styles.intro}>
            <Text accessibilityRole="header" style={type.title}>Design System 2.0</Text>
            <Text style={type.detail}>Teste os componentes. As interações acontecem apenas nesta demonstração.</Text>
          </View>
          <View style={[styles.columns, wide && styles.wide]}>
            <View style={styles.column}>
              <Section title="Busca e listas">
                <SearchBar label="Buscar exemplos" value={query} onChangeText={setQuery} placeholder="Buscar exemplos" />
                <FilterChips label="Status" options={filters} selected={filter} onSelect={setFilter} />
                {results.length > 0 ? <View style={styles.list}>
                  {results.map((item) => <ListItem key={item.id} title={item.title} detail={item.detail} icon={item.icon}
                    trailing={<StatusBadge label={item.badge} tone={item.tone} />} onPress={() => setSheet(item.title)} />)}
                </View> : <EmptyState title="Nenhum resultado" description="Altere o filtro ou limpe a busca."
                  icon="search" action={{ label: 'Limpar filtros', onPress: resetSearch }} />}
              </Section>
              <Section title="Formulário">
                <FormField label="Nome da referência" value={name} placeholder="Ex. Montagem de entrada"
                  onChangeText={(value) => { setName(value); setFeedback(''); }}
                  error={validation && !name.trim() ? 'Informe um nome.' : undefined} />
                <PrimaryButton label="Validar campo" icon="check" onPress={validate} />
                {feedback !== '' && <Text aria-live="polite" style={[type.detail, styles.feedback]}>{feedback}</Text>}
              </Section>
            </View>
            <View style={styles.column}>
              <Section title="Ações e sobreposições">
                <SecondaryButton label="Abrir painel inferior" icon="layers" onPress={() => setSheet('Painel inferior')} />
                <SecondaryButton label="Testar confirmação" icon="rotate-ccw" onPress={() => setConfirm(true)} />
                <PrimaryButton label="Processando…" loading onPress={validate} />
                <SecondaryButton label="Ação indisponível" disabled onPress={validate} />
              </Section>
              <Section title="Estados">
                <View style={styles.badges}>
                  <StatusBadge label="Rascunho" />
                  <StatusBadge label="Concluído" tone="positive" />
                  <StatusBadge label="Em revisão" tone="warning" />
                  <StatusBadge label="Falha" tone="error" />
                </View>
                {errorPreview ? <EmptyState title="Falha de exemplo" description="Use a nova tentativa para voltar ao carregamento."
                  icon="alert-circle" error action={{ label: 'Tentar novamente', onPress: () => setErrorPreview(false) }} />
                  : <View style={styles.loading}>
                    <LoadingState label="Carregando exemplos…" />
                    <SecondaryButton label="Simular falha" onPress={() => setErrorPreview(true)} />
                  </View>}
              </Section>
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={styles.floating}>
        <FloatingActionButton icon="plus" label="Adicionar referência de teste" onPress={() => setSheet('Nova referência')} />
      </View>
      <BottomSheet visible={sheet !== ''} title={sheet} onClose={() => setSheet('')}>
        <Text style={type.body}>Este painel é um exemplo de interação. Nenhum registro será gravado.</Text>
        <PrimaryButton label="Concluir prévia" onPress={() => setSheet('')} />
      </BottomSheet>
      <ConfirmDialog visible={confirm} title="Restaurar demonstração?"
        description="Os filtros e o texto preenchido nesta tela serão limpos."
        confirmLabel="Restaurar" destructive onConfirm={reset} onClose={() => setConfirm(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  scroll: { padding: space.lg, paddingBottom: space.xl },
  content: { width: '100%', maxWidth: 960, alignSelf: 'center', gap: space.xl },
  intro: { gap: space.xs },
  columns: { gap: space.xl },
  wide: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { flex: 1, minWidth: 0, gap: space.xl },
  section: { gap: space.sm },
  list: { borderColor: palette.divider, borderWidth: 1, borderRadius: corners.surface, paddingHorizontal: space.xxs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  loading: { backgroundColor: palette.surface, borderRadius: corners.surface, gap: space.xs, padding: space.sm },
  feedback: { color: palette.accent },
  floating: { alignItems: 'flex-end', paddingHorizontal: space.md, paddingVertical: space.xs,
    borderTopWidth: 1, borderTopColor: palette.divider },
});

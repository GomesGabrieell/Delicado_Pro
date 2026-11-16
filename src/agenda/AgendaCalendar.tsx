import type { SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { WorkspaceList } from '../components/WorkspaceControls';
import { useQuoteFeed } from '../dashboard/useQuoteFeed';
import { BottomSheet, IconButton, ListItem, LoadingState, SecondaryButton, StatusBadge } from '../design-system';
import { palette, space, type } from '../design-system/tokens';
import { openQuote } from '../navigation/routes';
import { listCalendarEvents, statuses, type QuoteSummary } from '../quotes/repository';
import { MonthGrid } from './MonthGrid';
import { calendarWeeks, dateKey, fullDayLabel, monthLabel, shiftMonth, today } from './calendar';

export function AgendaCalendar({ client, company, month, setMonth }: {
  client: SupabaseClient; company: string; month: Date; setMonth: Dispatch<SetStateAction<Date>>;
}) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 840 || fontScale > 1.3;
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const currentDay = today();
  const weeks = calendarWeeks(month);
  const firstDay = dateKey(weeks[0][0]);
  const lastDay = dateKey(weeks[weeks.length - 1][6]);
  const load = useCallback((connection: SupabaseClient, companyId: string) =>
    listCalendarEvents(connection, companyId, firstDay, lastDay), [firstDay, lastDay]);
  const feed = useQuoteFeed(client, company, load);
  const eventsByDate = new Map<string, QuoteSummary[]>();

  for (const event of feed.rows) {
    if (!event.event_date) continue;
    const day = eventsByDate.get(event.event_date);
    if (day) day.push(event);
    else eventsByDate.set(event.event_date, [event]);
  }
  const selectedEvents = selectedDay ? eventsByDate.get(dateKey(selectedDay)) ?? [] : [];

  function showEvent(event: QuoteSummary) {
    setSelectedDay(null);
    openQuote(company, event.id);
  }

  const retry = feed.error ? (
    <View style={styles.error}>
      <Text accessibilityRole="alert" style={[type.detail, styles.errorText]}>{feed.error}</Text>
      <SecondaryButton label="Tentar novamente" onPress={feed.retry} />
    </View>
  ) : null;

  return (
    <View style={styles.calendar}>
      <View style={styles.toolbar}>
        <Text accessibilityRole="header" aria-live="polite" style={[type.section, styles.month]}>{monthLabel(month)}</Text>
        <View style={styles.actions}>
          <SecondaryButton label="Hoje" onPress={() => setMonth(shiftMonth(today(), 0))} />
          <IconButton icon="chevron-left" label="Mês anterior" onPress={() => setMonth((value) => shiftMonth(value, -1))} />
          <IconButton icon="chevron-right" label="Próximo mês" onPress={() => setMonth((value) => shiftMonth(value, 1))} />
        </View>
      </View>
      <MonthGrid weeks={weeks} month={month} todayKey={dateKey(currentDay)} compact={compact}
        eventsByDate={eventsByDate} onDayPress={setSelectedDay} onEventPress={showEvent} />
      {feed.loading && <LoadingState label="Carregando eventos…" />}
      {retry}
      {!feed.loading && !feed.error && feed.rows.length === 0 && (
        <Text aria-live="polite" style={type.detail}>Nenhum evento no período exibido.</Text>
      )}
      {selectedDay && (
        <BottomSheet visible title={fullDayLabel(selectedDay)} onClose={() => setSelectedDay(null)}>
          {feed.loading ? <LoadingState label="Carregando eventos…" /> : retry || (selectedEvents.length ? (
            <WorkspaceList>
              {selectedEvents.map((event) => (
                <ListItem key={event.id} title={event.title} detail={event.location || undefined}
                  trailing={<StatusBadge label={statuses[event.status]} tone={event.status === 'ready' ? 'positive' : 'neutral'} />}
                  onPress={() => showEvent(event)} />
              ))}
            </WorkspaceList>
          ) : <Text style={type.detail}>Nenhum evento neste dia.</Text>)}
        </BottomSheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: { flexGrow: 1, gap: space.sm },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.lg, rowGap: space.xs },
  month: { flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  error: { gap: space.xs, alignItems: 'flex-start' },
  errorText: { color: palette.danger },
});

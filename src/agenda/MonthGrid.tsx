import { Pressable, StyleSheet, Text, View } from 'react-native';

import { corners, interaction, palette, space, type } from '../design-system/tokens';
import { statuses, type QuoteSummary } from '../quotes/repository';
import { dateKey, fullDayLabel, shortDayLabel } from './calendar';

const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const previewLimit = 2;
const noEvents: QuoteSummary[] = [];

type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

type MonthGridProps = {
  weeks: Date[][];
  month: Date;
  todayKey: string;
  eventsByDate: Map<string, QuoteSummary[]>;
  compact: boolean;
  onDayPress: (date: Date) => void;
  onEventPress: (event: QuoteSummary) => void;
};

function eventCount(count: number) {
  return count === 1 ? '1 evento' : `${count} eventos`;
}

export function MonthGrid({ weeks, month, todayKey, eventsByDate, compact, onDayPress, onEventPress }: MonthGridProps) {
  return (
    <View style={[styles.grid, !compact && styles.expandedGrid]}>
      <View style={styles.week}>
        {weekdays.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
      </View>
      {weeks.map((week) => (
        <View key={dateKey(week[0])} style={[styles.week, !compact && styles.expandedWeek]}>
          {week.map((date, index) => {
            const key = dateKey(date);
            const events = eventsByDate.get(key) ?? noEvents;
            const isToday = key === todayKey;
            const outsideMonth = date.getUTCMonth() !== month.getUTCMonth();
            const remaining = events.length - previewLimit;
            const openDay = () => onDayPress(date);
            return (
              <View key={key} style={[styles.cell, compact && styles.compactCell,
                index > 0 && styles.columnDivider, outsideMonth && styles.outsideMonth]}>
                <Pressable accessibilityRole="button"
                  accessibilityLabel={[fullDayLabel(date), isToday && 'Hoje', eventCount(events.length)].filter(Boolean).join(', ')}
                  onPress={openDay} style={({ pressed, hovered, focused }: PressState) => [
                    styles.dayButton, !compact && StyleSheet.absoluteFill, (pressed || hovered) && styles.hoveredDay,
                    focused && styles.focus,
                  ]}>
                  <View style={[styles.dayNumber, isToday && styles.today]}>
                    <Text style={[styles.dayText, outsideMonth && styles.muted, isToday && styles.onToday]}>
                      {shortDayLabel(date, compact)}
                    </Text>
                  </View>
                  {compact && events.length > 0 && (
                    <View style={styles.indicator}>
                      <View style={styles.dot} />
                      {events.length > 1 && <Text style={styles.count} numberOfLines={1}>{events.length}</Text>}
                    </View>
                  )}
                </Pressable>
                {!compact && (
                  <View pointerEvents="box-none" style={styles.previews}>
                    {events.slice(0, previewLimit).map((event) => {
                      const ready = event.status === 'ready';
                      return (
                        <Pressable key={event.id} accessibilityRole="button"
                          accessibilityLabel={`${event.title}, ${statuses[event.status]}, ${fullDayLabel(date)}`}
                          onPress={() => onEventPress(event)}
                          style={({ pressed, hovered, focused }: PressState) => [styles.event, ready && styles.ready,
                            (pressed || hovered) && (ready ? styles.readyPressed : styles.draftPressed), focused && styles.focus]}>
                          <Text style={[styles.eventText, ready && styles.onReady]} numberOfLines={1}>{event.title}</Text>
                        </Pressable>
                      );
                    })}
                    {remaining > 0 && (
                      <Pressable accessibilityRole="button" accessibilityLabel={`Ver mais ${eventCount(remaining)}, ${fullDayLabel(date)}`}
                        onPress={openDay} style={({ pressed, hovered, focused }: PressState) => [
                          styles.event, styles.more, (pressed || hovered) && styles.hoveredDay, focused && styles.focus,
                        ]}>
                        <Text style={styles.eventText} numberOfLines={1}>+{remaining} {remaining === 1 ? 'evento' : 'eventos'}</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    backgroundColor: palette.background, borderWidth: 1, borderColor: palette.divider,
    borderRadius: corners.surface, overflow: 'hidden',
  },
  expandedGrid: { flexGrow: 1 },
  week: { flexDirection: 'row' },
  expandedWeek: { flexGrow: 1 },
  weekday: {
    ...type.detail, flex: 1, minWidth: 0, textAlign: 'center', paddingVertical: space.sm,
    fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
  },
  cell: { flex: 1, minWidth: 0, minHeight: 114, borderTopWidth: 1, borderColor: palette.divider },
  compactCell: { minHeight: 56 },
  columnDivider: { borderLeftWidth: 1 },
  outsideMonth: { backgroundColor: palette.canvas },
  dayButton: { flexGrow: 1, alignItems: 'center', paddingVertical: space.xxs },
  hoveredDay: { backgroundColor: palette.accentSurface },
  focus: { outlineColor: palette.hero, outlineStyle: 'solid', outlineWidth: 2, outlineOffset: -2 },
  dayNumber: {
    minWidth: 26, minHeight: 26, paddingHorizontal: space.xxs,
    alignItems: 'center', justifyContent: 'center', borderRadius: corners.pill,
  },
  dayText: { ...type.label, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  muted: { color: palette.muted },
  today: { backgroundColor: palette.accent },
  onToday: { color: palette.onAccent },
  indicator: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  dot: { width: 6, height: 6, borderRadius: corners.pill, backgroundColor: palette.accent },
  count: { ...type.detail, color: palette.accent, fontSize: 11, lineHeight: 16, flexShrink: 1 },
  previews: { marginTop: 34, paddingHorizontal: space.xxs, paddingBottom: space.xxs, gap: space.xxs },
  event: { borderRadius: space.xs, paddingHorizontal: space.xs, paddingVertical: 2, backgroundColor: palette.accentSurface },
  more: { backgroundColor: 'transparent' },
  ready: { backgroundColor: palette.accent },
  readyPressed: { backgroundColor: interaction.accentPressed },
  draftPressed: { backgroundColor: interaction.pressed },
  eventText: { ...type.label, color: palette.accent, fontSize: 12, lineHeight: 18 },
  onReady: { color: palette.onAccent },
});

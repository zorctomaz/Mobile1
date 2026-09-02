import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DailyForecast } from '../types';
import { rateDay } from '../services/flyability';
import { FlyabilityDot } from './FlyabilityBadge';

const WEEKDAYS = ['ned', 'pon', 'tor', 'sre', 'čet', 'pet', 'sob'];

interface Props {
  days: DailyForecast[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function DaySelector({ days, selectedIndex, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {days.map((day, index) => {
        const date = new Date(day.date + 'T12:00:00');
        const isSelected = index === selectedIndex;
        const { rating } = rateDay(day.hours);
        return (
          <TouchableOpacity
            key={day.date}
            style={[styles.pill, isSelected && styles.pillSelected]}
            onPress={() => onSelect(index)}
          >
            <Text style={[styles.weekday, isSelected && styles.textSelected]}>
              {index === 0 ? 'danes' : WEEKDAYS[date.getDay()]}
            </Text>
            <Text style={[styles.date, isSelected && styles.textSelected]}>
              {date.getDate()}.{date.getMonth() + 1}.
            </Text>
            <FlyabilityDot rating={rating} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    marginBottom: 8,
  },
  pill: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#eef1f4',
    gap: 4,
  },
  pillSelected: {
    backgroundColor: '#1b3a57',
  },
  weekday: {
    fontSize: 12,
    color: '#556',
    textTransform: 'capitalize',
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: '#223',
  },
  textSelected: {
    color: '#fff',
  },
});

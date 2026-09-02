import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlyRating } from '../types';
import { RATING_COLOR, RATING_LABEL } from '../services/flyability';

interface Props {
  rating: FlyRating;
  size?: 'small' | 'large';
}

export default function FlyabilityBadge({ rating, size = 'large' }: Props) {
  const color = RATING_COLOR[rating];
  const isLarge = size === 'large';
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color },
        isLarge ? styles.large : styles.small,
      ]}
    >
      <Text style={[styles.text, isLarge ? styles.textLarge : styles.textSmall]}>
        {RATING_LABEL[rating]}
      </Text>
    </View>
  );
}

export function FlyabilityDot({ rating }: { rating: FlyRating }) {
  return <View style={[styles.dot, { backgroundColor: RATING_COLOR[rating] }]} />;
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  small: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  text: {
    color: '#fff',
    fontWeight: '700',
  },
  textLarge: {
    fontSize: 18,
  },
  textSmall: {
    fontSize: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

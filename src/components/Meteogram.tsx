import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { HourlyPoint } from '../types';
import { PRESSURE_LEVELS } from '../services/openMeteo';
import { rateHour, RATING_COLOR } from '../services/flyability';

const COL_WIDTH = 46;
const ROW_HEIGHT = 42;
const LABEL_WIDTH = 66;
const HEADER_HEIGHT = 32;
const BAR_ROW_HEIGHT = 34;

function windColor(speed: number): string {
  if (speed >= 35) return '#c62828';
  if (speed >= 25) return '#ef6c00';
  if (speed >= 15) return '#f9a825';
  return '#2e7d32';
}

const LEVEL_ROWS = [...PRESSURE_LEVELS].reverse();

interface Props {
  hours: HourlyPoint[];
}

/**
 * Meteogram za en dan: puščice smeri/hitrosti vetra po višinah (tlačni
 * nivoji od visoko proti tlom), spodaj še oblačnost in verjetnost padavin
 * po urah. Vodoravno se da drseti čez cel dan.
 */
export default function Meteogram({ hours }: Props) {
  const daylight = hours.filter((h) => {
    const hour = new Date(h.time).getHours();
    return hour >= 6 && hour <= 20;
  });
  const points = daylight.length > 0 ? daylight : hours;

  if (points.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Ni podatkov za ta dan.</Text>
      </View>
    );
  }

  const gridWidth = points.length * COL_WIDTH;
  const groundRowIndex = LEVEL_ROWS.length;
  const cloudBarTop = HEADER_HEIGHT + (LEVEL_ROWS.length + 1) * ROW_HEIGHT;
  const precipBarTop = cloudBarTop + BAR_ROW_HEIGHT;
  const totalHeight = precipBarTop + BAR_ROW_HEIGHT;

  const levelAltLabel = (pressureHpa: number): string => {
    const vals = points
      .map((p) => p.levels.find((l) => l.pressureHpa === pressureHpa)?.altitude)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (vals.length === 0) return `${pressureHpa} hPa`;
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length / 50) * 50;
    return `≈${avg} m`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={{ width: LABEL_WIDTH }}>
          <View style={{ height: HEADER_HEIGHT }} />
          {LEVEL_ROWS.map((lvl) => (
            <View key={lvl} style={[styles.labelCell, { height: ROW_HEIGHT }]}>
              <Text style={styles.labelText}>{levelAltLabel(lvl)}</Text>
            </View>
          ))}
          <View style={[styles.labelCell, { height: ROW_HEIGHT }]}>
            <Text style={styles.labelText}>tla</Text>
          </View>
          <View style={[styles.labelCell, { height: BAR_ROW_HEIGHT }]}>
            <Text style={styles.labelText}>oblaki %</Text>
          </View>
          <View style={[styles.labelCell, { height: BAR_ROW_HEIGHT }]}>
            <Text style={styles.labelText}>dež %</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <Svg width={gridWidth} height={totalHeight}>
            {points.flatMap((point, colIndex) => {
              const cx = colIndex * COL_WIDTH + COL_WIDTH / 2;
              const hourLabel = new Date(point.time).getHours().toString();
              const { rating } = rateHour(point);
              const nodes: React.ReactNode[] = [];

              nodes.push(
                <SvgText key={`h-${colIndex}`} x={cx} y={14} fontSize={11} fill="#334" textAnchor="middle">
                  {hourLabel}
                </SvgText>
              );
              nodes.push(
                <Rect key={`hd-${colIndex}`} x={cx - 4} y={20} width={8} height={8} rx={4} fill={RATING_COLOR[rating]} />
              );

              LEVEL_ROWS.forEach((pressureHpa, rowIndex) => {
                const level = point.levels.find((l) => l.pressureHpa === pressureHpa);
                if (!level) return;
                const cy = HEADER_HEIGHT + rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2 - 4;
                const color = windColor(level.windSpeed);
                const angle = level.windDir + 180;
                nodes.push(
                  <G key={`lvl-${colIndex}-${rowIndex}`} origin={`${cx}, ${cy}`} rotation={angle}>
                    <Line x1={cx} y1={cy + 9} x2={cx} y2={cy - 9} stroke={color} strokeWidth={2.5} />
                    <Polygon points={`${cx - 4},${cy - 6} ${cx + 4},${cy - 6} ${cx},${cy - 12}`} fill={color} />
                  </G>
                );
                nodes.push(
                  <SvgText
                    key={`lvlt-${colIndex}-${rowIndex}`}
                    x={cx}
                    y={HEADER_HEIGHT + rowIndex * ROW_HEIGHT + ROW_HEIGHT - 4}
                    fontSize={9}
                    fill="#445"
                    textAnchor="middle"
                  >
                    {Math.round(level.windSpeed)}
                  </SvgText>
                );
              });

              const groundCy = HEADER_HEIGHT + groundRowIndex * ROW_HEIGHT + ROW_HEIGHT / 2 - 4;
              const groundColor = windColor(point.windSpeed10m);
              const groundAngle = point.windDir10m + 180;
              nodes.push(
                <G key={`g-${colIndex}`} origin={`${cx}, ${groundCy}`} rotation={groundAngle}>
                  <Line x1={cx} y1={groundCy + 9} x2={cx} y2={groundCy - 9} stroke={groundColor} strokeWidth={2.5} />
                  <Polygon
                    points={`${cx - 4},${groundCy - 6} ${cx + 4},${groundCy - 6} ${cx},${groundCy - 12}`}
                    fill={groundColor}
                  />
                </G>
              );
              nodes.push(
                <SvgText
                  key={`gt-${colIndex}`}
                  x={cx}
                  y={HEADER_HEIGHT + groundRowIndex * ROW_HEIGHT + ROW_HEIGHT - 4}
                  fontSize={9}
                  fill="#445"
                  textAnchor="middle"
                >
                  {Math.round(point.windSpeed10m)}/{Math.round(point.windGust10m)}
                </SvgText>
              );

              const cloudBarH = Math.max(2, (point.cloudCover / 100) * (BAR_ROW_HEIGHT - 10));
              nodes.push(
                <Rect
                  key={`c-${colIndex}`}
                  x={cx - 10}
                  y={cloudBarTop + (BAR_ROW_HEIGHT - 6 - cloudBarH)}
                  width={20}
                  height={cloudBarH}
                  fill="#90a4ae"
                  rx={2}
                />
              );

              const precipBarH = Math.max(2, (point.precipitationProbability / 100) * (BAR_ROW_HEIGHT - 10));
              nodes.push(
                <Rect
                  key={`p-${colIndex}`}
                  x={cx - 10}
                  y={precipBarTop + (BAR_ROW_HEIGHT - 6 - precipBarH)}
                  width={20}
                  height={precipBarH}
                  fill="#1e88e5"
                  rx={2}
                />
              );

              return nodes;
            })}
          </Svg>
        </ScrollView>
      </View>
      <Text style={styles.hint}>
        Puščice kažejo smer, kamor piha veter (ne od koder). Številke = hitrost v km/h (pri tleh: veter/sunki).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
  },
  labelCell: {
    justifyContent: 'center',
    paddingRight: 6,
  },
  labelText: {
    fontSize: 10,
    color: '#667',
    textAlign: 'right',
  },
  hint: {
    marginTop: 8,
    fontSize: 11,
    color: '#889',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#889',
  },
});

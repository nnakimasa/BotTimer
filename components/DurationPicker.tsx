import React, { useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5; // 中央＋上下2つずつ
const VERTICAL_PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

interface ColumnProps {
  values: number[];
  selected: number;
  onChange: (v: number) => void;
  unitLabel: string;
  accessibilityLabel?: string;
}

function WheelColumn({ values, selected, onChange, unitLabel, accessibilityLabel }: ColumnProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const lastValueRef = useRef(selected);

  // 外部から value が変わったらスクロール位置を同期
  useEffect(() => {
    if (lastValueRef.current === selected) return;
    lastValueRef.current = selected;
    const index = values.indexOf(selected);
    if (index >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
    }
  }, [selected, values]);

  // 初期スクロール位置をセット
  useEffect(() => {
    const index = values.indexOf(selected);
    if (index >= 0 && scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
      });
    }
    // 初回のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM_HEIGHT)));
    const v = values[index];
    if (v !== lastValueRef.current) {
      lastValueRef.current = v;
      onChange(v);
    }
  };

  return (
    <View style={styles.columnWrap}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumScrollEnd}
        contentContainerStyle={{ paddingVertical: VERTICAL_PADDING }}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="adjustable"
        accessibilityValue={{ text: `${selected}${unitLabel}` }}
      >
        {values.map(v => (
          <View key={v} style={styles.item}>
            <Text style={[styles.itemText, v === selected && styles.itemTextSelected]}>
              {v.toString().padStart(2, '0')}
            </Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.unitLabelOverlay} pointerEvents="none">
        <Text style={styles.unitLabel}>{unitLabel}</Text>
      </View>
    </View>
  );
}

interface Props {
  totalSeconds: number;
  onChange: (totalSeconds: number) => void;
  showHours?: boolean;
}

export default function DurationPicker({ totalSeconds, onChange, showHours = true }: Props) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const setH = (newH: number) => onChange(newH * 3600 + m * 60 + s);
  const setM = (newM: number) => onChange(h * 3600 + newM * 60 + s);
  const setS = (newS: number) => onChange(h * 3600 + m * 60 + newS);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const seconds = Array.from({ length: 60 }, (_, i) => i);

  return (
    <View style={styles.container}>
      {/* 中央の選択行ハイライト */}
      <View style={styles.selectionIndicator} pointerEvents="none" />

      <View style={styles.columns}>
        {showHours && (
          <WheelColumn
            values={hours}
            selected={h}
            onChange={setH}
            unitLabel="時"
            accessibilityLabel="時間"
          />
        )}
        <WheelColumn
          values={minutes}
          selected={m}
          onChange={setM}
          unitLabel="分"
          accessibilityLabel="分"
        />
        <WheelColumn
          values={seconds}
          selected={s}
          onChange={setS}
          unitLabel="秒"
          accessibilityLabel="秒"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    position: 'relative',
  },
  columns: {
    flexDirection: 'row',
    flex: 1,
  },
  columnWrap: {
    flex: 1,
    position: 'relative',
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 24,
    color: '#777',
    fontVariant: ['tabular-nums'],
  },
  itemTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  unitLabelOverlay: {
    position: 'absolute',
    top: VERTICAL_PADDING,
    bottom: VERTICAL_PADDING,
    right: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitLabel: {
    color: '#888',
    fontSize: 12,
  },
  selectionIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: VERTICAL_PADDING,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
    backgroundColor: 'rgba(38, 168, 96, 0.08)',
  },
});

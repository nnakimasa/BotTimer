import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DurationPicker from './DurationPicker';

// HH:MM:SS 形式で時刻表示
export function formatHMS(totalSeconds: number, showHours = true): string {
  const safeSec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  const s = safeSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return showHours ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// 「1時間5分30秒」のような自然な日本語表記。0 の項は省略
export function formatHMSJapanese(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  const s = safeSec % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}時間`);
  if (m > 0) parts.push(`${m}分`);
  if (s > 0 || parts.length === 0) parts.push(`${s}秒`);
  return parts.join('');
}

interface Props {
  label: string;
  value: number; // total seconds
  onChange: (totalSeconds: number) => void;
  minSeconds?: number;
  maxSeconds?: number;
  hint?: string;
  showHours?: boolean;
  reduceMotion?: boolean;
}

export default function DurationField({
  label,
  value,
  onChange,
  minSeconds = 0,
  maxSeconds = 23 * 3600 + 59 * 60 + 59,
  hint,
  showHours = true,
  reduceMotion = false,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(value);

  const open = () => {
    setDraft(value);
    setVisible(true);
  };
  const close = () => setVisible(false);
  const save = () => {
    const clamped = Math.max(minSeconds, Math.min(maxSeconds, draft));
    onChange(clamped);
    setVisible(false);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.valueBox}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatHMSJapanese(value)}`}
        accessibilityHint="タップして時間を選択"
      >
        <Text style={styles.valueText}>{formatHMS(value, showHours)}</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
      {hint && <Text style={styles.hint}>{hint}</Text>}

      <Modal
        visible={visible}
        transparent
        animationType={reduceMotion ? 'fade' : 'slide'}
        onRequestClose={close}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={close} accessibilityLabel="閉じる" accessibilityRole="button">
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerWrap}>
              <DurationPicker
                totalSeconds={draft}
                onChange={setDraft}
                showHours={showHours}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel="キャンセル"
              >
                <Text style={styles.cancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={save}
                accessibilityRole="button"
                accessibilityLabel="この時間で確定"
              >
                <Text style={styles.saveText}>決定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 20 },
  label: { color: '#999', fontSize: 13, marginBottom: 8 },
  hint: { color: '#666', fontSize: 11, marginTop: 4 },
  valueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  valueText: {
    color: '#fff',
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  chevron: { color: '#666', fontSize: 20 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  modalClose: { color: '#aaa', fontSize: 20 },
  pickerWrap: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: { backgroundColor: '#333' },
  cancelText: { color: '#ddd', fontSize: 15, fontWeight: '600' },
  saveBtn: { backgroundColor: '#27ae60' },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

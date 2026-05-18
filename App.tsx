import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TimerScreen from './screens/TimerScreen';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsVersion, setSettingsVersion] = useState(0);

  const handleBackFromSettings = () => {
    setShowSettings(false);
    setSettingsVersion(v => v + 1);
  };

  return (
    <SafeAreaProvider>
      {/* TimerScreen は常時マウント。設定画面はその上にオーバーレイ表示する */}
      <TimerScreen
        onOpenSettings={() => setShowSettings(true)}
        settingsVersion={settingsVersion}
      />
      {showSettings && (
        <View style={StyleSheet.absoluteFill}>
          <SettingsScreen onBack={handleBackFromSettings} />
        </View>
      )}
    </SafeAreaProvider>
  );
}

# App Store / Play Store 用スクリーンショット

`scripts/generate-screenshots.js` で自動生成された画像。各ファイル名：`<device>-<scene-no>-<scene-name>.png`

## サイズ一覧

| プレフィックス | 端末区分 | サイズ | 用途 |
|---|---|---|---|
| `iphone-67-*` | iPhone 6.7" Pro Max | 1290×2796 | App Store（最新 iPhone Pro Max 必須） |
| `iphone-65-*` | iPhone 6.5" Pro Max | 1242×2688 | App Store（旧サイズ・推奨） |
| `ipad-13-*` | iPad Pro 13" | 2064×2752 | App Store（iPad 対応のため必須） |

## シーン

| 番号 | ファイル名 | 内容 |
|---|---|---|
| 01 | `*-01-main.png` | メイン画面（00:30:00、DEMO バッジ表示、スタート前） |
| 02 | `*-02-settings.png` | 設定画面（SwitchBot API・動作設定・タイマー設定） |
| 03 | `*-03-picker.png` | HH:MM:SS スクロールピッカーが開いた状態 |
| 04 | `*-04-running.png` | タイマー稼働中（00:25:00、ON 中、停止ボタン表示） |
| 05 | `*-05-lockmode.png` | ロックモード稼働中（00:45:00、ボタン非表示、大きなタイマー） |

## 再生成

UI 変更後はスクショを更新してください。

```powershell
# Expo Web Dev Server を別ターミナルで起動
npx expo start --web --port 8082

# 別ターミナルでスクリプト実行
node scripts/generate-screenshots.js
```

10 〜 20 秒程度で全 15 枚（3 デバイス × 5 シーン）が再生成されます。

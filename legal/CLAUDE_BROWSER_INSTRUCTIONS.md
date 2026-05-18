# Chrome for Claude 用 指示文

GitHub Pages の有効化〜公開 URL の取得、および App Store Connect への登録を、Chrome for Claude（Claude のブラウザ拡張）に依頼する際の指示文テンプレート。

---

## 指示文 1: GitHub Pages を有効化して公開 URL を取得

> 以下のタスクをブラウザで実行してください。
>
> **タスク:** GitHub 上のリポジトリ `nnakimasa/bottimer-privacy` で GitHub Pages を有効化し、公開 URL が動作することを確認する。
>
> **手順:**
> 1. `https://github.com/nnakimasa/bottimer-privacy/settings/pages` を開く。GitHub にログイン済みでない場合はログインする。
> 2. 「Build and deployment」セクションの「Source」が `Deploy from a branch` になっていることを確認（なっていなければ選択）
> 3. 「Branch」のドロップダウンを開いて `main` を選択
> 4. 隣のフォルダドロップダウンで `/ (root)` を選択
> 5. 「Save」ボタンをクリック
> 6. ページ上部に「Your site is live at https://nnakimasa.github.io/bottimer-privacy/」のような緑のバナーが表示されるまで、最大 3 分待つ（30 秒ごとにページをリロードして確認）
> 7. 表示された URL `https://nnakimasa.github.io/bottimer-privacy/` を新しいタブで開く
> 8. ページが「プライバシーポリシー」というタイトルで正しく表示されることを確認する
>
> **完了報告:** 公開された URL と、ページが正しく表示されたかを報告してください。404 など問題があった場合はその内容を教えてください。

---

## 指示文 2: App Store Connect にプライバシーポリシー URL を登録

> 以下のタスクをブラウザで実行してください。
>
> **前提:**
> - App Store Connect で BotTimer のアプリレコードが既に作成済みであること
> - Apple ID でログインできること（必要なら 2FA 対応）
>
> **タスク:** App Store Connect の BotTimer の「App プライバシー」設定に、プライバシーポリシー URL を登録する。
>
> **手順:**
> 1. `https://appstoreconnect.apple.com` を開く
> 2. Apple ID でログイン（2FA が出たら待機・ユーザーに通知）
> 3. 「マイ App」をクリック
> 4. 一覧から「BotTimer」を選択
> 5. 左サイドメニューから「App プライバシー」（App Privacy）をクリック
> 6. 「プライバシーポリシー」セクションの「編集」をクリック
> 7. プライバシーポリシー URL 欄に以下を入力:
>    ```
>    https://nnakimasa.github.io/bottimer-privacy/
>    ```
> 8. 「保存」をクリック
> 9. 設定が反映されたことを確認
>
> **完了報告:** 設定が完了したか、エラーがあれば内容を報告してください。
>
> **注意:** Apple ID のパスワードや 2FA コードを推測・代入しないでください。認証画面が出たら作業を一時停止し、ユーザーに操作を依頼してください。

---

## 補足

- 指示文 2 はアプリレコードが App Store Connect に登録済みの場合のみ実行可能。未登録の場合は「Apple Developer Program 加入 → App ID 発行 → App Store Connect でアプリ作成」が事前に必要。
- 指示文 1 が完了すれば、Google Play Console や任意の場所への URL 登録にも同じ URL を使い回せる。

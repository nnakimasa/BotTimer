# GitHub Pages 公開セットアップ手順

このドキュメントは、`legal/` フォルダの中身を **専用の公開リポジトリ** に置いて GitHub Pages で公開するまでの手順をまとめたものです。

**目的:** App Store Connect / Google Play Console に登録するプライバシーポリシー URL を取得すること。BotTimer 本体のコードは非公開のまま、ポリシーだけを公開できます。

---

## 前提

- GitHub アカウントを持っている
- Web ブラウザでの操作が可能

> **補足:** 以下では Web 操作だけで完結する手順を案内します。Git コマンドが使える方はもちろん `git push` でも構いません。

---

## 手順 1: 公開リポジトリを新規作成

1. ブラウザで https://github.com/new を開く
2. 以下を入力
   - **Repository name:** `bottimer-privacy`
   - **Description（任意）:** `Privacy policy for BotTimer iOS/Android app`
   - **Public** を選択（必須。Free プランで Pages を使うには Public が必要）
   - 「Add a README file」はチェック**しない**（後で追加する）
3. 「Create repository」ボタンをクリック

---

## 手順 2: ファイルをアップロード

1. 作成直後のリポジトリ画面で「**uploading an existing file**」リンクをクリック
2. ローカルの `legal/` フォルダから以下の **3ファイル** を選択してドラッグ＆ドロップ
   - `index.html`
   - `privacy.md`
   - `README.md`
3. 画面下部に「Commit changes」セクションが出るのでそのまま「Commit changes」ボタンをクリック

> `legal/SETUP.md`（このファイル）は公開リポジトリにアップロードする必要はありません。BotTimer のローカルプロジェクト内に作業メモとして残しておくだけで構いません。

---

## 手順 3: README 内の URL を自分のユーザー名に置換

1. アップロード済みの `README.md` を開く
2. 右上の鉛筆アイコンをクリックして編集モードへ
3. `<your-github-username>` の部分を、ご自身の GitHub ユーザー名（例: `akimasa-nakajima` など）に書き換える
4. 「Commit changes」をクリック

---

## 手順 4: GitHub Pages を有効化

1. リポジトリ画面の上部メニューから「**Settings**」をクリック
2. 左サイドバーから「**Pages**」をクリック
3. 「Build and deployment」セクションで
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` / `/(root)` を選択
4. 「Save」をクリック
5. 数十秒〜数分待つと、ページ上部に以下のような緑色のメッセージが表示される
   ```
   Your site is live at https://<your-username>.github.io/bottimer-privacy/
   ```
6. その URL をクリックして、プライバシーポリシーが表示されることを確認

---

## 手順 5: App Store Connect / Google Play Console に URL 登録

### App Store Connect の場合
1. https://appstoreconnect.apple.com にログイン
2. 「マイ App」→「BotTimer」を選択
3. 左メニュー「App プライバシー」→「プライバシーポリシー URL」に上記 URL を入力
4. 保存

### Google Play Console の場合
1. https://play.google.com/console にログイン
2. 「BotTimer」を選択
3. 「ポリシー」→「アプリのコンテンツ」→「プライバシー ポリシー」に URL を入力
4. 保存

---

## 内容を変更したいとき

1. 編集したいファイル（`index.html` / `privacy.md`）を GitHub 上で開く
2. 鉛筆アイコンで編集 → Commit
3. **`privacy.md` を更新したら、必ず `index.html` の本文も同じ内容に更新してください**（表示はHTML側を使うため）
4. 大幅な変更時は本文の「最終更新日」を更新

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| Pages の URL を開いても 404 | 公開反映までに 1〜2 分かかる。リロードして待つ。それでもダメなら Settings → Pages で Branch 設定を確認 |
| 日本語が文字化け | `index.html` の `<meta charset="UTF-8">` が消えていないか確認 |
| スタイルが反映されない | `<style>` タグ内の内容が残っているか確認 |

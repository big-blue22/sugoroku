<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🎲 冒険すごろく ONLINE

複数デバイスで対戦できるオンラインすごろくゲームです。Firebaseを使用してリアルタイム対戦を実現しています。

## 🌟 機能

- **オンラインマルチプレイヤー**: 複数のデバイスから同時にプレイ可能
- **ルーム機能**: ルームコードを共有して友達と対戦
- **リアルタイム同期**: すべてのプレイヤーの動きがリアルタイムで反映
- **3D グラフィックス**: React Three Fiber による美しい3Dボード
- **ランダムイベント**: AIが生成する多様なゲームイベント

## 🚀 ローカルで実行

**前提条件:** Node.js 20以上

1. 依存関係をインストール:
   ```bash
   npm install
   ```

2. Firebase プロジェクトを作成:
   - [Firebase Console](https://console.firebase.google.com/)にアクセス
   - 新しいプロジェクトを作成
   - Firestore Database と Realtime Database を有効化
   - Webアプリを追加して設定情報を取得

3. 環境変数を設定:
   ```bash
   cp .env.local.example .env.local
   ```
   
   `.env.local` ファイルを編集して、Firebase設定情報を入力:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
   ```

4. 開発サーバーを起動:
   ```bash
   npm run dev
   ```

## 📦 デプロイ (GitHub Pages)

### 重要: デプロイ前の準備

GitHub Pages にデプロイする場合、以下の手順でRepository Secretsを設定する必要があります:

1. **GitHub Repository Settings に移動**:
   - リポジトリページで `Settings` タブをクリック
   - 左サイドバーで `Secrets and variables` → `Actions` を選択

2. **Repository Secrets を追加** (`New repository secret` ボタンをクリック):
   
   Firebase Console の設定値を使用して、以下のSecretを追加してください:

   | Secret Name | 値の取得方法 |
   |-------------|-------------|
   | `VITE_FIREBASE_API_KEY` | Firebase Console > Project Settings > General > Your apps > Config |
   | `VITE_FIREBASE_AUTH_DOMAIN` | 同上 (例: `your-project.firebaseapp.com`) |
   | `VITE_FIREBASE_PROJECT_ID` | 同上 (例: `your-project-id`) |
   | `VITE_FIREBASE_STORAGE_BUCKET` | 同上 (例: `your-project.appspot.com`) |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | 同上 (数字のみ) |
   | `VITE_FIREBASE_APP_ID` | 同上 (例: `1:123456789:web:abcdef`) |
   | `VITE_FIREBASE_DATABASE_URL` | Firebase Console > Realtime Database > データベースURL |

3. **GitHub Pages を有効化**:
   - リポジトリの `Settings` → `Pages` に移動
   - Source を `GitHub Actions` に設定

4. **デプロイ**:
   - `main` ブランチにプッシュすると自動的にデプロイされます
   - または、`Actions` タブから手動で "Deploy to GitHub Pages" ワークフローを実行

### Firebase セキュリティルール

デプロイ後、Firebase Console でセキュリティルールを設定してください:

**Firestore Rules** (`rules` タブ):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read, write: if true;  // 開発用 - 本番環境では適切な認証を追加
    }
  }
}
```

**Realtime Database Rules** (`rules` タブ):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## 🎮 遊び方

1. **ルームを作成**: トップ画面で名前とアバターを選択し、「ルームを作成」をクリック
2. **友達を招待**: 表示されたルームコードを友達に共有
3. **ルームに参加**: 友達はルームコードを入力して参加
4. **ゲーム開始**: ホストが「ゲームスタート」ボタンをクリック
5. **サイコロを振る**: 自分のターンになったらサイコロを振ってコマを進める
6. **イベント**: 特定のマスに止まるとランダムイベントが発生
7. **ゴール**: 最初にゴールに到達したプレイヤーの勝利！

## 🛠️ 技術スタック

- **React** + **TypeScript**: UIフレームワーク
- **Vite**: ビルドツール
- **Firebase**: バックエンド (Firestore + Realtime Database)
- **React Three Fiber**: 3Dグラフィックス
- **Tailwind CSS**: スタイリング
- **GitHub Actions**: CI/CD

## 📝 ライセンス

MIT License

---

AI Studio で作成: https://ai.studio/apps/drive/1hI_50OQuwv9mTGRp7WNcxFcdx2yR6ubW

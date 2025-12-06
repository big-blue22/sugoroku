# 🔥 Firebase セットアップガイド

このエラーを解決するために、Firebaseのセキュリティルールを設定する必要があります。

## エラーの原因

```
FirebaseError: Missing or insufficient permissions.
```

このエラーは、Firestore/Realtime Databaseのセキュリティルールがデフォルト設定（すべて拒否）のままになっているために発生しています。

## 🛠️ 解決方法

### 1. Firestore セキュリティルールの設定

1. **Firebase Consoleにアクセス**
   - https://console.firebase.google.com/
   - あなたのプロジェクトを選択

2. **Firestore Database に移動**
   - 左サイドバーから「Firestore Database」をクリック
   - 「ルール」タブをクリック

3. **以下のルールを設定**

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // ルームコレクションへのアクセス許可
    match /rooms/{roomId} {
      // 誰でも読み書き可能（開発・テスト用）
      allow read, write: if true;
    }
    
    // その他のコレクションはデフォルトで拒否
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4. **「公開」ボタンをクリック**

### 2. Realtime Database セキュリティルールの設定

1. **Realtime Database に移動**
   - 左サイドバーから「Realtime Database」をクリック
   - 「ルール」タブをクリック

2. **以下のルールを設定**

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

3. **「公開」ボタンをクリック**

### 3. Firebase CLIを使った設定（オプション）

Firebase CLIがインストールされている場合:

```bash
# Firebase CLIのインストール（未インストールの場合）
npm install -g firebase-tools

# ログイン
firebase login

# プロジェクトの初期化
firebase init

# ルールのデプロイ
firebase deploy --only firestore:rules,database
```

## ⚠️ セキュリティに関する注意

上記のルールは**開発・テスト用**です。本番環境では以下のような対策を検討してください:

### より安全なFirestoreルール例

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      // 読み取りは誰でも可能
      allow read: if true;
      
      // 作成は誰でも可能
      allow create: if true;
      
      // 更新は以下の条件を満たす場合のみ
      allow update: if 
        // ルームIDとホストIDは変更不可
        !request.resource.data.diff(resource.data).affectedKeys()
          .hasAny(['id', 'hostId', 'createdAt']);
      
      // 削除は1時間以上経過したルームのみ
      allow delete: if 
        request.time > resource.data.createdAt + duration.value(1, 'h');
    }
  }
}
```

### 追加のセキュリティ対策

1. **Authentication の導入**
   - Firebase Authentication を使用してユーザー認証を追加
   - `allow write: if request.auth != null;`

2. **レート制限**
   - Cloud Functions でレート制限を実装

3. **データ検証**
   - 書き込みデータの形式やサイズを検証

4. **定期的なクリーンアップ**
   - 古いルームデータを自動削除するCloud Functionを実装

## ✅ 確認方法

ルールを設定後、アプリをリロードしてエラーが解消されることを確認してください:

1. ブラウザのコンソールを開く（F12）
2. ページをリロード
3. `FirebaseError: Missing or insufficient permissions` が表示されないことを確認
4. ルームを作成して、正常に動作することを確認

## 📚 参考リンク

- [Firestore セキュリティルール ドキュメント](https://firebase.google.com/docs/firestore/security/get-started)
- [Realtime Database セキュリティルール](https://firebase.google.com/docs/database/security)
- [Firebase セキュリティルールのベストプラクティス](https://firebase.google.com/docs/rules/best-practices)

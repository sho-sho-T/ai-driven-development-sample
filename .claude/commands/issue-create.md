---
description: 対話形式で GitHub Issue を作成する
allowed-tools:
  - Bash
  - AskUserQuestion
  - Read
---

# issue-create コマンド

## Flow

### 1. カテゴリーを選択

AskUserQuestion を使い、作成する Issue のカテゴリーをユーザーに尋ねる。

| カテゴリー | 説明 |
|---|---|
| `user-story` | ユーザー視点の機能要件（〜できるようにする） |
| `task` | 内部的な技術タスク、リファクタリング、設定変更 |
| `bug` | 不具合、エラー、期待と異なる動作 |
| `enhancement` | 既存機能の改善、パフォーマンス改善 |
| `docs` | ドキュメントの追加・更新 |

### 2. Issue テンプレートを読み込む

選択されたカテゴリーに対応するテンプレートを読み込む。

```
.claude/issue-templates/<category>.md
```

### 3. テンプレートの各項目をユーザーに質問する

テンプレートの Body セクション内のプレースホルダー（`<...>` で囲まれた部分）を埋めるため、AskUserQuestion を使ってユーザーに **1 つずつ順番に** 質問する。

質問の順序はテンプレートのセクション順に従う。各質問では:

- テンプレートのセクション名と説明を提示する
- 必須項目と任意項目を明示する
- ユーザーの回答が不十分な場合は追加質問で掘り下げる

**カテゴリー別の必須質問:**

#### user-story
1. ユーザーの役割（誰が）
2. 達成したいこと（何を）
3. 理由・価値（なぜ）
4. 受け入れ条件
5. UI 仕様（該当する場合）

#### task
1. タスクの概要
2. 目的
3. 具体的な作業内容
4. 受け入れ条件
5. 対象ファイル・モジュール（わかる場合）

#### bug
1. バグの概要
2. 再現手順
3. 期待される動作
4. 実際の動作（エラーメッセージ含む）
5. 影響範囲・重要度

#### enhancement
1. 改善対象の機能
2. 現状の課題
3. 改善内容
4. 受け入れ条件

#### docs
1. 対象ドキュメント
2. 追加・更新の理由
3. 記載すべき内容の構成

### 4. Issue の内容をプレビュー

収集した情報をテンプレートに当てはめ、Issue のタイトルと本文をユーザーに提示する。AskUserQuestion で「この内容で Issue を作成しますか？」と確認する。

- 修正が必要な場合は該当箇所を再度質問する
- 受け入れ条件は Claude Code が plan-mode で自走できる粒度になっているか確認する

### 5. ラベルの存在確認

```bash
gh label create "<category>" --force
```

### 6. Issue を作成

```bash
gh issue create \
  --title "<テンプレートの Title Format に従ったタイトル>" \
  --body "<テンプレートに従って構成された本文>" \
  --label "<category>"
```

**重要:** `--body` の内容は HEREDOC を使って渡す:

```bash
gh issue create \
  --title "<title>" \
  --body "$(cat <<'EOF'
<body content>
EOF
)" \
  --label "<category>"
```

### 7. Issue URL を出力

作成した Issue の URL を表示する。

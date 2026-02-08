# PR 提出前チェックリスト

PR を作成する前に、以下をすべて確認する。

- [ ] `mise run lint` がエラーなしで通る
- [ ] `bun test`（該当するテストがある場合）がパスする
- [ ] TASK.md の status が `done` に更新されている
- [ ] TASK.md の Verification チェック項目がすべて完了している
- [ ] 不要なデバッグコード・`console.log` が残っていない
- [ ] `.env` ファイルがコミットに含まれていない
- [ ] PR タイトルが規約に従っている: `[TASK-<issue>-<task>] <summary>`
- [ ] commit message が Conventional Commits 形式である
- [ ] モジュール境界を越えた参照がない（contracts 経由であること）

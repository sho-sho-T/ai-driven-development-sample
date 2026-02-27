# ドメインモデリング設計判断記録

このドキュメントは `domain-model.md` に記載されたドメインモデルの設計判断について、その背景・理由・トレードオフを記録するものである。

---

## 1. Bounded Context の分割

### 判断: library コンテキストの追加

**背景**: 要件定義書でマルチテナント対応が求められており、イベントストーミングでも `LibraryRegistered` イベントが各コンテキストに伝播する起点として描かれている。

**理由**:
- 図書館（テナント）の管理は、書籍管理・貸出管理・利用者管理とは独立した関心事である
- `libraryId` がすべてのコンテキストの Aggregate に横断的に登場するため、その発行元を明確に分離する必要がある
- dev-console アプリケーションの操作対象として独立している

**却下した代替案**:
- **library を shared-kernel に含める**: テナント管理にはドメインロジック（登録・編集・削除）があるため、純粋なインフラ機能ではない。shared-kernel はステートレスな基盤のみとすべき
- **catalog に library を含める**: 関心事が異なりすぎる。catalog は書籍ドメインの専門家、library はテナント管理の専門家

### 判断: catalog / lending / member の3コンテキスト維持

**背景**: 旧ドメインモデルから継続。イベントストーミングでもこの3つのスイムレーンが明確に分かれている。

**理由**:
- **catalog**: 書籍の「何があるか」を管理する。ISBN・タイトルなどのメタデータと、バーコード付き物理書籍の管理
- **lending**: 「誰が何を借りているか」を管理する。貸出ルールの執行が主責務
- **member**: 「誰がいるか」を管理する。利用者のライフサイクル管理

これらは変更理由が異なる（書籍の追加 vs 貸出ルール変更 vs 利用者管理方針変更）ため、独立コンテキストとして適切。

---

## 2. catalog コンテキストの Aggregate 分割

### 判断: Book を BookInfo + BookCopy に分割

**背景**: 旧モデルでは `Book` 単一の Aggregate だったが、イベントストーミングでは `BookInfo`（書籍情報）と `BookCopy`（書籍実体）が別々の Aggregate として描かれている。要件定義書にも「書籍情報（ISBNベースのカタログ）と書籍実体（バーコード付き物理書籍）の管理」と明記されている。

**理由**:

1. **1対多の関係**: 1つの書籍情報（ISBN「978-xxx」のプログラミング入門）に対して、複数の物理書籍（バーコード001, 002, 003）が紐付く。これを1つの Aggregate で管理すると、書籍実体の追加・状態変更のたびに書籍情報 Aggregate 全体がロックされる

2. **異なるライフサイクル**: BookInfo は一度登録されたらほぼ変更されない（書誌データ）。BookCopy は貸出・返却のたびに status が頻繁に変更される。変更頻度が大きく異なるものを同一 Aggregate にすると、不要な競合が生じる

3. **P2P 書籍の対応**: P2P 書籍は「利用者が所有する物理書籍」であり、既存の BookInfo に紐付けて BookCopy を追加する形になる。BookInfo と BookCopy が分離されていることで、この追加が自然にモデリングできる

4. **lending からの参照先**: lending コンテキストが貸出対象として参照するのは物理書籍（BookCopy）であり、書誌情報（BookInfo）ではない。Aggregate が分かれていることで参照が明確になる

**トレードオフ**:
- Aggregate が増えることで管理の複雑さが増す
- BookCopy の登録時に BookInfo の存在確認が必要（Aggregate 間の整合性を Domain Service で担保）
- ただし、この複雑さは問題領域の本質的な複雑さを反映しているため、受け入れる

### 判断: BookCopy に ownerType / ownerId を持たせる

**背景**: イベントストーミングでは `RegisterBookCopy`（図書館書籍）と `RegisterP2PBookCopy`（P2P 書籍）が別コマンドとして描かれている。

**理由**:
- 図書館書籍と P2P 書籍は**同一の Aggregate（BookCopy）** として扱う。物理書籍としての振る舞い（貸出状態の管理）は共通
- `ownerType` で区別することで、P2P 特有のルール（所有者のみが貸出可能）を判定できる
- lending コンテキストから見ると BookCopy は一律に `bookCopyId` で参照でき、P2P かどうかを意識しなくてよい（貸出可否判定は LoanPolicy で行う）

**却下した代替案**:
- **LibraryBookCopy と P2PBookCopy を別 Aggregate にする**: 共通の振る舞いが多く、重複コードが増える。status 管理のロジックが分散する
- **P2P 専用コンテキストを作る**: 現段階では過剰な分割。将来的に P2P の複雑さが増したら分離を検討

---

## 3. lending コンテキストの設計

### 判断: 図書館貸出と P2P 貸出を同一 Aggregate（Loan）で管理

**背景**: イベントストーミングでは `BorrowBook`（図書館貸出）と `LendP2PBook`（P2P 貸出）が別コマンドとして描かれているが、いずれも `Loan` Aggregate を生成する。

**理由**:

1. **共通のビジネスルール**: 貸出上限5冊は図書館 + P2P の合算であるため、同一の Aggregate / Repository で管理しないとこの制約を効率的に検証できない

2. **共通のライフサイクル**: 借りる → 延長 → 返却 → 延滞検出のライフサイクルは図書館貸出も P2P 貸出も同じ

3. **`loanType` による区別**: `loanType: "library" | "p2p"` で区別し、P2P 固有の情報（`lenderId`）は Loan の属性として保持する

**トレードオフ**:
- P2P 固有のロジックが増えた場合、Loan Aggregate が肥大化する可能性がある
- `lenderId` が図書館貸出では null になるのは型安全性の観点でやや妥協がある

### 判断: LoanPolicy を Domain Service として分離

**背景**: イベントストーミングのビジネスルール（赤い付箋）に「貸出上限5冊 / 延滞中は不可 / 重複不可」が記載されている。

**理由**:
- 貸出可否の判定には、対象 Loan だけでなく「利用者の全貸出」を参照する必要がある（複数 Aggregate の読み取り）
- Loan Aggregate 単体では判定できないルールであるため、Domain Service が適切
- `canBorrow` と `canLendP2P` を分けることで、P2P 固有の検証（所有者であること）を明示的に表現

### 判断: DetectOverdueLoans を Scheduler 起動の Command として定義

**背景**: イベントストーミングで `Scheduler` アクターが `DetectOverdueLoans` コマンドを daily batch で実行する流れが描かれている。

**理由**:
- 延滞は「時間の経過」によって発生する状態変化であり、ユーザー操作ではない
- 定期バッチで dueDate を過ぎた active な Loan を検出し、status を overdue に変更する
- LoanOverdue イベントを発行することで、将来的な通知機能やペナルティ処理の拡張ポイントとなる

---

## 4. マルチテナント設計

### 判断: すべての Aggregate に libraryId を持たせる

**背景**: 要件定義書に「図書館単位でデータを分離する」とあり、イベントストーミングでも各コマンドに libraryId が含まれている。

**理由**:
- テナント分離をアプリケーション層ではなくドメイン層で表現する
- libraryId を Aggregate のプロパティとすることで、Repository のクエリ時に自然にフィルタリングできる
- 将来的に Row Level Security（RLS）を導入する際にも、テーブルカラムとして libraryId が存在することが前提となる

**却下した代替案**:
- **コンテキストパラメータとして暗黙的に渡す**: ドメインモデルに libraryId が現れないため、テスト時にテナント分離の検証が難しくなる
- **テナントごとにスキーマ/DB を分ける**: 学習用アプリケーションとしては過剰。運用コストも高い

### 判断: ISBN の一意制約を「図書館内で一意」とする

**背景**: 旧モデルでは ISBN がグローバルに一意だったが、マルチテナント化に伴い制約のスコープを再検討した。

**理由**:
- 同じ ISBN の書籍を複数の図書館がそれぞれ登録するのは自然な要件
- DB の UNIQUE 制約は `(isbn, library_id)` の複合一意とする
- 同一図書館内での ISBN 重複は防ぎつつ、テナント間の独立性を保証

---

## 5. Context 間の連携設計

### 判断: イベント駆動による疎結合な同期

**背景**: イベントストーミングの Cross-Context Event Flows で、lending → catalog のイベント連携が描かれている。

**理由**:

1. **BookBorrowed / BookReturned → catalog の BookCopy.status 同期**:
   - lending が catalog の内部実装（BookCopy の status 変更方法）に依存しない
   - lending は「本が借りられた」というイベントを発行するだけ
   - catalog は自身のポリシーに従って BookCopy の status を変更する

2. **BookCopyRegistered → lending が貸出可能な書籍として認識**:
   - lending が直接 catalog の BookCopy を参照するのではなく、イベント経由で「貸出可能な書籍が追加された」ことを知る
   - ただし、現実装ではシンプルに ID 参照で十分な場合もある（結果整合性 vs 即時整合性のトレードオフ）

3. **MemberRegistered → lending が貸出可能な利用者として認識**:
   - member コンテキストで利用者が登録された際、lending が利用者の存在を認識する

### 判断: Aggregate 間は ID 参照のみ

**理由**:
- オブジェクト参照を許可すると、Aggregate 間の結合度が上がり、トランザクション境界が曖昧になる
- ID 参照であれば、各 Aggregate を独立して永続化・テストできる
- モジュラーモノリスからマイクロサービスへの移行時にも、ID 参照であれば変更が最小限

---

## 6. 旧モデルからの主な変更点まとめ

| 項目 | 旧モデル | 新モデル | 変更理由 |
|---|---|---|---|
| Bounded Context | catalog, lending, member | + library | マルチテナント対応 |
| 書籍管理 | Book 単一 Aggregate | BookInfo + BookCopy | 1:N 関係の分離、P2P 対応 |
| 書籍参照 | bookId | bookCopyId | 物理書籍単位での貸出管理 |
| P2P 対応 | なし | BookCopy.ownerType, Loan.loanType | P2P 書籍の登録・貸出・返却 |
| テナント | なし | 全 Aggregate に libraryId | マルチテナント分離 |
| ISBN 一意性 | グローバル | 図書館内 | マルチテナント対応 |
| 利用者削除 | なし | DeleteMember コマンド | 要件追加 |
| 延滞検出 | なし | DetectOverdueLoans | スケジューラーによる自動検出 |
| Email 一意性 | グローバル | 図書館内 | マルチテナント対応 |

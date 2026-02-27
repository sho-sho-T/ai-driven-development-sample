# 図書貸出管理アプリケーション ドメインモデル

## 1. Bounded Context マップ

```
┌─────────────┐
│   library    │
│ (図書館管理) │
└──────┬──────┘
       │ Event: LibraryRegistered
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   catalog    │     │   lending    │     │   member     │
│  (書籍管理)  │◄────│  (貸出管理)  │────►│ (利用者管理) │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                  │                     ▲
       │    Event         │      Event          │
       └──────────────────┘─────────────────────┘
```

- **library**: 図書館（テナント）の登録・管理を担う。全コンテキストに libraryId を提供するマルチテナントの起点
- **catalog**: 書籍情報（ISBN ベースのカタログ）と書籍実体（バーコード付き物理書籍）の管理を担う。lending からのイベントで貸出状態を同期する
- **lending**: 貸出・返却のコアロジックを担う。図書館貸出と P2P 貸出の両方を管理する。catalog・member を ID で参照する
- **member**: 利用者の登録・管理を担う

---

## 2. library コンテキスト

### Aggregate: Library

図書館（テナント）を管理する Aggregate Root。

```
Library (Aggregate Root)
├── id: LibraryId (ValueObject)
├── name: string
└── location: string
```

### Value Objects

| Value Object | プロパティ | バリデーションルール |
|---|---|---|
| **LibraryId** | value: string (ULID) | 空文字不可 |

### Domain Events

| Event | ペイロード | 発行タイミング |
|---|---|---|
| **LibraryRegistered** | libraryId, name | 図書館が新規登録された時 |

### ビジネスルール

- 図書館名は空文字不可

---

## 3. catalog コンテキスト

### Aggregate: BookInfo

書籍情報（ISBN ベースのカタログデータ）を管理する Aggregate Root。

```
BookInfo (Aggregate Root)
├── id: BookInfoId (ValueObject)
├── isbn: Isbn (ValueObject)
├── title: string
├── author: string
├── publisher: string
├── publishedYear: number | undefined
└── libraryId: string          — library の LibraryId を ID で参照
```

### Aggregate: BookCopy

書籍実体（バーコード付き物理書籍）を管理する Aggregate Root。BookInfo に紐付く。

```
BookCopy (Aggregate Root)
├── id: BookCopyId (ValueObject)
├── bookInfoId: string         — BookInfo の ID を参照
├── barcode: Barcode (ValueObject)
├── libraryId: string          — library の LibraryId を ID で参照
├── status: BookCopyStatus (ValueObject) — "available" | "onLoan"
├── ownerType: "library" | "p2p"
└── ownerId: string | null     — P2P の場合は member の MemberId
```

### Value Objects

| Value Object | プロパティ | バリデーションルール |
|---|---|---|
| **BookInfoId** | value: string (ULID) | 空文字不可 |
| **BookCopyId** | value: string (ULID) | 空文字不可 |
| **Isbn** | value: string | ISBN-13 形式（13桁の数字） |
| **Barcode** | value: string | 空文字不可、一意制約はリポジトリで検証 |
| **BookCopyStatus** | value: "available" \| "onLoan" | 指定された値のみ |

### Domain Events

| Event | ペイロード | 発行タイミング |
|---|---|---|
| **BookInfoRegistered** | bookInfoId, isbn, title, author, libraryId | 書籍情報が新規登録された時 |
| **BookCopyRegistered** | bookCopyId, bookInfoId, barcode, libraryId | 図書館の書籍実体が登録された時 |
| **P2PBookCopyRegistered** | bookCopyId, bookInfoId, barcode, ownerId | P2P 書籍実体が登録された時 |
| **BookCopyStatusChanged** | bookCopyId, status | 書籍実体の貸出状態が変更された時 |

### ビジネスルール

- ISBN は図書館内で一意（Domain Service で検証）
- タイトル・著者は空文字不可
- バーコードは一意（Domain Service で検証）
- 書籍実体は必ず書籍情報（BookInfo）に紐付ける
- 貸出中（onLoan）の書籍実体は削除不可
- P2P 書籍は ownerType = "p2p" かつ ownerId に所有者の MemberId を持つ

---

## 4. member コンテキスト

### Aggregate: Member

利用者情報を管理する Aggregate Root。

```
Member (Aggregate Root)
├── id: MemberId (ValueObject)
├── name: string
├── email: Email (ValueObject)
├── libraryId: string          — library の LibraryId を ID で参照
└── registeredAt: Date
```

### Value Objects

| Value Object | プロパティ | バリデーションルール |
|---|---|---|
| **MemberId** | value: string (ULID) | 空文字不可 |
| **Email** | value: string | メールアドレス形式 |

### Domain Events

| Event | ペイロード | 発行タイミング |
|---|---|---|
| **MemberRegistered** | memberId, name, email, libraryId | 利用者が新規登録された時 |
| **MemberDeleted** | memberId | 利用者が削除された時 |

### ビジネスルール

- メールアドレスは一意（Domain Service で検証）
- 名前は空文字不可
- 貸出中の書籍がある利用者は削除不可（lending コンテキストに問い合わせ）

---

## 5. lending コンテキスト

### Aggregate: Loan

貸出を管理する Aggregate Root。lending コンテキストの中核。図書館貸出と P2P 貸出の両方を統一的に扱う。

```
Loan (Aggregate Root)
├── id: LoanId (ValueObject)
├── bookCopyId: string         — catalog の BookCopyId を ID で参照
├── memberId: string           — member の MemberId を ID で参照（借り手）
├── libraryId: string          — library の LibraryId を ID で参照
├── loanType: LoanType (ValueObject) — "library" | "p2p"
├── lenderId: string | null    — P2P の場合は所有者の MemberId
├── borrowedAt: Date
├── dueDate: DueDate (ValueObject)
├── returnedAt: Date | null
├── extended: boolean
└── status: LoanStatus (ValueObject) — "active" | "returned" | "overdue"
```

### Value Objects

| Value Object | プロパティ | バリデーションルール |
|---|---|---|
| **LoanId** | value: string (ULID) | 空文字不可 |
| **DueDate** | value: Date | 過去日付不可（新規作成時） |
| **LoanStatus** | value: "active" \| "returned" \| "overdue" | 指定された値のみ |
| **LoanType** | value: "library" \| "p2p" | 指定された値のみ |

### Domain Events

| Event | ペイロード | 発行タイミング |
|---|---|---|
| **BookBorrowed** | loanId, bookCopyId, memberId, dueDate | 図書館書籍が貸し出された時 |
| **BookReturned** | loanId, bookCopyId, memberId, returnedAt | 図書館書籍が返却された時 |
| **P2PBookLent** | loanId, bookCopyId, lenderId, borrowerId, dueDate | P2P 書籍が貸し出された時 |
| **P2PBookReturned** | loanId, bookCopyId, lenderId, borrowerId | P2P 書籍が返却された時 |
| **LoanExtended** | loanId, newDueDate | 貸出が延長された時 |
| **LoanOverdue** | loanId, bookCopyId, memberId, dueDate | 貸出が延滞になった時 |

### Domain Service: LoanPolicy

貸出の可否判定を行う Domain Service。

```
LoanPolicy
├── canBorrow(memberId, bookCopyId): Result<void, string>
│   ├── 利用者の現在の貸出数が5冊未満であること（図書館 + P2P 合算）
│   ├── 利用者に延滞中の貸出がないこと
│   └── 同一書籍実体を重複して借りていないこと
├── canLendP2P(lenderId, bookCopyId, borrowerMemberId): Result<void, string>
│   ├── 貸出者が書籍実体の所有者であること
│   ├── 借り手の現在の貸出数が5冊未満であること
│   ├── 借り手に延滞中の貸出がないこと
│   └── 同一書籍実体を重複して借りていないこと
└── canExtend(loan): Result<void, string>
    └── 延長が未実施であること
```

### ビジネスルール

- 1利用者あたり同時貸出上限: **5冊**（図書館書籍 + P2P 合算）
- 貸出期間: 借りた日から **14日間**
- 延長: **1回のみ**、**7日間**
- 延滞中の利用者は新規貸出不可
- 同一書籍実体の重複貸出不可
- 返却済みの貸出は再度返却不可
- 返却済みの貸出は延長不可
- P2P 貸出は所有者本人のみが実行可能

---

## 6. Aggregate 間の関係

```
library::Library ──(Event)──► 各コンテキストがテナントとして認識

catalog::BookInfo ◄──(bookInfoId)── catalog::BookCopy

catalog::BookCopy ──(ID参照)──► lending::Loan ◄──(ID参照)── member::Member
                                      │
                                      │ Event
                                      ▼
                    BookBorrowed/P2PBookLent     → catalog::BookCopy.status = "onLoan"
                    BookReturned/P2PBookReturned → catalog::BookCopy.status = "available"
```

### 参照方針

- Aggregate 間はすべて **ID による参照**（オブジェクト参照禁止）
- Context 間の状態同期は **Domain Event** 経由
- lending は catalog・member の内部実装に依存しない
- catalog 内の BookInfo と BookCopy は bookInfoId による ID 参照（別 Aggregate）

---

## 7. Command / Query 一覧

### 7.1 Commands（Write）

| Context | Command | Actor | 説明 |
|---|---|---|---|
| library | `RegisterLibrary` | System Admin | 図書館を新規登録する |
| catalog | `RegisterBookInfo` | Librarian | 書籍情報を新規登録する |
| catalog | `RegisterBookCopy` | Librarian | 図書館の書籍実体を登録する |
| catalog | `RegisterP2PBookCopy` | Member | P2P 書籍実体を登録する |
| catalog | `ChangeBookCopyStatus` | (Event) | 書籍実体の貸出状態を変更する（イベント経由） |
| member | `RegisterMember` | Librarian | 利用者を新規登録する |
| member | `DeleteMember` | Librarian | 利用者を削除する |
| lending | `BorrowBook` | Member | 図書館書籍を借りる |
| lending | `ReturnBook` | Member | 図書館書籍を返却する |
| lending | `LendP2PBook` | Member (Owner) | P2P 書籍を他の利用者に貸し出す |
| lending | `ReturnP2PBook` | Member | P2P 書籍を返却する |
| lending | `ExtendLoan` | Member | 貸出期間を延長する |
| lending | `DetectOverdueLoans` | Scheduler | 延滞貸出を検出してステータスを更新する |

### 7.2 Queries（Read）

| Context | Query | 説明 |
|---|---|---|
| catalog | `SearchBooks` | 書籍情報を検索する（タイトル・著者・ISBN） |
| catalog | `GetBookInfoById` | 書籍情報の詳細を取得する |
| catalog | `ListBookInfos` | 書籍情報一覧を取得する |
| catalog | `GetBookCopiesByBookInfo` | 書籍情報に紐付く書籍実体一覧を取得する |
| member | `SearchMembers` | 利用者を検索する |
| member | `GetMemberById` | 利用者の詳細を取得する |
| lending | `GetLoansByMember` | 利用者の貸出一覧を取得する |
| lending | `GetActiveLoanByBookCopy` | 書籍実体の現在の貸出情報を取得する |
| lending | `GetOverdueLoans` | 延滞中の貸出一覧を取得する |
| library | `ListLibraries` | 図書館一覧を取得する |

---

## 8. データベーステーブル（参考）

### libraries

| カラム | 型 | 制約 |
|---|---|---|
| id | text | PK |
| name | text | NOT NULL |
| location | text | |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

### book_infos

| カラム | 型 | 制約 |
|---|---|---|
| id | text | PK |
| isbn | text | NOT NULL |
| title | text | NOT NULL |
| author | text | NOT NULL |
| publisher | text | |
| published_year | integer | |
| library_id | text | NOT NULL, FK → libraries.id |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

**UNIQUE 制約**: (isbn, library_id)

### book_copies

| カラム | 型 | 制約 |
|---|---|---|
| id | text | PK |
| book_info_id | text | NOT NULL, FK → book_infos.id |
| barcode | text | UNIQUE, NOT NULL |
| library_id | text | NOT NULL, FK → libraries.id |
| status | text | NOT NULL, DEFAULT 'available' |
| owner_type | text | NOT NULL, DEFAULT 'library' |
| owner_id | text | |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

### members

| カラム | 型 | 制約 |
|---|---|---|
| id | text | PK |
| name | text | NOT NULL |
| email | text | NOT NULL |
| library_id | text | NOT NULL, FK → libraries.id |
| registered_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

**UNIQUE 制約**: (email, library_id)

### loans

| カラム | 型 | 制約 |
|---|---|---|
| id | text | PK |
| book_copy_id | text | NOT NULL, FK → book_copies.id |
| member_id | text | NOT NULL, FK → members.id |
| library_id | text | NOT NULL, FK → libraries.id |
| loan_type | text | NOT NULL, DEFAULT 'library' |
| lender_id | text | |
| borrowed_at | timestamptz | NOT NULL, DEFAULT now() |
| due_date | timestamptz | NOT NULL |
| returned_at | timestamptz | |
| extended | boolean | NOT NULL, DEFAULT false |
| status | text | NOT NULL, DEFAULT 'active' |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

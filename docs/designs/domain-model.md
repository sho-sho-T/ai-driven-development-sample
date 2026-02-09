# 図書貸出管理アプリケーション ドメインモデル

## 1. Bounded Context マップ

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   catalog    │     │   lending    │     │   member     │
│  (書籍管理)  │◄────│  (貸出管理)  │────►│ (利用者管理) │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                  │                     ▲
       │    Event         │      Event          │
       └──────────────────┘─────────────────────┘
```

- **catalog**: 書籍の登録・管理を担う。lending からのイベントで貸出状態を同期する
- **lending**: 貸出・返却のコアロジックを担う。catalog・member を ID で参照する
- **member**: 利用者の登録・管理を担う

---

## 2. catalog コンテキスト

### Aggregate: Book

書籍情報を管理する Aggregate Root。

```
Book (Aggregate Root)
├── id: BookId (ValueObject)
├── isbn: Isbn (ValueObject)
├── title: string
├── author: string
├── publisher: string
├── publishedYear: number
└── status: BookStatus (ValueObject) — "available" | "onLoan"
```

### Value Objects

| Value Object | プロパティ | バリデーションルール |
|---|---|---|
| **BookId** | value: string (ULID) | 空文字不可 |
| **Isbn** | value: string | ISBN-13形式（13桁の数字） |
| **BookStatus** | value: "available" \| "onLoan" | 指定された値のみ |

### Domain Events

| Event | ペイロード | 発行タイミング |
|---|---|---|
| **BookRegistered** | bookId, isbn, title | 書籍が新規登録された時 |
| **BookStatusChanged** | bookId, status | 書籍の貸出状態が変更された時 |

### ビジネスルール

- ISBN は一意（Domain Service で検証）
- タイトル・著者は空文字不可
- 貸出中（onLoan）の書籍は削除不可

---

## 3. member コンテキスト

### Aggregate: Member

利用者情報を管理する Aggregate Root。

```
Member (Aggregate Root)
├── id: MemberId (ValueObject)
├── name: string
├── email: Email (ValueObject)
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
| **MemberRegistered** | memberId, name, email | 利用者が新規登録された時 |

### ビジネスルール

- メールアドレスは一意（Domain Service で検証）
- 名前は空文字不可

---

## 4. lending コンテキスト

### Aggregate: Loan

貸出を管理する Aggregate Root。lending コンテキストの中核。

```
Loan (Aggregate Root)
├── id: LoanId (ValueObject)
├── bookId: string          — catalog の BookId を ID で参照
├── memberId: string        — member の MemberId を ID で参照
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

### Domain Events

| Event | ペイロード | 発行タイミング |
|---|---|---|
| **BookBorrowed** | loanId, bookId, memberId, dueDate | 書籍が貸し出された時 |
| **BookReturned** | loanId, bookId, memberId, returnedAt | 書籍が返却された時 |
| **LoanExtended** | loanId, newDueDate | 貸出が延長された時 |
| **LoanOverdue** | loanId, bookId, memberId | 貸出が延滞になった時 |

### Domain Service: LoanPolicy

貸出の可否判定を行う Domain Service。

```
LoanPolicy
├── canBorrow(memberId, bookId): Result<void, string>
│   ├── 利用者の現在の貸出数が5冊未満であること
│   ├── 利用者に延滞中の貸出がないこと
│   └── 同一書籍を重複して借りていないこと
└── canExtend(loan): Result<void, string>
    └── 延長が未実施であること
```

### ビジネスルール

- 1利用者あたり同時貸出上限: **5冊**
- 貸出期間: 借りた日から **14日間**
- 延長: **1回のみ**、**7日間**
- 延滞中の利用者は新規貸出不可
- 同一書籍の重複貸出不可
- 返却済みの貸出は再度返却不可
- 返却済みの貸出は延長不可

---

## 5. Aggregate 間の関係

```
catalog::Book ──(ID参照)──► lending::Loan ◄──(ID参照)── member::Member
                                │
                                │ Event
                                ▼
                    BookBorrowed → catalog::Book.status = "onLoan"
                    BookReturned → catalog::Book.status = "available"
```

### 参照方針

- Aggregate 間はすべて **ID による参照**（オブジェクト参照禁止）
- Context 間の状態同期は **Domain Event** 経由
- lending は catalog・member の内部実装に依存しない

---

## 6. Command / Query 一覧

### 6.1 Commands（Write）

| Context | Command | 説明 |
|---|---|---|
| catalog | `RegisterBook` | 書籍を新規登録する |
| catalog | `UpdateBook` | 書籍情報を更新する |
| catalog | `ChangeBookStatus` | 書籍の貸出状態を変更する（イベント経由） |
| member | `RegisterMember` | 利用者を新規登録する |
| member | `UpdateMember` | 利用者情報を更新する |
| lending | `BorrowBook` | 書籍を貸し出す |
| lending | `ReturnBook` | 書籍を返却する |
| lending | `ExtendLoan` | 貸出期間を延長する |

### 6.2 Queries（Read）

| Context | Query | 説明 |
|---|---|---|
| catalog | `SearchBooks` | 書籍を検索する |
| catalog | `GetBookById` | 書籍の詳細を取得する |
| catalog | `ListBooks` | 書籍一覧を取得する |
| member | `SearchMembers` | 利用者を検索する |
| member | `GetMemberById` | 利用者の詳細を取得する |
| lending | `GetLoansByMember` | 利用者の貸出一覧を取得する |
| lending | `GetActiveLoanByBook` | 書籍の現在の貸出情報を取得する |
| lending | `GetOverdueLoans` | 延滞中の貸出一覧を取得する |

---

## 7. データベーステーブル（参考）

### books

| カラム | 型 | 制約 |
|---|---|---|
| id | text | PK |
| isbn | text | UNIQUE, NOT NULL |
| title | text | NOT NULL |
| author | text | NOT NULL |
| publisher | text | |
| published_year | integer | |
| status | text | NOT NULL, DEFAULT 'available' |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

### members

| カラム | 型 | 制約 |
|---|---|---|
| id | text | PK |
| name | text | NOT NULL |
| email | text | UNIQUE, NOT NULL |
| registered_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

### loans

| カラム | 型 | 制約 |
|---|---|---|
| id | text | PK |
| book_id | text | NOT NULL, FK → books.id |
| member_id | text | NOT NULL, FK → members.id |
| borrowed_at | timestamptz | NOT NULL, DEFAULT now() |
| due_date | timestamptz | NOT NULL |
| returned_at | timestamptz | |
| extended | boolean | NOT NULL, DEFAULT false |
| status | text | NOT NULL, DEFAULT 'active' |
| created_at | timestamptz | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | NOT NULL, DEFAULT now() |

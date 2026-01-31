# Database Schema Plan – 10x-cards MVP

## 1. Tables with Columns, Data Types, and Constraints

### 1.1 `users` (Supabase Auth – managed by Supabase)

Managed by Supabase Auth. Referenced by `flashcards.user_id`, `generations.user_id`, `generation_error_logs.user_id`.

| Column              | Type           | Constraints |
|---------------------|----------------|-------------|
| id                  | uuid           | PK          |
| email               | varchar(255)   | NOT NULL, UNIQUE |
| encrypted_password  | varchar        | NOT NULL    |
| created_at          | timestamptz    | NOT NULL, DEFAULT now() |
| confirmed_at        | timestamptz    | NULL        |

### 1.2 `flashcards`

| Column         | Type         | Constraints |
|----------------|--------------|-------------|
| id             | bigserial    | PK          |
| front          | varchar(200) | NOT NULL    |
| back           | varchar(500) | NOT NULL    |
| source         | varchar      | NOT NULL, CHECK (source IN ('ai-full', 'ai-edited', 'manual')) |
| created_at     | timestamptz  | NOT NULL, DEFAULT now() |
| updated_at     | timestamptz  | NOT NULL, DEFAULT now() |
| generation_id  | bigint       | NULL, FK → generations(id) ON DELETE SET NULL |
| user_id        | uuid         | NOT NULL, FK → auth.users(id) ON DELETE CASCADE |

**Note:** `source` values: `ai-full` (AI-generated, unedited), `ai-edited` (AI-generated, user edited), `manual` (created manually). `generation_id` links to the generation session when applicable. `updated_at` is auto-updated via trigger.

### 1.3 `generations`

| Column                 | Type         | Constraints |
|------------------------|--------------|-------------|
| id                     | bigserial    | PK          |
| user_id                | uuid         | NOT NULL, FK → auth.users(id) ON DELETE CASCADE |
| model                  | varchar(100) | NOT NULL    |
| generated_count        | integer      | NOT NULL    |
| accepted_unedited_count| integer      | NULL        |
| accepted_edited_count  | integer      | NULL        |
| source_text_hash       | varchar(64)  | NOT NULL    |
| source_text_length     | integer      | NOT NULL, CHECK (source_text_length BETWEEN 1000 AND 10000) |
| generation_duration    | integer      | NOT NULL    |
| created_at             | timestamptz  | NOT NULL, DEFAULT now() |
| updated_at             | timestamptz  | NOT NULL, DEFAULT now() |

**Note:** `source_text_hash` length assumes SHA-256 (64 chars). `model` length allows typical LLM model identifiers.

### 1.4 `generation_error_logs`

| Column            | Type          | Constraints |
|-------------------|---------------|-------------|
| id                | bigserial     | PK          |
| user_id           | uuid          | NOT NULL, FK → auth.users(id) ON DELETE CASCADE |
| model             | varchar(100)  | NOT NULL    |
| source_text_hash  | varchar(64)   | NOT NULL    |
| source_text_length| integer       | NOT NULL, CHECK (source_text_length BETWEEN 1000 AND 10000) |
| error_code        | varchar(100)  | NOT NULL    |
| error_message     | text          | NOT NULL    |
| created_at        | timestamptz   | NOT NULL, DEFAULT now() |

**Note:** Immutable log records — no `updated_at`; append-only.

---

## 2. Table Relationships

| From Table             | To Table    | Relationship | Foreign Key  | On Delete |
|------------------------|-------------|--------------|--------------|-----------|
| flashcards             | auth.users  | Many-to-One  | user_id      | CASCADE   |
| flashcards             | generations | Many-to-One  | generation_id| SET NULL  |
| generations            | auth.users  | Many-to-One  | user_id      | CASCADE   |
| generation_error_logs  | auth.users  | Many-to-One  | user_id      | CASCADE   |

**Cardinality:**

- **users → flashcards (1:N):** One user has many flashcards.
- **users → generations (1:N):** One user has many records in `generations`.
- **users → generation_error_logs (1:N):** One user has many records in `generation_error_logs`.
- **flashcards → generations (N:1, optional):** Each flashcard can optionally refer to one generation via `generation_id`. One generation can have many flashcards.

---

## 3. Indexes

| Table               | Index Name                       | Column        | Purpose |
|---------------------|----------------------------------|---------------|---------|
| flashcards          | idx_flashcards_user_id           | (user_id)     | Filter flashcards by user |
| flashcards          | idx_flashcards_generation_id     | (generation_id)| Filter flashcards by generation |
| generations         | idx_generations_user_id          | (user_id)     | Filter generations by user |
| generation_error_logs | idx_generation_error_logs_user_id | (user_id)     | Filter error logs by user |

---

## 4. PostgreSQL RLS (Row Level Security)

W tabelach `flashcards`, `generations` oraz `generation_error_logs` obowiązują polityki RLS zapewniające, że użytkownik ma dostęp wyłącznie do rekordów, w których `user_id` odpowiada jego identyfikatorowi z Supabase Auth (`auth.uid() = user_id`).

### 4.1 Enable RLS

```sql
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_error_logs ENABLE ROW LEVEL SECURITY;
```

### 4.2 Policies

Wszystkie polityki używają warunku `auth.uid() = user_id` — dostęp tylko do własnych rekordów.

| Table                 | Policy Name                 | Operation | Role         | Condition |
|-----------------------|-----------------------------|-----------|--------------|-----------|
| flashcards            | flashcards_select_own      | SELECT    | authenticated | auth.uid() = user_id |
| flashcards            | flashcards_insert_own      | INSERT    | authenticated | auth.uid() = user_id |
| flashcards            | flashcards_update_own      | UPDATE    | authenticated | auth.uid() = user_id |
| flashcards            | flashcards_delete_own      | DELETE    | authenticated | auth.uid() = user_id |
| flashcards            | flashcards_anon_select     | SELECT    | anon          | false |
| flashcards            | flashcards_anon_insert     | INSERT    | anon          | false |
| flashcards            | flashcards_anon_update     | UPDATE    | anon          | false |
| flashcards            | flashcards_anon_delete     | DELETE    | anon          | false |
| generations           | generations_select_own     | SELECT    | authenticated | auth.uid() = user_id |
| generations           | generations_insert_own     | INSERT    | authenticated | auth.uid() = user_id |
| generations           | generations_update_own     | UPDATE    | authenticated | auth.uid() = user_id |
| generations           | generations_delete_own     | DELETE    | authenticated | auth.uid() = user_id |
| generations           | generations_anon_select    | SELECT    | anon          | false |
| generations           | generations_anon_insert    | INSERT    | anon          | false |
| generations           | generations_anon_update    | UPDATE    | anon          | false |
| generations           | generations_anon_delete    | DELETE    | anon          | false |
| generation_error_logs | generation_error_logs_select_own  | SELECT    | authenticated | auth.uid() = user_id |
| generation_error_logs | generation_error_logs_insert_own  | INSERT    | authenticated | auth.uid() = user_id |
| generation_error_logs | generation_error_logs_update_own  | UPDATE    | authenticated | auth.uid() = user_id |
| generation_error_logs | generation_error_logs_delete_own  | DELETE    | authenticated | auth.uid() = user_id |
| generation_error_logs | generation_error_logs_anon_select | SELECT    | anon          | false |
| generation_error_logs | generation_error_logs_anon_insert | INSERT    | anon          | false |
| generation_error_logs | generation_error_logs_anon_update | UPDATE    | anon          | false |
| generation_error_logs | generation_error_logs_anon_delete | DELETE    | anon          | false |

**Przykład polityki (SELECT dla flashcards):**

```sql
CREATE POLICY flashcards_select_own ON flashcards
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

**Przykład polityki (INSERT dla flashcards):**

```sql
CREATE POLICY flashcards_insert_own ON flashcards
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

---

## 5. Triggers

### 5.1 `updated_at` trigger

**Function:**

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Triggers:**

```sql
CREATE TRIGGER set_flashcards_updated_at
  BEFORE INSERT OR UPDATE ON flashcards
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_generations_updated_at
  BEFORE INSERT OR UPDATE ON generations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
```

---

## 6. Additional Notes

### 6.1 Design decisions

- **No decks:** Flat user→flashcards relation; no deck entity in MVP.
- **`generations` table:** Tracks AI generation sessions (model, counts, source hash, duration) for analytics.
- **`generation_error_logs` table:** Logs failed AI generation attempts (error code, message) for debugging and monitoring.
- **`flashcards.source`:** `ai-full` (accepted as-is), `ai-edited` (user modified after AI), `manual` (created by user).
- **`flashcards.generation_id`:** Optional link to generation; SET NULL when generation is deleted.

### 6.2 Triggers

- **flashcards:** Trigger `set_flashcards_updated_at` automatycznie aktualizuje kolumnę `updated_at` przy każdej modyfikacji rekordu (INSERT, UPDATE).
- **generations:** Trigger `set_generations_updated_at` analogicznie aktualizuje `updated_at`.

### 6.3 GDPR

- Account deletion removes related flashcards, generations, and generation_error_logs via `ON DELETE CASCADE`.
- RLS ensures users see only their own data.

### 6.4 Migration path

- Create `flashcards` table with constraints (after `generations` — FK dependency).
- Create `generations` table with constraints.
- Create `generation_error_logs` table with constraints.
- Create indexes for all tables.
- Enable RLS and add policies for all tables.
- Create trigger function and triggers (flashcards, generations).
- Migrations go in `supabase/migrations/` as `YYYYMMDDHHmmss_description.sql`.

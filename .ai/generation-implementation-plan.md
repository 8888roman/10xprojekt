# API Endpoint Implementation Plan: Generate flashcard proposals

## 1. Przegląd punktu końcowego

Endpoint **POST /api/flashcards/generate** przyjmuje surowy tekst użytkownika (1000–10 000 znaków po obcięciu białych znaków), wywołuje zewnętrzne API LLM po stronie serwera i zwraca listę propozycji fiszek (pary front/back). Nie zapisuje nic do bazy (ani fiszek, ani wpisów w `generations`); zapis następuje dopiero gdy klient wyśle zatwierdzone fiszki przez **POST /api/flashcards** i opcjonalnie **POST /api/generations**. W przypadku błędu LLM serwer może zapisać wpis w tabeli `generation_error_logs` (monitoring i debug). Endpoint wymaga uwierzytelnienia (JWT) i powinien być chroniony limitem wywołań (rate limiting) ze względu na koszt i nadużycia LLM.

---

## 2. Szczegóły żądania

- **Metoda HTTP:** POST  
- **Struktura URL:** `/api/flashcards/generate`  
- **Parametry zapytania:** brak  
- **Request body (JSON):**

  | Pole   | Typ    | Wymagane | Ograniczenia                                      |
  |--------|--------|----------|---------------------------------------------------|
  | `text` | string | Tak      | Długość po `trim()`: od 1000 do 10 000 znaków.    |

  Przykład:

  ```json
  { "text": "string" }
  ```

---

## 3. Wykorzystywane typy

- **Żądanie:** `GenerateFlashcardsCommand` (`src/types.ts`) — pole `text: string`.  
- **Odpowiedź sukces:** `GenerateFlashcardsResponseDto` — `{ proposals: FlashcardProposalDto[] }`, gdzie `FlashcardProposalDto` to `{ front: string; back: string }`.  
- **Odpowiedź błąd:** `ErrorResponseDto` — `error`, `message`, `code`, `details`.  
- **Logowanie błędów LLM:** przy zapisie do `generation_error_logs` użyć danych zgodnych z `CreateGenerationErrorLogCommand` (model, source_text_hash, source_text_length, error_code, error_message); `user_id` i `created_at` ustawiane po stronie serwera.

---

## 4. Szczegóły odpowiedzi

- **200 OK** — sukces. Body: `GenerateFlashcardsResponseDto`. Tablica `proposals` może być pusta, jeśli LLM nie zwrócił żadnych par.  
- **400 Bad Request** — nieprawidłowe dane wejściowe (brak `text`, nie-JSON, długość po `trim()` poza 1000–10 000). Body: `ErrorResponseDto` z `code: "VALIDATION_ERROR"`.  
- **401 Unauthorized** — brak lub nieprawidłowy JWT. Body: `ErrorResponseDto` z `code: "UNAUTHORIZED"`.  
- **429 Too Many Requests** — przekroczony limit wywołań. Body: `ErrorResponseDto` z `code: "RATE_LIMITED"`.  
- **502 Bad Gateway / 503 Service Unavailable** — błąd lub niedostępność API LLM. Body: `ErrorResponseDto`; opcjonalnie wpis w `generation_error_logs`.  
- **500 Internal Server Error** — nieoczekiwany błąd serwera. Body: `ErrorResponseDto` z `code: "INTERNAL_ERROR"`.

---

## 5. Przepływ danych

1. **Routing:** Żądanie trafia do handlera POST dla `/api/flashcards/generate` (np. `src/pages/api/flashcards/generate.ts` w Astro).  
2. **Uwierzytelnienie:** Odczyt JWT z nagłówka/ciasteczka; walidacja przez Supabase (`getUser()`). Brak użytkownika → 401.  
3. **Rate limiting:** Sprawdzenie limitu dla `user_id` (np. N żądań na minutę). Przekroczenie → 429.  
4. **Parsowanie body:** Odczyt JSON z body żądania. Błąd parsowania lub brak obiektu → 400.  
5. **Walidacja wejścia:** Zod: `text` wymagane, string, po `trim()` długość ∈ [1000, 10 000]. Niepowodzenie → 400 z `ErrorResponseDto` i ewentualnie `details` z błędami pól.  
6. **Wywołanie LLM:** Serwis w `src/lib/services` (np. `flashcardGenerateService` lub `llmService`) przyjmuje zwalidowany tekst, wywołuje zewnętrzne API LLM (np. OpenRouter lub inny provider z `import.meta.env`), mapuje odpowiedź na listę `{ front, back }`. Timeout i obsługa błędów sieci/API.  
7. **Błąd LLM:** W razie błędu (timeout, 5xx, niepoprawna odpowiedź): opcjonalnie zbudować wpis dla `generation_error_logs` (model, hash i długość tekstu, error_code, error_message), zapisać przez Supabase (kontekst użytkownika lub service role w zależności od polityki). Zwrócić 502/503 i `ErrorResponseDto`.  
8. **Sukces:** Zwrócić 200 i `GenerateFlashcardsResponseDto` z tablicą propozycji (może być pusta).

Żadne dane z tego endpointu nie są zapisywane do tabel `flashcards` ani `generations`; zapis odbywa się w innych endpointach.

---

## 6. Względy bezpieczeństwa

- **Uwierzytelnienie:** Dostęp tylko dla zalogowanych użytkowników (Supabase Auth, JWT). Brak JWT lub nieprawidłowa sesja → 401.  
- **Autoryzacja:** Endpoint nie operuje na zasobach per-user w DB (brak RLS do sprawdzenia dla tego konkretnego wywołania); autoryzacja sprowadza się do wymogu zalogowanego użytkownika.  
- **Walidacja wejścia:** Zod z dokładnymi regułami (typ, trim, długość 1000–10 000) zapobiega nieprawidłowym i potencjalnie niebezpiecznym payloadom.  
- **Rate limiting:** Ograniczenie liczby wywołań na użytkownika (np. na minutę), żeby ograniczyć koszty LLM i nadużycia.  
- **Sekrety:** Klucze API do LLM (np. `OPENROUTER_API_KEY`) tylko w zmiennych środowiskowych serwera (`import.meta.env`), nigdy w odpowiedzi ani w logach po stronie klienta.  
- **Logowanie błędów:** W `generation_error_logs` nie zapisywać surowego tekstu użytkownika, tylko hash (np. SHA-256) i długość, zgodnie ze schematem DB.

---

## 7. Obsługa błędów

| Scenariusz                    | Kod HTTP | Code w body        | Działanie |
|-------------------------------|----------|--------------------|-----------|
| Brak/nieprawidłowy JWT        | 401      | UNAUTHORIZED       | Zwrócić ErrorResponseDto, bez zapisu do DB. |
| Nieprawidłowy JSON / brak body| 400      | VALIDATION_ERROR   | Zwrócić message + ewentualnie details. |
| Brak `text` lub nie string    | 400      | VALIDATION_ERROR   | Jak wyżej. |
| Długość `text` po trim < 1000 lub > 10 000 | 400 | VALIDATION_ERROR | Jak wyżej. |
| Przekroczony limit wywołań    | 429      | RATE_LIMITED       | Zwrócić ErrorResponseDto. |
| Timeout/błąd API LLM          | 502/503  | (np. INTERNAL_ERROR lub dedykowany) | Opcjonalnie: wpis w `generation_error_logs` (model, source_text_hash, source_text_length, error_code, error_message); zwrócić stosowny message. |
| Nieoczekiwany wyjątek serwera | 500      | INTERNAL_ERROR     | Zwrócić ogólny komunikat, nie ujawniać szczegółów wewnętrznych. |

W każdym przypadku błędu zwracać body w formacie `ErrorResponseDto` (zgodnie z planem API).

---

## 8. Rozważania dotyczące wydajności

- **Limit wywołań:** Rate limiting zmniejsza obciążenie zewnętrznego API i koszty; warto skonfigurować rozsądny limit (np. 5–10 żądań na użytkownika na minutę).  
- **Timeout LLM:** Ustawić timeout na wywołanie zewnętrznego API (np. 30–60 s), żeby nie blokować wątku na długo.  
- **Asynchroniczność:** Wywołanie LLM i ewentualny zapis do `generation_error_logs` wykonywać asynchronicznie; nie blokować odpowiedzi 200 na żadne dodatkowe zapisy.  
- **Rozmiar payloadu:** Ograniczenie długości `text` (10 000 znaków) ogranicza rozmiar żądania i czas przetwarzania po stronie LLM.

---

## 9. Etapy wdrożenia

1. **Zależności:** Upewnić się, że w projekcie jest Zod (używany do walidacji w API). W razie braku: `npm install zod`.  
2. **Serwis LLM:** Dodać moduł w `src/lib/services` (np. `flashcardGenerate.ts` lub `llm.ts`) z funkcją przyjmującą zwalidowany `text: string` i opcjonalnie konfigurację (model, timeout). Wewnątrz: wywołanie zewnętrznego API LLM (np. OpenRouter), parsowanie odpowiedzi do tablicy `{ front, back }[]`, obsługa błędów i timeoutu. Użyć `import.meta.env` dla URL i klucza API. Nie zapisywać nic do bazy w tym serwisie.  
3. **Schema Zod:** W pliku z walidacją (np. `src/lib/schemas/flashcards.ts` lub obok serwisu) zdefiniować schemat dla body: `z.object({ text: z.string().transform(t => t.trim()).refine(len => len.length >= 1000 && len.length <= 10000, { message: '...' }) })`. Eksportować typ inferowany dla użycia w handlerze.  
4. **Helper odpowiedzi błędów:** W `src/lib` (np. `api-utils.ts` lub `responses.ts`) dodać funkcje pomocnicze zwracające odpowiedź z odpowiednim statusem i body `ErrorResponseDto` (400, 401, 429, 502/503, 500) oraz opcjonalnie funkcję zwracającą 200 z JSON.  
5. **Rate limiting:** Zaimplementować prosty rate limit (np. w pamięci lub Redis) sprawdzany na początku handlera: klucz po `user_id`, okno czasowe (np. 1 minuta), maks. liczba żądań. Przy przekroczeniu zwrócić 429 przy użyciu helpera z pkt 4.  
6. **Endpoint:** Utworzyć plik `src/pages/api/flashcards/generate.ts`. Na górze: `export const prerender = false`. Eksportować `export async function POST(context)` (Astro Server Endpoint). W handlerze: (a) pobrać użytkownika z `context.locals.supabase.auth.getUser()` (lub równoważnie), brak użytkownika → 401; (b) sprawdzić rate limit → 429; (c) sparsować body (np. `await context.request.json()`), Zod parse → przy błędzie 400; (d) wywołać serwis LLM z pkt 2; (e) przy sukcesie zwrócić `new Response(JSON.stringify({ proposals }), { status: 200, headers: { 'Content-Type': 'application/json' } })`; (f) przy błędzie LLM opcjonalnie zbudować obiekt zgodny z `CreateGenerationErrorLogCommand` (hash tekstu np. SHA-256, długość, model, error_code, error_message) i wstawić wpis do `generation_error_logs` przez `context.locals.supabase` (lub service role, jeśli log ma być zawsze zapisywany); zwrócić 502/503.  
7. **Logowanie błędów LLM:** W miejscu obsługi błędu z serwisu LLM: obliczyć `source_text_hash` (np. crypto.subtle lub biblioteka) i `source_text_length` z wejściowego tekstu; uzupełnić `model`, `error_code`, `error_message`; wstawić do `generation_error_logs` z `user_id` z JWT. Upewnić się, że typ wpisu spełnia `CreateGenerationErrorLogCommand` + pola ustawiane po stronie serwera.  
8. **Testy:** Dodać testy (jednostkowe lub integracyjne) dla: walidacji Zod (za krótki/długi tekst, brak text); zwracania 401 bez tokena; zwracania 429 przy przekroczeniu limitu; mockowania serwisu LLM — sukces zwraca 200 i listę propozycji; błąd LLM zwraca 502/503 i opcjonalnie sprawdzić zapis w `generation_error_logs`.  
9. **Dokumentacja:** W README lub dokumentacji API opisać endpoint POST /api/flashcards/generate (cel, body, odpowiedzi, rate limiting, wymaganie uwierzytelnienia).

Po realizacji powyższych kroków endpoint jest gotowy do użycia przez frontend; zapis zatwierdzonych fiszek i sesji generowania pozostaje w **POST /api/flashcards** i **POST /api/generations**.

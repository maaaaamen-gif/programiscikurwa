# Szpontownia — wspólne notatki zawodowe

Lekka aplikacja dla grupy uczącej się zawodu. Każdy może przeglądać i dodawać notatki bez konta. Tylko administrator loguje się, aby usuwać wpisy. Zdjęcia są czytane po polsku lokalnie w przeglądarce, a generator kodu korzysta z Gemini przez prywatny endpoint serwera.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Bez `.env` działa lokalny podgląd z przykładowymi notatkami. Są one zapisywane tylko w pamięci przeglądarki, nie są współdzielone. Serwer API uruchom osobno przez `npm run server`; Vite przekazuje do niego wywołania generatora. OCR potrzebuje pobrać model języka polskiego przy pierwszym użyciu.

## Wspólna tablica i pliki

1. Utwórz projekt w Supabase i skopiuj URL projektu oraz klucz `anon`/publishable do `.env` jako `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`.
2. W panelu Supabase otwórz SQL Editor i wykonaj cały plik `supabase/schema.sql`.
3. W Supabase otwórz Authentication → Users → Add user i utwórz swoje konto administratora.
4. W SQL Editor wykonaj zapytanie z końca pliku `supabase/schema.sql`, wpisując e-mail tego konta. Rejestracja publiczna nie jest potrzebna.

W Supabase ustaw adres aplikacji w Authentication → URL Configuration. Bucket `note-files` ogranicza pliki do 20 MB. Wspólna tablica i załączniki są publicznie dostępne; każdy może dodawać treści i pliki, ale tylko administrator może je usuwać. Udostępniaj adres z rozwagą, bo publiczny dostęp może przyciągać spam.

## Generator kodu

Utwórz klucz w Google AI Studio i ustaw `GEMINI_API_KEY` w `.env`, a jako zapasowy dostawca opcjonalnie utwórz klucz w [GroqCloud](https://console.groq.com/keys) i ustaw `GROQ_API_KEY`. Klucze pozostają po stronie serwera. Gdy Gemini jest przeciążone lub niedostępne, generator automatycznie spróbuje Groq; jeśli skonfigurowano tylko `GROQ_API_KEY`, kod będzie generowany przez Groq. Obaj dostawcy mają własne limity i nie gwarantują ciągłej dostępności. Generator kodu zwraca kod i wyjaśnienie osobno oraz pozwala skopiować lub pobrać plik z kodem (domyślnie HTML). Dostępny jest też format MySQL (`.sql`). Przy chwilowym przeciążeniu generator Gemini ponawia próbę, a następnie przełącza się na Gemini Flash-Lite przed użyciem Groq. Można dołączyć plik tekstowy jako kontekst, w tym eksport bazy `.sql` (maksymalnie 750 KB); obsługiwane są również TXT, CSV, JSON, XML, Markdown i YAML. Każdy może opcjonalnie przekazać notatki jako kontekst. Style są domyślnie wyłączone i można je włączyć osobnym przełącznikiem. Filtrowanie tekstu OCR przez Gemini korzysta z `GEMINI_API_KEY`. OCR rozpoznaje zdjęcie lokalnie, ale jego tekst jest wysyłany do Gemini do filtrowania; gotowy wynik można skopiować przyciskiem albo edytować, a gdy klucz lub usługa są niedostępne, aplikacja zachowuje surowy wynik OCR do ręcznej edycji. Darmowe limity Gemini mogą się zmieniać.

## Wdrożenie na Render

Plik `render.yaml` opisuje pojedynczą usługę Node, która serwuje aplikację i API. Nazwa usługi w tym pliku to `szpontownia`; Render używa jej przy tworzeniu usługi i przypisywaniu domyślnej subdomeny `onrender.com`. Docelowy adres strony to `https://szpontownia.onrender.com/`. Po połączeniu repozytorium z Render dodaj wartości `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY` oraz, jeśli używasz zapasowego dostawcy, `GROQ_API_KEY` w ustawieniach usługi i wdroż ją ponownie. Dla już istniejącej usługi dodaj `GROQ_API_KEY` w Environment, aby aktywować zapasowy generator. Sprawdź adres w Settings → Custom Domains — zmiana `render.yaml` sama nie gwarantuje zmiany już przypisanej subdomeny.

W Supabase otwórz Authentication → URL Configuration, ustaw Site URL na `https://szpontownia.onrender.com` i dodaj `https://szpontownia.onrender.com/**` do Redirect URLs. Aplikacja korzysta z API pod ścieżkami względnymi (`/api/...`), więc nie wymaga osobnego adresu API ani zmiany CORS przy zmianie domeny.

Plan bezpłatny Render może usypiać usługę po okresie bez ruchu, więc pierwsze otwarcie po przerwie może chwilę potrwać. Limity darmowej bazy, storage i API zależą od aktualnych planów dostawców; OCR działa na urządzeniu użytkownika.
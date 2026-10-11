# Pracownia — wspólne notatki zawodowe

Lekka aplikacja dla grupy uczącej się zawodu. Wszyscy mogą dodawać notatki, a autorzy i administrator mogą usuwać wpisy. Zdjęcia są czytane po polsku lokalnie w przeglądarce, a generator kodu korzysta z Gemini przez prywatny endpoint serwera.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Bez `.env` działa lokalny podgląd z przykładowymi notatkami. Są one zapisywane tylko w pamięci przeglądarki, nie są współdzielone. Serwer API uruchom osobno przez `npm run server`; Vite przekazuje do niego wywołania generatora. OCR potrzebuje pobrać model języka polskiego przy pierwszym użyciu.

## Wspólna tablica i pliki

1. Utwórz projekt w Supabase i skopiuj URL projektu oraz klucz `anon`/publishable do `.env` jako `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`.
2. W panelu Supabase otwórz SQL Editor i wykonaj cały plik `supabase/schema.sql`.
3. Uruchom aplikację ponownie, załóż konto i potwierdź adres e-mail, jeśli projekt wymaga potwierdzenia.
4. Aby nadać sobie uprawnienia administratora, w SQL Editor wykonaj zapytanie z końca pliku `supabase/schema.sql`, podając e-mail konta. Samodzielna zmiana uprawnień administratora przez użytkowników jest zablokowana.

W Supabase ustaw poprawny adres aplikacji w Authentication → URL Configuration. Prywatny bucket `note-files` ogranicza pliki do 20 MB. Załączniki są dostępne dla zalogowanych członków grupy.

## Generator kodu

Utwórz klucz w Google AI Studio i ustaw `GEMINI_API_KEY` w `.env`, a następnie uruchom serwer przez `npm run server`. Klucz pozostaje po stronie serwera. Bez niego generator pokaże status konfiguracji i nie wyśle żądania do modelu. Darmowe limity Gemini mogą się zmieniać.

## Wdrożenie na Render

Plik `render.yaml` opisuje pojedynczą usługę Node, która serwuje aplikację i API. Po połączeniu repozytorium z Render dodaj wartości `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` oraz `GEMINI_API_KEY` w ustawieniach usługi i wdroż ją ponownie. W Supabase dopisz adres Render do dozwolonych adresów logowania.

Plan bezpłatny Render może usypiać usługę po okresie bez ruchu, więc pierwsze otwarcie po przerwie może chwilę potrwać. Limity darmowej bazy, storage i API zależą od aktualnych planów dostawców; OCR działa na urządzeniu użytkownika.
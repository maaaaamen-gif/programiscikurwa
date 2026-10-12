import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronDown, Database,
  Code2, Copy, Download, FileImage, FileText, FolderOpen, KeyRound, LoaderCircle, LogIn,
  LogOut, Menu, MoreHorizontal, Plus, ScanText, Search, ShieldCheck, Sparkles,
  Trash2, Upload, X,
} from 'lucide-react';
import { cleanOcrPage } from './lib/ocr.js';
import { hasSupabaseConfig, supabase } from './lib/supabase.js';

const NOTE_FOLDERS = [
  { id: 'database', label: 'Bazy danych', subject: 'Bazy danych', icon: Database },
  { id: 'websites', label: 'Aplikacje / strony internetowe', subject: 'Aplikacje / strony internetowe', icon: Code2 },
];

const demoNotes = [
  {
    id: 'demo-1', title: 'Pomiar napięcia w obwodzie', subject: 'Elektrotechnika',
    content: 'Przed pomiarem napięcia woltomierz podłączamy równolegle do badanego elementu.\n\nZakres miernika dobieramy wyższy niż spodziewana wartość. W obwodach prądu stałego pilnujemy polaryzacji przewodów.',
    author_name: 'Maja K.', author_id: 'sample', created_at: '2026-10-09T09:20:00.000Z', attachments: [],
  },
  {
    id: 'demo-2', title: 'Podstawy pomiaru suwmiarką', subject: 'Podstawy konstrukcji maszyn',
    content: 'Oczyść powierzchnie pomiarowe i sprawdź, czy przy zamkniętych szczękach skala pokazuje zero.\n\nWynik odczytujemy z podziałki głównej oraz noniusza. Dokładność typowej suwmiarki: 0,1 mm.',
    author_name: 'Kacper', author_id: 'sample', created_at: '2026-10-08T12:10:00.000Z', attachments: [],
  },
  {
    id: 'demo-3', title: 'Adresacja IPv4 — szybka ściąga', subject: 'Sieci komputerowe',
    content: 'Adres IPv4 składa się z 32 bitów zapisanych w czterech oktetach. Maska podsieci wskazuje, która część adresu opisuje sieć.\n\nPrzykład: 192.168.1.10/24 oznacza sieć 192.168.1.0 i hosta o adresie 192.168.1.10.',
    author_name: 'Ola', author_id: 'sample', created_at: '2026-10-07T08:35:00.000Z', attachments: [],
  },
];

const readLocalNotes = () => {
  try {
    const stored = localStorage.getItem('szpontownia-notes') ?? localStorage.getItem('pracownia-notes');
    return stored ? JSON.parse(stored) : demoNotes;
  } catch {
    return demoNotes;
  }
};

const timeLabel = (value) => new Intl.DateTimeFormat('pl-PL', {
  hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

const dateGroupKey = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const dateGroupLabel = (value) => new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date(value));

const noteFolderId = (note) => {
  const subject = (note.subject || '').toLocaleLowerCase('pl-PL');
  if (subject.includes('bazy danych')) return 'database';
  if (subject.includes('aplikac') || subject.includes('stron internet')) return 'websites';
  return /\b(sql|mysql|postgres(?:ql)?|sqlite|mongodb|supabase|database|baz[ay] danych|tabela|zapytanie)\b/i
    .test(`${note.title} ${note.content}`)
    ? 'database'
    : 'websites';
};

function AuthDialog({ onClose, onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!supabase) {
      setError('Logowanie administratora wymaga konfiguracji Supabase.');
      return;
    }
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      onSignedIn();
    } catch (authError) {
      setError(authError.message || 'Nie udało się zalogować.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Zamknij"><X size={18} /></button>
        <div className="dialog-mark"><KeyRound size={19} /></div>
        <span className="eyebrow">DOSTĘP ADMINISTRATORA</span>
        <h2 id="auth-title">Panel administratora</h2>
        <p className="dialog-copy">Logowanie jest potrzebne tylko do usuwania wpisów. Notatki możesz przeglądać i dodawać bez konta.</p>
        <p className="dialog-copy">WŁASNOŚĆ SZEREGOWY LEONIDAS</p>
        {!hasSupabaseConfig ? (
          <div className="inline-message"><AlertCircle size={17} /><span>Tryb podglądu działa lokalnie. Logowanie włączysz po konfiguracji Supabase opisanej w README.</span></div>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            <label>Adres e-mail<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ty@szkola.pl" /></label>
            <label>Hasło<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Hasło administratora" /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="button button-primary full-button" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}
              Zaloguj się
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function NoteDialog({ draft, setDraft, onClose, onSave, saving, canUpload }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog note-dialog" role="dialog" aria-modal="true" aria-labelledby="note-dialog-title">
        <div className="dialog-heading">
          <div><span className="eyebrow">Wspólna baza wiedzy</span><h2 id="note-dialog-title">Nowa notatka</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Zamknij"><X size={18} /></button>
        </div>
        <form className="form-stack" onSubmit={onSave}>
          <label>Tytuł<input required autoFocus maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Na przykład: Formularz logowania w HTML" /></label>
          <label>Folder<select value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })}>{NOTE_FOLDERS.map((folder) => <option key={folder.id} value={folder.subject}>{folder.label}</option>)}</select></label>
          <label>Kod lub treść<textarea required rows={12} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder="Wklej kod lub wpisz treść notatki..." /></label>
          <label className={`file-picker ${!canUpload ? 'file-picker-disabled' : ''}`}>
            <Upload size={17} /><span><strong>Dołącz pliki</strong><small>{canUpload ? 'Zdjęcia, PDF i dokumenty do 20 MB' : 'Dostępne po podłączeniu bazy danych'}</small></span>
            <input type="file" multiple disabled={!canUpload} onChange={(event) => setDraft({ ...draft, files: [...draft.files, ...Array.from(event.target.files || [])] })} />
          </label>
          {draft.files.length > 0 && <div className="selected-files">{draft.files.map((file, index) => <span className="selected-file" key={`${file.name}-${index}`}><FileText size={14} />{file.name}<button type="button" aria-label={`Usuń ${file.name}`} onClick={() => setDraft({ ...draft, files: draft.files.filter((_, fileIndex) => fileIndex !== index) })}><X size={13} /></button></span>)}</div>}
          <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Anuluj</button><button className="button button-primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}Dodaj notatkę</button></div>
        </form>
      </section>
    </div>
  );
}

function NotesPage({ notes, search, setSearch, onNew, onDelete, onAttachment, canDelete, loading }) {
  const [copyStatus, setCopyStatus] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('websites');
  const visibleNotes = useMemo(() => notes.filter((note) => {
    const query = search.trim().toLowerCase();
    return noteFolderId(note) === selectedFolder
      && (!query || `${note.title} ${note.content} ${note.subject || ''}`.toLowerCase().includes(query));
  }), [notes, search, selectedFolder]);
  const dateGroups = useMemo(() => {
    const groups = new Map();
    visibleNotes.forEach((note) => {
      const key = dateGroupKey(note.created_at);
      if (!groups.has(key)) groups.set(key, { date: note.created_at, notes: [] });
      groups.get(key).notes.push(note);
    });
    return Array.from(groups.values());
  }, [visibleNotes]);

  const copyNoteContent = async (note) => {
    try {
      await navigator.clipboard.writeText(note.content);
      setCopyStatus({ id: note.id, message: 'Treść skopiowana.' });
    } catch {
      setCopyStatus({ id: note.id, message: 'Nie udało się skopiować treści.' });
    }
  };

  return (
    <>
      <section className="page-intro">
        <div><span className="eyebrow">NOTATNIK / {new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(new Date()).toUpperCase()}</span><h1>Wiedza krąży.<br /><span>Notatki zostają.</span></h1><p>Jedno miejsce na to, czego uczymy się na zawodowych.</p></div>
        <button className="button button-primary new-note-button" onClick={onNew}><Plus size={18} />Dodaj notatkę</button>
        <div className="intro-stamp"><BookOpen size={20} /><span>{notes.length.toString().padStart(2, '0')}<small>notatek</small></span></div>
      </section>
      <section className="notes-section">
        <div className="section-toolbar">
          <div><span className="eyebrow">TABLICA GRUPY</span><h2>{NOTE_FOLDERS.find((folder) => folder.id === selectedFolder).label} <span className="count-badge">{visibleNotes.length}</span></h2></div>
          <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Szukaj w notatkach" /><kbd>⌘ K</kbd></label>
        </div>
        <div className="note-folders" aria-label="Foldery notatek">
          {NOTE_FOLDERS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`note-folder ${selectedFolder === id ? 'note-folder-active' : ''}`} aria-pressed={selectedFolder === id} onClick={() => setSelectedFolder(id)}>
              <Icon size={18} /><span>{label}</span><span className="folder-count">{notes.filter((note) => noteFolderId(note) === id).length}</span>
            </button>
          ))}
        </div>
        {loading ? <div className="empty-state"><LoaderCircle className="spin" size={23} /><p>Ładuję notatki...</p></div> : visibleNotes.length === 0 ? (
          <div className="empty-state"><FolderOpen size={26} /><strong>Ten folder jest pusty.</strong><p>Dodaj notatkę albo zmień kryteria wyszukiwania.</p><button className="text-button" onClick={() => onNew(NOTE_FOLDERS.find((folder) => folder.id === selectedFolder).subject)}>Dodaj notatkę <ArrowRight size={15} /></button></div>
        ) : (
          <div className="note-groups">{dateGroups.map((group) => <section className="date-group" key={dateGroupKey(group.date)}>
            <h3 className="date-group-heading">{dateGroupLabel(group.date)}</h3>
            <div className="notes-list">{group.notes.map((note, index) => <article className="note-row" key={note.id}>
              <span className={`note-index tone-${index % 4}`}>{String(index + 1).padStart(2, '0')}</span>
              <div className="note-main"><div className="note-meta"><span className="note-date">{timeLabel(note.created_at)}</span><button className="copy-note-button" disabled={!note.content} onClick={() => copyNoteContent(note)}><Copy size={13} />{copyStatus?.id === note.id && copyStatus.message === 'Treść skopiowana.' ? 'Skopiowano' : 'Kopiuj treść'}</button></div><h3>{note.title}</h3><p>{note.content}</p>
                {copyStatus?.id === note.id && <span className="copy-note-status" role="status">{copyStatus.message}</span>}
                {note.attachments?.length > 0 && <div className="attachment-list">{note.attachments.map((file) => <button key={file.path} className="attachment-link" onClick={() => onAttachment(file)}><FileText size={14} />{file.name}<ArrowDownToLine size={13} /></button>)}</div>}
              </div>
              {canDelete(note) && <button className="icon-button delete-button" onClick={() => onDelete(note)} aria-label={`Usuń notatkę: ${note.title}`} title="Usuń notatkę"><Trash2 size={16} /></button>}
            </article>)}</div>
          </section>)}</div>
        )}
      </section>
    </>
  );
}

function OcrPage({ onUseText }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [text, setText] = useState('');
  const [copyNotice, setCopyNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [filterNotice, setFilterNotice] = useState('');
  const [ignoredChrome, setIgnoredChrome] = useState([]);

  useEffect(() => {
    if (!image) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const readImage = async (file) => {
    if (!file) return;
    setImage(file);
    setText('');
    setCopyNotice('');
    setFilterNotice('');
    setIgnoredChrome([]);
    setError('');
    setProgress('Pobieram polski model rozpoznawania...');
    setBusy(true);
    let worker;
    try {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('pol', 1, { logger: (event) => event.status === 'recognizing text' && setProgress(`Rozpoznaję tekst: ${Math.round(event.progress * 100)}%`) });
      const result = await worker.recognize(file);
      const bitmap = await createImageBitmap(file);
      const cleaned = cleanOcrPage(result.data, bitmap.height);
      bitmap.close();
      setText(cleaned.text);
      setIgnoredChrome(cleaned.ignoredChrome);
      if (cleaned.text) {
        setProgress('Sprawdzam rozpoznany tekst przez Gemini...');
        try {
          const response = await fetch('/api/filter-ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleaned.text }),
          });
          const filteredResult = await response.json();
          if (!response.ok) throw new Error(filteredResult.error || 'Filtrowanie przez Gemini jest niedostępne.');
          if (typeof filteredResult.text !== 'string' || !filteredResult.text.trim()) {
            throw new Error('Gemini zwróciło pusty tekst. Możesz użyć surowego wyniku OCR.');
          }
          setText(filteredResult.text.trim());
          setProgress('Gotowe. Sprawdź tekst przed zapisaniem.');
        } catch (filterError) {
          setFilterNotice(filterError.message || 'Filtrowanie przez Gemini jest niedostępne. Pokazuję surowy wynik OCR.');
          setProgress('Pokazuję surowy wynik OCR. Sprawdź go przed zapisaniem.');
        }
      } else {
        setProgress('Nie udało się rozpoznać tekstu na zdjęciu.');
      }
    } catch {
      setError('Nie udało się odczytać zdjęcia. Spróbuj z wyraźniejszym obrazem.');
      setProgress('');
    } finally {
      await worker?.terminate();
      setBusy(false);
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice('Tekst skopiowany.');
    } catch {
      setCopyNotice('Nie udało się skopiować tekstu.');
    }
  };

  return (
    <>
      <section className="tool-heading"><span className="eyebrow">CZYTANIE ZE ZDJĘĆ</span><h1>Zdjęcie wchodzi.<br /><span>Tekst wychodzi.</span></h1><p>OCR odczytuje tekst w przeglądarce, a Gemini pomaga pominąć elementy interfejsu. Wynik możesz poprawić przed zapisaniem.</p></section>
      <section className="ocr-workspace">
        <div className="ocr-left"><label className={`upload-zone ${preview ? 'has-preview' : ''}`}>
          {preview ? <img src={preview} alt="Wybrane zdjęcie do odczytu" /> : <><span className="upload-icon"><ScanText size={24} /></span><strong>Wybierz zdjęcie notatek</strong><span>JPG, PNG lub WEBP</span><span className="button button-quiet"><Upload size={16} />Wybierz plik</span></>}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => readImage(event.target.files?.[0])} />
        </label><p className="privacy-note"><ShieldCheck size={15} />Zdjęcie zostaje na urządzeniu; rozpoznany tekst jest wysyłany do Gemini w celu filtrowania.</p></div>
        <div className="ocr-result"><div className="result-heading"><div><span className="eyebrow">WYNIK OCR</span><h2>Rozpoznany tekst</h2></div>{text && <button type="button" className="button button-quiet button-small" onClick={copyText}><Copy size={14} />Kopiuj tekst</button>}</div>
          {busy ? <div className="ocr-progress"><LoaderCircle size={19} className="spin" /><span>{progress}</span></div> : error ? <p className="form-error">{error}</p> : <textarea aria-label="Rozpoznany tekst, możesz go edytować" value={text} onChange={(event) => { setText(event.target.value); setCopyNotice(''); }} placeholder="Rozpoznany tekst pojawi się tutaj. Możesz go poprawić przed zapisaniem." />}
          {!busy && copyNotice && <p className={`copy-status ${copyNotice.startsWith('Nie') ? 'copy-status-error' : ''}`} role="status">{copyNotice}</p>}
          {!busy && filterNotice && <p className="form-error">{filterNotice}</p>}
          {!busy && ignoredChrome.length > 0 && <p className="progress-caption"><Check size={14} />Pominięto nazwę programu: {ignoredChrome.join(', ')}</p>}
          {!busy && progress && !error && <p className="progress-caption"><Check size={14} />{progress}</p>}
          <div className="result-actions"><button className="button button-primary" disabled={!text || busy} onClick={() => onUseText(text)}><Plus size={16} />Zapisz jako notatkę</button></div>
        </div>
      </section>
    </>
  );
}

function CodePage({ onUseCode }) {
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [explanation, setExplanation] = useState('');
  const [lessonNotes, setLessonNotes] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [readingAttachment, setReadingAttachment] = useState(false);
  const [fileExtension, setFileExtension] = useState('html');
  const [includeStyles, setIncludeStyles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copyNotice, setCopyNotice] = useState('');
  const [generatorReady, setGeneratorReady] = useState(null);

  useEffect(() => {
    fetch('/api/health').then((response) => response.json()).then((health) => setGeneratorReady(health.generatorConfigured)).catch(() => setGeneratorReady(false));
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyNotice('Kod skopiowany.');
    } catch {
      setCopyNotice('Nie udało się skopiować kodu.');
    }
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `szpontownia-kod.${fileExtension === 'mysql' ? 'sql' : fileExtension}`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const readAttachment = async (file) => {
    setAttachmentError('');
    if (!file) return;
    setAttachment(null);
    if (!/\.(sql|txt|csv|json|xml|md|ya?ml)$/i.test(file.name)) {
      setAttachmentError('Dołącz plik tekstowy, np. eksport .sql, .csv lub .json.');
      return;
    }
    if (file.size > 750 * 1024) {
      setAttachmentError('Plik nie może przekraczać 750 KB.');
      return;
    }
    setReadingAttachment(true);
    try {
      const content = await file.text();
      if (!content.trim()) throw new Error('Plik jest pusty.');
      setAttachment({ name: file.name, content });
    } catch (fileError) {
      setAttachmentError(fileError.message || 'Nie udało się odczytać pliku.');
      setAttachment(null);
    } finally {
      setReadingAttachment(false);
    }
  };

  const generate = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setCopyNotice('');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, lessonNotes, includeStyles, fileExtension, attachment }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nie udało się wygenerować kodu.');
      setCode(result.code);
      setExplanation(result.explanation);
    } catch (generationError) {
      setError(generationError.message || 'Serwer generatora jest niedostępny.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="tool-heading"><span className="eyebrow">POMOCNIK PROGRAMISTY</span><h1>Pomysł wchodzi.<br /><span>Kod wychodzi.</span></h1><p>Opisz zadanie prostymi słowami, a Gemini przygotuje czysty kod i osobne wyjaśnienie.</p></section>
      <section className="code-workspace"><form className="prompt-panel" onSubmit={generate}>
        <div className="result-heading"><div><span className="eyebrow">TWOJE POLECENIE</span><h2>Co mamy napisać?</h2></div><span className={`service-status ${generatorReady ? 'is-ready' : ''}`}><span />{generatorReady === null ? 'Sprawdzam' : generatorReady ? 'Generator aktywny' : 'Brak klucza API'}</span></div>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={10000} rows={7} placeholder="Np. Napisz stronę, która przelicza temperaturę ze stopni Celsjusza na Fahrenheita." />
        <label className="format-picker">Format pobieranego pliku
          <select value={fileExtension} onChange={(event) => setFileExtension(event.target.value)}>
            <option value="html">HTML (.html) — format domyślny</option><option value="js">JavaScript (.js)</option><option value="css">CSS (.css)</option><option value="mysql">MySQL (.sql)</option><option value="txt">Tekst (.txt)</option>
          </select>
        </label>
        <label className={`style-toggle ${includeStyles ? 'style-toggle-on' : ''}`}>
          <input type="checkbox" checked={includeStyles} onChange={(event) => setIncludeStyles(event.target.checked)} />
          <span className="style-toggle-copy"><strong>Style: {includeStyles ? 'włączone' : 'wyłączone'}</strong><small>{includeStyles ? 'Generator doda style zgodne z poleceniem lub dobierze je sam.' : 'Generator nie doda stylów. Włącz je, aby poprosić o wygląd zgodny z poleceniem.'}</small></span>
        </label>
        <label className="generator-context">Notatki dodatkowe (opcjonalnie)
          <textarea value={lessonNotes} onChange={(event) => setLessonNotes(event.target.value)} maxLength={12000} rows={5} placeholder="Wklej notatki lub przykładowy styl kodu. Generator wykorzysta je jako kontekst." />
          <small>{lessonNotes.length} / 12 000 znaków. Notatki zostaną wysłane do Gemini razem z poleceniem.</small>
        </label>
        <div className="generator-context">
          <span>Plik referencyjny (opcjonalnie)</span>
          <div className="generator-file-row">
            <label className="generator-file-picker"><Upload size={15} />{readingAttachment ? 'Odczytuję plik...' : attachment?.name || 'Wybierz plik'}<input type="file" accept=".sql,.txt,.csv,.json,.xml,.md,.yaml,.yml" disabled={busy || readingAttachment} onChange={(event) => { readAttachment(event.target.files?.[0]); event.target.value = ''; }} /></label>
            {attachment && <button type="button" className="icon-button" aria-label="Usuń załącznik" title="Usuń załącznik" onClick={() => { setAttachment(null); setAttachmentError(''); }}><X size={16} /></button>}
          </div>
          <small>Pliki tekstowe do 750 KB, np. eksport bazy .sql. Zawartość zostanie wysłana do Gemini jako kontekst.</small>
        </div>
        {attachmentError && <p className="form-error"><AlertCircle size={15} />{attachmentError}</p>}
        <div className="prompt-footer"><small>{prompt.length} / 10 000</small><button className="button button-dark" disabled={!prompt.trim() || busy || readingAttachment}>{busy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}{busy ? 'Piszę kod...' : 'Generuj kod'}</button></div>
        {error && <p className="form-error"><AlertCircle size={15} />{error}</p>}
      </form>
        <div className="code-output"><div className="result-heading"><div><span className="eyebrow">REZULTAT</span><h2>Kod i wyjaśnienie</h2></div></div>
          {code ? <div className="generated-result">
            <section className="generated-code"><div className="generated-section-heading"><h3>Czysty kod</h3><div className="generated-actions"><button className="button button-quiet button-small" onClick={copyCode}><Copy size={14} />Kopiuj</button><button className="button button-quiet button-small" onClick={downloadCode}><Download size={14} />Pobierz .{fileExtension}</button></div></div><pre><code>{code}</code></pre></section>
            <section className="generated-explanation"><h3>Wyjaśnienie</h3><p>{explanation}</p></section>
            <button className="button button-primary" onClick={() => onUseCode(code)}><Plus size={16} />Zapisz kod w notatkach</button>
            {copyNotice && <p className="progress-caption" role="status">{copyNotice}</p>}
          </div> : <div className="code-empty"><Code2 size={23} /><p>Wygenerowany kod i wyjaśnienie pojawią się tutaj.</p></div>}
        </div>
      </section>
      <p className="tool-disclaimer"><AlertCircle size={15} />Wygenerowany kod sprawdź przed użyciem. Dostępność bezpłatnego API zależy od limitów Google AI Studio.</p>
    </>
  );
}

export default function App() {
  const [page, setPage] = useState('notes');
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState(() => hasSupabaseConfig ? [] : readLocalNotes());
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [authOpen, setAuthOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ title: '', content: '', subject: NOTE_FOLDERS[1].subject, files: [] });
  const [notice, setNotice] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) {
      localStorage.setItem('szpontownia-notes', JSON.stringify(notes));
    }
  }, [notes]);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    setLoading(true);
    Promise.all([
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
      user
        ? supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]).then(([notesResult, adminResult]) => {
      if (!active) return;
      if (notesResult.error) setNotice(`Nie udało się pobrać notatek: ${notesResult.error.message}`);
      else setNotes(notesResult.data || []);
      setIsAdmin(Boolean(adminResult.data));
      setLoading(false);
    }).catch(() => { if (active) { setNotice('Nie udało się połączyć z bazą danych.'); setLoading(false); } });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 5200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const handleKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPage('notes');
        document.querySelector('.search-box input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const openComposer = (content = '', subject = NOTE_FOLDERS[1].subject) => {
    setDraft({ title: '', content, subject, files: [] });
    setComposerOpen(true);
  };

  const saveNote = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      let attachments = [];
      if (supabase && draft.files.length) {
        for (const file of draft.files) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filePath = `shared/${crypto.randomUUID()}-${safeName}`;
          const { error: uploadError } = await supabase.storage.from('note-files').upload(filePath, file, { contentType: file.type || 'application/octet-stream' });
          if (uploadError) throw uploadError;
          attachments.push({ name: file.name, path: filePath, size: file.size, type: file.type });
        }
      }
      const payload = {
        title: draft.title.trim(), content: draft.content.trim(), subject: draft.subject, attachments,
      };
      if (supabase) {
        const { data, error: insertError } = await supabase.from('notes').insert({ ...payload, author_id: user?.id || null }).select().single();
        if (insertError) throw insertError;
        setNotes((current) => [data, ...current]);
      } else {
        setNotes((current) => [{ ...payload, id: crypto.randomUUID(), author_id: 'local-user', created_at: new Date().toISOString() }, ...current]);
      }
      setComposerOpen(false);
      setNotice('Notatka dodana do tablicy.');
    } catch (saveError) {
      setNotice(saveError.message || 'Nie udało się zapisać notatki.');
    } finally {
      setSaving(false);
    }
  };

  const canDelete = () => !supabase || isAdmin;

  const deleteNote = async (note) => {
    if (!window.confirm(`Usunąć notatkę „${note.title}”?`)) return;
    if (supabase) {
      const paths = (note.attachments || []).map((file) => file.path).filter(Boolean);
      if (paths.length) await supabase.storage.from('note-files').remove(paths);
      const { error: deleteError } = await supabase.from('notes').delete().eq('id', note.id);
      if (deleteError) { setNotice(deleteError.message); return; }
    }
    setNotes((current) => current.filter((item) => item.id !== note.id));
    setNotice('Notatka usunięta.');
  };

  const openAttachment = async (file) => {
    if (!supabase) return;
    const { data, error: urlError } = await supabase.storage.from('note-files').createSignedUrl(file.path, 60);
    if (urlError) { setNotice(urlError.message); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setNotice(error.message);
    else setNotice('Wylogowano.');
  };

  const navItems = [
    { id: 'notes', label: 'Notatnik', icon: BookOpen },
    { id: 'ocr', label: 'Czytaj ze zdjęcia', icon: ScanText },
    { id: 'code', label: 'Generator kodu', icon: Code2 },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <button className="brand" onClick={() => { setPage('notes'); setMobileNavOpen(false); }}><span className="brand-mark"><BookOpen size={20} /></span><span>szpontownia<span className="brand-dot">.</span><small>NOTATKI ZAWODOWE</small></span></button>
        <div className="side-label">TWOJE MIEJSCE</div>
        <nav aria-label="Nawigacja główna">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link ${page === id ? 'nav-active' : ''}`} onClick={() => { setPage(id); setMobileNavOpen(false); }}><Icon size={18} /><span>{label}</span>{id === 'notes' && <span className="nav-count">{notes.length}</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="side-rule" /><div className="workspace-label"><span className="workspace-dot" /><div><strong>{hasSupabaseConfig ? 'Tablica grupy' : 'Lokalny podgląd'}</strong><small>{hasSupabaseConfig ? 'wspólna przestrzeń' : 'dane na tym urządzeniu'}</small></div><MoreHorizontal size={17} /></div>
          {isAdmin && <div className="admin-tag"><ShieldCheck size={14} />Administrator</div>}
          {user ? <button className="account-button" onClick={signOut}><span className="user-avatar">{(user.user_metadata?.display_name || user.email || 'U').slice(0, 1).toUpperCase()}</span><span className="account-copy"><strong>{user.user_metadata?.display_name || 'Administrator'}</strong><small>{user.email}</small></span><LogOut size={16} /></button> : <button className="account-button" onClick={() => setAuthOpen(true)}><span className="user-avatar guest-avatar"><LogIn size={15} /></span><span className="account-copy"><strong>Panel admina</strong><small>logowanie tylko do moderacji</small></span><ArrowRight size={15} /></button>}
        </div>
      </aside>
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Zamknij menu" onClick={() => setMobileNavOpen(false)} />}
      <main className="main-area">
        <header className="topbar"><button className="icon-button mobile-menu" aria-label="Otwórz menu" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button><div className="breadcrumb">Szpontownia <span>/</span> <strong>{navItems.find((item) => item.id === page)?.label}</strong></div><div className="topbar-right"><span className={`sync-status ${hasSupabaseConfig ? 'sync-live' : ''}`}><span />{hasSupabaseConfig ? 'Tablica publiczna' : 'Tryb lokalny'}</span>{!user && <button className="button button-small button-outline" onClick={() => setAuthOpen(true)}><ShieldCheck size={15} />Panel admina</button>}</div></header>
        <div className="content-wrap">
          {!hasSupabaseConfig && <div className="demo-banner"><span><Sparkles size={16} />Oglądasz przykładowe notatki. Skonfiguruj Supabase, żeby udostępniać własne wpisy całej grupie.</span><a href="README.md">Konfiguracja <ArrowRight size={14} /></a></div>}
          {page === 'notes' && <NotesPage notes={notes} search={search} setSearch={setSearch} onNew={(subject) => openComposer('', subject)} onDelete={deleteNote} onAttachment={openAttachment} canDelete={canDelete} loading={loading} />}
          {page === 'ocr' && <OcrPage onUseText={(text) => { openComposer(text); setPage('notes'); }} />}
          {page === 'code' && <CodePage onUseCode={(code) => { openComposer(code); setPage('notes'); }} />}
          <footer className="app-footer"><span>Szpontownia <b>·</b> wiedza, którą dzielimy się dalej</span><span>Ucz się po swojemu.</span></footer>
        </div>
      </main>
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} onSignedIn={() => setAuthOpen(false)} />}
      {composerOpen && <NoteDialog draft={draft} setDraft={setDraft} onClose={() => setComposerOpen(false)} onSave={saveNote} saving={saving} canUpload={Boolean(supabase)} />}
      {notice && <div className="toast" role="status"><Check size={17} />{notice}<button aria-label="Zamknij komunikat" onClick={() => setNotice('')}><X size={15} /></button></div>}
    </div>
  );
}
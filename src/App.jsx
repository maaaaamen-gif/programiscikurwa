import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronDown,
  Code2, FileImage, FileText, FolderOpen, KeyRound, LoaderCircle, LogIn,
  LogOut, Menu, MoreHorizontal, Plus, ScanText, Search, ShieldCheck, Sparkles,
  Trash2, Upload, X,
} from 'lucide-react';
import { hasSupabaseConfig, supabase } from './lib/supabase.js';

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

const dateLabel = (value) => new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric', month: 'short', year: 'numeric',
}).format(new Date(value));

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
          <label>Tytuł<input required autoFocus maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Na przykład: Rodzaje połączeń lutowanych" /></label>
          <label>Podpis (opcjonalnie)<input maxLength={60} value={draft.author_name} onChange={(event) => setDraft({ ...draft, author_name: event.target.value })} placeholder="Na przykład: Kacper" /></label>
          <label>Przedmiot<input list="subjects" maxLength={60} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="Wpisz przedmiot" /><datalist id="subjects"><option>Elektrotechnika</option><option>Sieci komputerowe</option><option>Podstawy konstrukcji maszyn</option><option>Programowanie</option></datalist></label>
          <label>Treść<textarea required rows={8} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder="Zapisz to, co warto zapamiętać..." /></label>
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
  const [subject, setSubject] = useState('Wszystkie');
  const subjects = useMemo(() => ['Wszystkie', ...new Set(notes.map((note) => note.subject).filter(Boolean))], [notes]);
  const visibleNotes = useMemo(() => notes.filter((note) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || `${note.title} ${note.content} ${note.subject} ${note.author_name}`.toLowerCase().includes(query);
    return matchesQuery && (subject === 'Wszystkie' || note.subject === subject);
  }), [notes, search, subject]);

  return (
    <>
      <section className="page-intro">
        <div><span className="eyebrow">NOTATNIK / {new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(new Date()).toUpperCase()}</span><h1>Wiedza krąży.<br /><span>Notatki zostają.</span></h1><p>Jedno miejsce na to, czego uczymy się na zawodowych.</p></div>
        <button className="button button-primary new-note-button" onClick={onNew}><Plus size={18} />Dodaj notatkę</button>
        <div className="intro-stamp"><BookOpen size={20} /><span>{notes.length.toString().padStart(2, '0')}<small>notatek</small></span></div>
      </section>
      <section className="notes-section">
        <div className="section-toolbar">
          <div><span className="eyebrow">TABLICA GRUPY</span><h2>Ostatnie notatki <span className="count-badge">{visibleNotes.length}</span></h2></div>
          <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Szukaj w notatkach" /><kbd>⌘ K</kbd></label>
        </div>
        <div className="subject-tabs" role="tablist" aria-label="Filtruj przedmiot">
          {subjects.map((item) => <button key={item} role="tab" aria-selected={subject === item} className={subject === item ? 'subject-tab active' : 'subject-tab'} onClick={() => setSubject(item)}>{item}</button>)}
        </div>
        {loading ? <div className="empty-state"><LoaderCircle className="spin" size={23} /><p>Ładuję notatki...</p></div> : visibleNotes.length === 0 ? (
          <div className="empty-state"><FolderOpen size={26} /><strong>Tu zrobiło się cicho.</strong><p>Dodaj pierwszą notatkę albo zmień kryteria wyszukiwania.</p><button className="text-button" onClick={onNew}>Dodaj notatkę <ArrowRight size={15} /></button></div>
        ) : (
          <div className="notes-list">{visibleNotes.map((note, index) => <article className="note-row" key={note.id}>
            <span className={`note-index tone-${index % 4}`}>{String(index + 1).padStart(2, '0')}</span>
            <div className="note-main"><div className="note-meta"><span className="subject-label">{note.subject || 'Ogólne'}</span><span className="note-date">{dateLabel(note.created_at)}</span></div><h3>{note.title}</h3><p>{note.content}</p>
              {note.attachments?.length > 0 && <div className="attachment-list">{note.attachments.map((file) => <button key={file.path} className="attachment-link" onClick={() => onAttachment(file)}><FileText size={14} />{file.name}<ArrowDownToLine size={13} /></button>)}</div>}
              <span className="note-author"><span className="avatar-dot">{(note.author_name || '?').slice(0, 1).toUpperCase()}</span>{note.author_name || 'Uczeń'}</span>
            </div>
            {canDelete(note) && <button className="icon-button delete-button" onClick={() => onDelete(note)} aria-label={`Usuń notatkę: ${note.title}`} title="Usuń notatkę"><Trash2 size={16} /></button>}
          </article>)}</div>
        )}
      </section>
    </>
  );
}

function OcrPage({ onUseText }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

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
    setError('');
    setProgress('Pobieram polski model rozpoznawania...');
    setBusy(true);
    let worker;
    try {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('pol', 1, { logger: (event) => event.status === 'recognizing text' && setProgress(`Rozpoznaję tekst: ${Math.round(event.progress * 100)}%`) });
      const result = await worker.recognize(file);
      setText(result.data.text.trim());
      setProgress('Gotowe. Sprawdź tekst przed zapisaniem.');
    } catch {
      setError('Nie udało się odczytać zdjęcia. Spróbuj z wyraźniejszym obrazem.');
      setProgress('');
    } finally {
      await worker?.terminate();
      setBusy(false);
    }
  };

  return (
    <>
      <section className="tool-heading"><span className="eyebrow">CZYTANIE ZE ZDJĘĆ</span><h1>Zdjęcie wchodzi.<br /><span>Tekst wychodzi.</span></h1><p>Odczytaj polskie notatki ze zdjęcia. Cała analiza odbywa się w twojej przeglądarce.</p></section>
      <section className="ocr-workspace">
        <div className="ocr-left"><label className={`upload-zone ${preview ? 'has-preview' : ''}`}>
          {preview ? <img src={preview} alt="Wybrane zdjęcie do odczytu" /> : <><span className="upload-icon"><ScanText size={24} /></span><strong>Wybierz zdjęcie notatek</strong><span>JPG, PNG lub WEBP</span><span className="button button-quiet"><Upload size={16} />Wybierz plik</span></>}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => readImage(event.target.files?.[0])} />
        </label><p className="privacy-note"><ShieldCheck size={15} />Zdjęcie nie opuszcza twojego urządzenia.</p></div>
        <div className="ocr-result"><div className="result-heading"><div><span className="eyebrow">WYNIK OCR</span><h2>Rozpoznany tekst</h2></div>{text && <button className="icon-button" title="Kopiuj tekst" aria-label="Kopiuj tekst" onClick={() => navigator.clipboard.writeText(text)}><FileText size={17} /></button>}</div>
          {busy ? <div className="ocr-progress"><LoaderCircle size={19} className="spin" /><span>{progress}</span></div> : error ? <p className="form-error">{error}</p> : <textarea aria-label="Rozpoznany tekst, możesz go edytować" value={text} onChange={(event) => setText(event.target.value)} placeholder="Rozpoznany tekst pojawi się tutaj. Możesz go poprawić przed zapisaniem." />}
          {!busy && progress && !error && <p className="progress-caption"><Check size={14} />{progress}</p>}
          <div className="result-actions"><button className="button button-primary" disabled={!text || busy} onClick={() => onUseText(text)}><Plus size={16} />Zapisz jako notatkę</button></div>
        </div>
      </section>
    </>
  );
}

function CodePage({ onUseCode }) {
  const [prompt, setPrompt] = useState('Napisz funkcję JavaScript, która sprawdza, czy podany numer portu jest w zakresie 1–65535. Dodaj obsługę błędnych danych.');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [generatorReady, setGeneratorReady] = useState(null);

  useEffect(() => {
    fetch('/api/health').then((response) => response.json()).then((health) => setGeneratorReady(health.generatorConfigured)).catch(() => setGeneratorReady(false));
  }, []);

  const generate = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nie udało się wygenerować kodu.');
      setCode(result.code);
    } catch (generationError) {
      setError(generationError.message || 'Serwer generatora jest niedostępny.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="tool-heading"><span className="eyebrow">POMOCNIK PROGRAMISTY</span><h1>Pomysł wchodzi.<br /><span>Kod wychodzi.</span></h1><p>Opisz zadanie prostymi słowami, a Gemini przygotuje przykładowe rozwiązanie.</p></section>
      <section className="code-workspace"><form className="prompt-panel" onSubmit={generate}><div className="result-heading"><div><span className="eyebrow">TWOJE POLECENIE</span><h2>Co mamy napisać?</h2></div><span className={`service-status ${generatorReady ? 'is-ready' : ''}`}><span />{generatorReady === null ? 'Sprawdzam' : generatorReady ? 'Generator aktywny' : 'Brak klucza API'}</span></div><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={10000} rows={7} placeholder="Np. Napisz stronę, która przelicza temperaturę ze stopni Celsjusza na Fahrenheita." /><div className="prompt-footer"><small>{prompt.length} / 10 000</small><button className="button button-dark" disabled={!prompt.trim() || busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}{busy ? 'Piszę kod...' : 'Generuj kod'}</button></div>{error && <p className="form-error"><AlertCircle size={15} />{error}</p>}</form>
        <div className="code-output"><div className="result-heading"><div><span className="eyebrow">REZULTAT</span><h2>Gotowy do sprawdzenia</h2></div>{code && <button className="icon-button" title="Kopiuj kod" aria-label="Kopiuj kod" onClick={() => navigator.clipboard.writeText(code)}><FileText size={17} /></button>}</div>{code ? <><pre><code>{code}</code></pre><button className="button button-primary" onClick={() => onUseCode(code)}><Plus size={16} />Zapisz w notatkach</button></> : <div className="code-empty"><Code2 size={23} /><p>Wygenerowany kod pojawi się tutaj.</p></div>}</div>
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
  const [draft, setDraft] = useState({ title: '', subject: '', content: '', files: [] });
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

  const openComposer = (content = '') => {
    setDraft({ title: '', subject: '', content, author_name: '', files: [] });
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
        title: draft.title.trim(), subject: draft.subject.trim() || 'Ogólne', content: draft.content.trim(), attachments,
        author_name: draft.author_name.trim() || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Gość',
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
          {page === 'notes' && <NotesPage notes={notes} search={search} setSearch={setSearch} onNew={() => openComposer()} onDelete={deleteNote} onAttachment={openAttachment} canDelete={canDelete} loading={loading} />}
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
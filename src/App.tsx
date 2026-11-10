import { NavLink, Route, Routes } from 'react-router-dom';
import { languages } from './content/loader';
import { useLanguage } from './state/LanguageContext';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';
import { DictionaryPage } from './pages/DictionaryPage';
import { QuizPage } from './pages/QuizPage';
import { PracticePage } from './pages/PracticePage';
import { CreditsPage } from './pages/CreditsPage';

export function App() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <img src="/icon.svg" alt="" width={28} height={28} />
          Sign
        </NavLink>
        <nav aria-label="Principal">
          <NavLink to="/" end>Aprender</NavLink>
          <NavLink to="/repaso">Repaso</NavLink>
          <NavLink to="/practica">Cámara</NavLink>
          <NavLink to="/diccionario">Diccionario</NavLink>
        </nav>
        <label className="lang-select">
          <span className="visually-hidden">Lengua de signos</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            {languages.map((l) => (
              <option key={l.id} value={l.id}>{l.short}</option>
            ))}
          </select>
        </label>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/leccion/:lessonId" element={<LessonPage />} />
          <Route path="/quiz/:lessonId" element={<QuizPage />} />
          <Route path="/repaso" element={<QuizPage />} />
          <Route path="/practica" element={<PracticePage />} />
          <Route path="/diccionario" element={<DictionaryPage />} />
          <Route path="/creditos" element={<CreditsPage />} />
          <Route path="*" element={<p>Página no encontrada.</p>} />
        </Routes>
      </main>

      <footer className="site-footer">
        Imágenes de signos: <a href="https://www.fundacioncnse.org/educa/bancolse/" target="_blank" rel="noopener noreferrer">Fundación CNSE</a>,{' '}
        <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/deed.es" target="_blank" rel="noopener noreferrer license">CC BY-NC-SA 3.0</a>
        {' · '}
        <NavLink to="/creditos">Créditos y licencias</NavLink>
      </footer>
    </div>
  );
}

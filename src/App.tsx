import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { FocusLayout } from './components/FocusLayout';
import { TodayPage } from './pages/TodayPage';
import { LearnPage } from './pages/LearnPage';
import { LessonPage } from './pages/LessonPage';
import { DictionaryPage } from './pages/DictionaryPage';
import { QuizPage } from './pages/QuizPage';
import { PracticePage } from './pages/PracticePage';
import { CreditsPage } from './pages/CreditsPage';
import { YouPage } from './pages/YouPage';

/** Al cambiar de pantalla: arriba del todo, como una página nueva. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Pantallas principales: pestañas (móvil) o barra lateral (escritorio) */}
        <Route element={<AppShell />}>
          <Route path="/" element={<TodayPage />} />
          <Route path="/aprender" element={<LearnPage />} />
          <Route path="/practica" element={<PracticePage />} />
          <Route path="/diccionario" element={<DictionaryPage />} />
          <Route path="/tu" element={<YouPage />} />
          <Route path="/creditos" element={<CreditsPage />} />
          <Route
            path="*"
            element={
              <section className="hero">
                <h1>Página no encontrada</h1>
                <Link to="/" className="button primary">Ir a Hoy</Link>
              </section>
            }
          />
        </Route>

        {/* Pantallas de foco: sin pestañas, con ✕ para salir */}
        <Route element={<FocusLayout exitTo="/aprender" exitLabel="Salir a Aprender" />}>
          <Route path="/leccion/:lessonId" element={<LessonPage />} />
          <Route path="/quiz/:lessonId" element={<QuizPage />} />
        </Route>
        <Route element={<FocusLayout exitTo="/" exitLabel="Salir a Hoy" />}>
          <Route path="/repaso" element={<QuizPage />} />
        </Route>
      </Routes>
    </>
  );
}

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
import { UnitPage } from './pages/UnitPage';
import { WelcomePage } from './pages/WelcomePage';

/** Al cambiar de pantalla: arriba del todo, como una página nueva (o a la sección del #enlace). */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
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
          <Route path="/aprender/:unitId" element={<UnitPage />} />
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
        {/* La lección pinta su propia barra: progreso junto al ✕, que vuelve a su unidad */}
        <Route element={<FocusLayout />}>
          <Route path="/leccion/:lessonId" element={<LessonPage />} />
          {/* Primera vez: sin pestañas ni ✕, una sola decisión */}
          <Route path="/bienvenida" element={<WelcomePage />} />
        </Route>
        <Route element={<FocusLayout exitTo="/aprender" exitLabel="Salir a Aprender" />}>
          <Route path="/quiz/:lessonId" element={<QuizPage />} />
          <Route path="/quiz/unidad/:unitId" element={<QuizPage />} />
        </Route>
        <Route element={<FocusLayout exitTo="/" exitLabel="Salir a Hoy" />}>
          <Route path="/repaso" element={<QuizPage />} />
        </Route>
      </Routes>
    </>
  );
}

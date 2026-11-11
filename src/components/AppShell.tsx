import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { languages } from '../content/loader';
import { useLanguage } from '../state/LanguageContext';
import { Attribution } from './Attribution';
import { CameraIcon, DictionaryIcon, LearnIcon, TodayIcon, YouIcon } from './icons';

const TABS: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
  { to: '/', label: 'Hoy', icon: <TodayIcon />, end: true },
  { to: '/aprender', label: 'Aprender', icon: <LearnIcon /> },
  { to: '/practica', label: 'Cámara', icon: <CameraIcon /> },
  { to: '/diccionario', label: 'Diccionario', icon: <DictionaryIcon /> },
  { to: '/tu', label: 'Tú', icon: <YouIcon /> },
];

/**
 * Marco de las pantallas principales: pestañas fijas abajo en móvil (< 768 px) y
 * barra lateral en escritorio. Es una sola <nav>; el CSS la coloca en un sitio u otro.
 */
export function AppShell() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="shell">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <div className="sidebar">
        <header className="sidebar-head">
          <NavLink to="/" className="brand">
            <img src="/icon.svg" alt="" width={32} height={32} />
            Sign
          </NavLink>
        </header>
        <nav className="tabs" aria-label="Principal">
          <ul>
            {TABS.map((t) => (
              <li key={t.to}>
                <NavLink to={t.to} end={t.end} className="tab">
                  <span className="tab-icon">{t.icon}</span>
                  <span className="tab-label">{t.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <Attribution>
          <label className="sidebar-lang">
            <span className="label">Lengua de signos</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              {languages.map((l) => (
                <option key={l.id} value={l.id}>{l.short} ({l.region})</option>
              ))}
            </select>
          </label>
        </Attribution>
      </div>

      <main id="contenido" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

import { Link, Outlet } from 'react-router-dom';
import { Attribution } from './Attribution';
import { CloseIcon } from './icons';

/** Pantallas de foco (lección, quiz, repaso): sin pestañas, con ✕ para salir. */
export function FocusLayout({ exitTo, exitLabel }: { exitTo: string; exitLabel: string }) {
  return (
    <div className="focus-shell">
      <header className="focus-bar">
        <Link to={exitTo} className="icon-button" aria-label={exitLabel}>
          <CloseIcon />
        </Link>
      </header>
      <main id="contenido" tabIndex={-1}>
        <Outlet />
      </main>
      <Attribution />
    </div>
  );
}

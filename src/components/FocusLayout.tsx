import type { ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Attribution } from './Attribution';
import { CloseIcon } from './icons';

/** Barra de las pantallas de foco: ✕ para salir y, al lado, lo que la pantalla necesite (progreso). */
export function FocusBar({ exitTo, exitLabel, children }: { exitTo: string; exitLabel: string; children?: ReactNode }) {
  return (
    <div className="focus-bar">
      <Link to={exitTo} className="icon-button" aria-label={exitLabel}>
        <CloseIcon />
      </Link>
      {children}
    </div>
  );
}

/**
 * Pantallas de foco (lección, quiz, repaso): sin pestañas, con ✕ para salir.
 * Sin `exitTo`, la propia pantalla pinta su FocusBar (la lección sale a su unidad).
 */
export function FocusLayout({ exitTo, exitLabel = 'Salir' }: { exitTo?: string; exitLabel?: string }) {
  return (
    <div className="focus-shell">
      {exitTo && (
        <header>
          <FocusBar exitTo={exitTo} exitLabel={exitLabel} />
        </header>
      )}
      <main id="contenido" tabIndex={-1}>
        <Outlet />
      </main>
      <Attribution />
    </div>
  );
}

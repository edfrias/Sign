import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Atribución obligatoria de las fotos de la Fundación CNSE (CC BY-NC-SA 3.0).
 * `children`: lo que va antes en el pie (en la barra lateral, el selector de lengua).
 */
export function Attribution({ children }: { children?: ReactNode }) {
  return (
    <footer className="site-footer">
      {children}
      <p className="attribution">
        Imágenes de signos:{' '}
        <a href="https://www.fundacioncnse.org/educa/bancolse/" target="_blank" rel="noopener noreferrer">Fundación CNSE</a>,{' '}
        <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/deed.es" target="_blank" rel="noopener noreferrer license">
          CC BY-NC-SA 3.0
        </a>
        {' · '}
        <Link to="/creditos">Créditos y licencias</Link>
      </p>
    </footer>
  );
}

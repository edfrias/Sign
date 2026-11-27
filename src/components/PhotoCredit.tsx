import { Link } from 'react-router-dom';

/** Atribución de una lista de miniaturas (cada foto completa lleva la suya). */
export function PhotoCredit() {
  return (
    <p className="photo-credit">
      Fotos:{' '}
      <a href="https://www.fundacioncnse.org/educa/bancolse/" target="_blank" rel="noopener noreferrer">
        Fundación CNSE · Banco de imágenes y signos LSE
      </a>
      {' · '}
      <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/deed.es" target="_blank" rel="noopener noreferrer license">
        CC BY-NC-SA 3.0
      </a>
      {' · '}
      <Link to="/creditos">Créditos</Link>
    </p>
  );
}

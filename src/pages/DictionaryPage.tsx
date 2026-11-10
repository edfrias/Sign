import { useMemo, useState } from 'react';
import { useLanguage } from '../state/LanguageContext';
import { SignCard } from '../components/SignCard';

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function DictionaryPage() {
  const { content } = useLanguage();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  const categories = useMemo(() => [...new Set(content.signs.map((s) => s.category))], [content]);
  const results = content.signs.filter(
    (s) => (!category || s.category === category) && normalize(s.gloss).includes(normalize(query)),
  );

  return (
    <section>
      <h1>Diccionario {content.language.short}</h1>
      <div className="filters">
        <input
          type="search"
          placeholder="Buscar palabra…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar palabra"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <p className="muted">{results.length} {results.length === 1 ? 'resultado' : 'resultados'}</p>
      <div className="grid">
        {results.map((s) => <SignCard key={s.id} sign={s} />)}
      </div>
    </section>
  );
}

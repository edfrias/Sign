import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { getContent, languages } from '../content/loader';
import type { LanguageContent } from '../content/types';

const STORAGE_KEY = 'sign.lang';

interface LanguageState {
  lang: string;
  setLang: (id: string) => void;
  content: LanguageContent;
}

const Ctx = createContext<LanguageState | null>(null);

function initialLang(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && languages.some((l) => l.id === saved)) return saved;
  } catch {
    /* almacenamiento no disponible */
  }
  return languages[0]!.id;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(initialLang);
  const value = useMemo<LanguageState>(
    () => ({
      lang,
      content: getContent(lang),
      setLang: (id) => {
        setLangState(id);
        try {
          localStorage.setItem(STORAGE_KEY, id);
        } catch {
          /* sin persistencia */
        }
      },
    }),
    [lang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLanguage(): LanguageState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLanguage fuera de LanguageProvider');
  return ctx;
}

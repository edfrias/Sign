import type { ReactNode } from 'react';

/** Iconos de trazo 2 px, 24×24, en currentColor. Siempre decorativos: el texto va al lado. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const TodayIcon = () => (
  <Icon>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9v11h14V9" />
    <path d="M10 20v-6h4v6" />
  </Icon>
);

export const LearnIcon = () => (
  <Icon>
    <path d="M2 5h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
    <path d="M22 5h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
  </Icon>
);

export const CameraIcon = () => (
  <Icon>
    <path d="M15 10l5-3v10l-5-3" />
    <rect x="2" y="6" width="13" height="12" rx="2" />
  </Icon>
);

export const DictionaryIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </Icon>
);

export const YouIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icon>
);

export const ReviewIcon = () => (
  <Icon>
    <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
    <path d="M3 21v-5h5" />
  </Icon>
);

export const CheckIcon = () => (
  <Icon>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const ArrowLeftIcon = () => (
  <Icon>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);

export const ArrowRightIcon = () => (
  <Icon>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

/** Configuración: forma de la mano */
export const HandIcon = () => (
  <Icon>
    <path d="M7 11V5.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M10 10V4a1.5 1.5 0 0 1 3 0v6" />
    <path d="M13 10V5.5a1.5 1.5 0 0 1 3 0V12" />
    <path d="M16 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L4.2 15.5a1.6 1.6 0 0 1 2.4-2.1L7 14" />
  </Icon>
);

/** Orientación: hacia dónde mira la palma */
export const CompassIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </Icon>
);

/** Ubicación: dónde se hace el signo */
export const PinIcon = () => (
  <Icon>
    <path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icon>
);

/** Movimiento */
export const MoveIcon = () => (
  <Icon>
    <path d="M4 12h16M16 8l4 4-4 4M8 8l-4 4 4 4" />
  </Icon>
);

/** Expresión (componentes no manuales) */
export const FaceIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
  </Icon>
);

/** Racha */
export const FlameIcon = () => (
  <Icon>
    <path d="M12 22a7 7 0 0 0 7-7c0-4-3-6.5-4.5-10C13 7 12 8 10.5 6.5 9.5 9 5 11 5 15a7 7 0 0 0 7 7z" />
    <path d="M12 22a3 3 0 0 0 3-3c0-2-1.5-3-3-5-1.5 2-3 3-3 5a3 3 0 0 0 3 3z" />
  </Icon>
);

export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

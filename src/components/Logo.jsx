import React from 'react';

export default function Logo({ size = 'md', showText = true, className = '' }) {
  // Ajustes de tamaño para el contenedor
  const dimensions = {
    sm: { icon: 24, text: 'text-sm', sub: 'text-[8px]' },
    md: { icon: 32, text: 'text-base', sub: 'text-[9px]' },
    lg: { icon: 44, text: 'text-xl', sub: 'text-[11px]' }
  };

  const current = dimensions[size] || dimensions.md;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Ícono Isotipo SVG (Cubo Tecnológico / Nodo de Red) */}
      <div className="relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-500/20 border border-blue-500/30 shadow-lg shadow-blue-500/10 backdrop-blur-sm">
        <svg
          width={current.icon}
          height={current.icon}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Degradado para las líneas e isotipo */}
          <defs>
            <linearGradient id="logixGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>

          {/* Cubo isométrico exterior */}
          <path
            d="M20 4L34 12V28L20 36L6 28V12L20 4Z"
            stroke="url(#logixGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Aristas internas del cubo / red */}
          <path
            d="M20 4V20M20 20L34 12M20 20L6 12M20 20V36"
            stroke="url(#logixGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />

          {/* Nodos de conexión (Puntos de Red / TI) */}
          <circle cx="20" cy="20" r="2.5" fill="#60A5FA" />
          <circle cx="20" cy="4" r="2" fill="#3B82F6" />
          <circle cx="34" cy="12" r="2" fill="#6366F1" />
          <circle cx="6" cy="12" r="2" fill="#3B82F6" />
          <circle cx="20" cy="36" r="2" fill="#818CF8" />
        </svg>
      </div>

      {/* Nombre y Subtítulo de la marca */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-black tracking-wider text-white ${current.text}`}>
            LOGIX <span className="text-blue-500">TI</span>
          </span>
          <span className={`font-bold uppercase tracking-widest text-slate-400 ${current.sub} mt-1`}>
            Asset Management
          </span>
        </div>
      )}
    </div>
  );
}
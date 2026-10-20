import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// LOGO SVG IDÉNTICO AL DEL DASHBOARD (MIPROCESADOR / CHIP TI)
function Logo({ className = "w-14 h-14" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="22" y="22" width="56" height="56" rx="10" fill="#1E293B" stroke="#3B82F6" strokeWidth="3.5"/>
      <rect x="34" y="34" width="32" height="32" rx="6" fill="#334155" stroke="#60A5FA" strokeWidth="1.5"/>
      <path d="M 44 42 V 58 H 58" stroke="#60A5FA" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M 36 12 V 22 M 50 12 V 22 M 64 12 V 22" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"/>
      <path d="M 36 78 V 88 M 50 78 V 88 M 64 78 V 88" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"/>
      <path d="M 12 36 H 22 M 12 50 H 22 M 12 64 H 22" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"/>
      <path d="M 78 36 H 88 M 78 50 H 88 M 78 64 H 88" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

function Login() {
  const { loginWithGoogle, loginWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginExitoso, setLoginExitoso] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await loginWithEmail(email, password);
      setLoginExitoso(true);
      await new Promise((resolve) => setTimeout(resolve, 2500));
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setLoginExitoso(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      setLoginExitoso(true);
      await new Promise((resolve) => setTimeout(resolve, 2500));
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setLoginExitoso(false);
    }
  };

  // 1. PANTALLA DE ANIMACIÓN DE TRANSICIÓN DE ACCESO
  if (loginExitoso) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute w-96 h-96 bg-blue-600/30 rounded-full blur-3xl animate-ping pointer-events-none"></div>

        <div className="z-10 text-center space-y-6 max-w-sm w-full bg-slate-900/90 border border-slate-700/80 p-8 rounded-3xl backdrop-blur-2xl shadow-2xl shadow-blue-500/20">
          
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-blue-600/20 border border-blue-400/50 flex items-center justify-center shadow-lg shadow-blue-500/40 animate-bounce">
              <Logo className="w-12 h-12" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black tracking-wider text-white uppercase">¡Acceso Concedido!</h2>
            <p className="text-xs text-blue-400 font-mono tracking-widest uppercase">Iniciando sesión segura...</p>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full rounded-full animate-pulse"></div>
          </div>

          <p className="text-[10px] text-slate-400 font-mono">LOGIX IT • Carabela Power</p>
        </div>
      </div>
    );
  }

  // 2. PANTALLA PRINCIPAL DE LOGIN
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 md:p-10 relative overflow-hidden font-sans select-none">
      
      {/* EFECTOS DE RESPLANDOR AMBIENTAL */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* TARJETA PRINCIPAL */}
      <div className="w-full max-w-5xl bg-slate-900/80 border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 backdrop-blur-2xl z-10">
        
        {/* COLUMNA IZQUIERDA: BRANDING CORPORATIVO */}
        <div className="lg:col-span-7 p-8 md:p-12 bg-gradient-to-br from-slate-900/90 via-slate-900/40 to-blue-950/40 border-b lg:border-b-0 lg:border-r border-slate-700/60 flex flex-col justify-between relative">
          
          <div className="space-y-8">
            
            {/* LOGO IDÉNTICO AL DASHBOARD + LOGIX IT + ESLOGAN */}
            <div className="flex items-center gap-4">
              <Logo className="w-14 h-14 shrink-0 drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]" />
              <div>
                <h1 className="text-2xl font-black tracking-wider text-blue-400 flex items-center gap-2">
                  LOGIX IT
                </h1>
                <p className="text-[11px] text-slate-300 font-semibold tracking-wide">
                  Acceso al Sistema de Control de Activos
                </p>
              </div>
            </div>

            {/* Mensaje Institucional */}
            <div className="space-y-3 pt-2">
              <h2 className="text-2xl font-extrabold text-white leading-tight">
                Control & Gestión Integral de Activos de TI
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
                Trazabilidad completa de hardware, monitoreo de garantías, control de periféricos y asignación técnica centralizada en tiempo real.
              </p>
            </div>

            {/* Características */}
            <div className="space-y-2.5 pt-2 hidden sm:block">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold">✓</span>
                <span>Administración Multiempresa e Inventario Activo</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold">✓</span>
                <span>Generación e Impresión de Fichas con Código QR</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-[10px] font-bold">✓</span>
                <span>Reportes Analíticos y Registro de Responsiva</span>
              </div>
            </div>

          </div>

          {/* Footer de Organización */}
          <div className="pt-8 border-t border-slate-700/60 mt-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-emerald-400">Plataforma Operativa</span>
              </div>
              <span className="text-[10px] text-slate-300 font-bold bg-slate-900 px-3 py-1 rounded-full border border-slate-700/80">
                Carabela Power
              </span>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA: FORMULARIO */}
        <div className="lg:col-span-5 p-8 md:p-10 flex flex-col justify-between bg-slate-900/90">
          
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">Iniciar Sesión</h3>
              <p className="text-xs text-slate-400 mt-1">Ingresa con tus credenciales asignadas</p>
            </div>

            {error && (
              <div className="mb-5 bg-rose-500/15 border border-rose-500/40 text-rose-300 p-3.5 rounded-2xl text-xs font-medium flex items-center gap-3">
                <span className="text-base">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 text-sm">✉️</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@zoliamerica.com"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 text-sm">🔒</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-blue-600/30 transition-all border border-blue-400/30 disabled:opacity-50 text-xs mt-2"
              >
                {loading ? 'Validando Acceso...' : 'Iniciar Sesión'}
              </button>
            </form>

            <div className="relative flex py-6 items-center">
              <div className="grow border-t border-slate-800"></div>
              <span className="shrink mx-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                O continúa con
              </span>
              <div className="grow border-t border-slate-800"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold py-3 px-4 rounded-2xl border border-slate-800 transition-all text-xs disabled:opacity-50 shadow-md"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Google Workspace</span>
            </button>
          </div>

          {/* PIE DE PÁGINA */}
          <div className="pt-6 border-t border-slate-800/80 text-center mt-6 space-y-1">
            <p className="text-[11px] font-semibold text-slate-400">
              © {new Date().getFullYear()} Carabela Power. Todos los derechos reservados.
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              Desarrollado por: <span className="text-blue-400 font-bold">Ing. Aldenis Miranda</span>
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;
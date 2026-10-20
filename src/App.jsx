import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Componentes del sistema
import Dashboard from './components/Dashboard';
import RegistroEquipo from './components/RegistroEquipo';
import AsignacionEquipo from './components/AsignacionEquipo';
import GestionCatalogos from './components/CatalogoEmpresas';
import GestionUsuarios from './components/GestionUsuarios';
import FichaPublica from './components/VerEquipo';
import InformesReportes from './components/InformesReportes';
import Login from './components/Login';
import ReimpresionQR from './components/ReimpresionQR';
import AuditoriaLogs from './components/AuditoriaLogs';

// Nuevos componentes de Expedientes
import Expedientes from './components/Expedientes';
import RegistroDocumento from './components/RegistroDocumento';

// Logo SVG para LOGIX IT
function Logo({ className = "w-10 h-10" }) {
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

export default function App() {
  const [usuarioAuth, setUsuarioAuth] = useState(null);
  const [usuarioDatos, setUsuarioDatos] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [vistaActual, setVistaActual] = useState('dashboard');
  
  // Estado para controlar el despliegue del submenú de expedientes
  const [menuExpedientesAbierto, setMenuExpedientesAbierto] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const correoNormalizado = user.email.toLowerCase().trim();
          const q = query(collection(db, 'usuarios'), where('email', '==', correoNormalizado));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const perfil = querySnapshot.docs[0].data();

            if (perfil.activo === false) {
              await signOut(auth);
              setUsuarioAuth(null);
              setUsuarioDatos(null);
              setCargandoAuth(false);
              return;
            }

            setUsuarioDatos(perfil);
            setUsuarioAuth(user);
          } else {
            const perfilDefecto = {
              email: correoNormalizado,
              nombre: user.displayName || correoNormalizado.split('@')[0],
              rol: 'Admin',
              activo: true
            };
            setUsuarioDatos(perfilDefecto);
            setUsuarioAuth(user);
          }
        } catch (err) {
          console.error("Error al consultar perfil:", err);
          setUsuarioDatos({ email: user.email, rol: 'Admin', activo: true });
          setUsuarioAuth(user);
        }
      } else {
        setUsuarioAuth(null);
        setUsuarioDatos(null);
      }
      setCargandoAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  const queryParams = new URLSearchParams(window.location.search);
  if (queryParams.get('codigo')) {
    return <FichaPublica />;
  }

  if (cargandoAuth) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Logo className="w-16 h-16 animate-pulse mb-4" />
        <p className="text-xs text-slate-300 font-mono">Iniciando LOGIX IT...</p>
      </div>
    );
  }

  if (!usuarioAuth) {
    return <Login />;
  }

  const rolActual = usuarioDatos?.rol || 'Admin';

  return (
    /* 📌 1. FIJAMOS EL CONTENEDOR PADRE AL ALTO EXACTO DE PANTALLA SIN SCROLL GLOBAL */
    <div className="h-screen w-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* 📌 2. SIDEBAR FIJO: h-screen, flex flex-col Y justify-between */}
      <aside className="no-print w-full md:w-64 h-screen bg-slate-800 border-r border-slate-700/80 p-5 flex flex-col justify-between shadow-xl flex-shrink-0 z-20">
        
        {/* PARTE SUPERIOR Y NAVEGACIÓN CON SCROLL PROPIO SI EL MENÚ CRECE */}
        <div className="space-y-5 overflow-y-auto pr-1 custom-scrollbar flex-1">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-700/50">
            <Logo className="w-9 h-9 shrink-0 shadow-lg shadow-blue-500/20" />
            <div>
              <h1 className="text-lg font-black text-blue-400 tracking-wider leading-none">LOGIX IT</h1>
              <p className="text-[9px] text-slate-400 font-semibold tracking-widest mt-1">INVENTORY SYSTEM</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setVistaActual('dashboard')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                vistaActual === 'dashboard' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
              }`}
            >
              📊 Dashboard / Activos
            </button>

            {(rolActual === 'Admin' || rolActual === 'Tecnico') && (
              <>
                <button
                  onClick={() => setVistaActual('registro')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    vistaActual === 'registro' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                  }`}
                >
                  💻 Registrar Activo
                </button>

                <button
                  onClick={() => setVistaActual('asignacion')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    vistaActual === 'asignacion' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                  }`}
                >
                  📄 Asignar Equipo
                </button>

                {/* 📁 SUBMENÚ EXPEDIENTES */}
                <div className="pt-0.5">
                  <button
                    onClick={() => setMenuExpedientesAbierto(!menuExpedientesAbierto)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-700/70 hover:text-white transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span>📁</span>
                      <span>Expedientes y Registro</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{menuExpedientesAbierto ? '▲' : '▼'}</span>
                  </button>

                  {menuExpedientesAbierto && (
                    <div className="pl-3 pt-0.5 space-y-0.5 border-l-2 border-slate-700/80 ml-3 my-0.5">
                      <button
                        onClick={() => setVistaActual('verExpedientes')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          vistaActual === 'verExpedientes' ? 'bg-slate-700 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                      >
                        📂 Ver Expedientes
                      </button>

                      <button
                        onClick={() => setVistaActual('registrarFactura')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          vistaActual === 'registrarFactura' ? 'bg-slate-700 text-amber-400 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                      >
                        🧾 Registrar Factura
                      </button>

                      <button
                        onClick={() => setVistaActual('registrarGarantia')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          vistaActual === 'registrarGarantia' ? 'bg-slate-700 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                      >
                        🛡️ Registrar Garantía
                      </button>

                      <button
                        onClick={() => setVistaActual('registrarActa')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          vistaActual === 'registrarActa' ? 'bg-slate-700 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                      >
                        ✍️ Ficha de Entrega
                      </button>

                      <button
                        onClick={() => setVistaActual('reimpresion-qr')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          vistaActual === 'reimpresion-qr' ? 'bg-slate-700 text-blue-400 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                      >
                        🏷️ Reimprimir Etiqueta QR
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setVistaActual('informes')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    vistaActual === 'informes' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                  }`}
                >
                  📈 Reportes e Informes
                </button>

                <button
                  onClick={() => setVistaActual('catalogos')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    vistaActual === 'catalogos' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                  }`}
                >
                  📁 Catálogos
                </button>
              </>
            )}

            {/* SECCIÓN ADMINISTRADOR */}
            {rolActual === 'Admin' && (
              <>
                <button
                  onClick={() => setVistaActual('usuarios')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    vistaActual === 'usuarios' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                  }`}
                >
                  👥 Usuarios y Permisos
                </button>

                <button
                  onClick={() => setVistaActual('auditoria')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    vistaActual === 'auditoria' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                  }`}
                >
                  🛡️ Auditoría y Logs
                </button>
              </>
            )}
          </nav>
        </div>

        {/* 📌 3. PARTE INFERIOR FIJA: PERFIL DE USUARIO Y BOTÓN CERRAR SESIÓN */}
        <div className="pt-3 mt-2 border-t border-slate-700/80 space-y-2.5 shrink-0">
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/50 space-y-1.5">
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{usuarioDatos?.nombre || usuarioAuth.email}</p>
              <p className="text-[10px] text-slate-400 truncate">{usuarioAuth.email}</p>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Rol: {rolActual}
              </span>
              <span className="text-[10px] font-semibold text-emerald-400">● Activo</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-red-300 bg-slate-900/40 hover:bg-red-500/10 border border-slate-700/50 transition-all cursor-pointer"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* 📌 4. ÁREA PRINCIPAL INDEPENDIENTE CON SCROLL PROPIO */}
      <main className="flex-1 h-screen p-4 md:p-8 overflow-y-auto bg-slate-900/90">
        {vistaActual === 'dashboard' && <Dashboard usuarioLogueado={usuarioDatos} />}
        {vistaActual === 'registro' && <RegistroEquipo usuarioLogueado={usuarioDatos} />}
        {vistaActual === 'asignacion' && <AsignacionEquipo usuarioLogueado={usuarioDatos} />}
        
        {/* VISTAS DE EXPEDIENTES Y DOCUMENTOS */}
        {vistaActual === 'verExpedientes' && <Expedientes />}
        {vistaActual === 'registrarFactura' && <RegistroDocumento tipoSubmenu="Factura" />}
        {vistaActual === 'registrarGarantia' && <RegistroDocumento tipoSubmenu="Garantia" />}
        {vistaActual === 'registrarActa' && <RegistroDocumento tipoSubmenu="ActaEntrega" />}

        {vistaActual === 'informes' && <InformesReportes usuarioLogueado={usuarioDatos} />}
        {vistaActual === 'catalogos' && <GestionCatalogos usuarioLogueado={usuarioDatos} />}
        {vistaActual === 'usuarios' && <GestionUsuarios usuarioLogueado={usuarioDatos} />}
        {vistaActual === 'reimpresion-qr' && <ReimpresionQR />}
        {vistaActual === 'auditoria' && <AuditoriaLogs usuarioLogueado={usuarioDatos} />}
      </main>

    </div>
  );
}
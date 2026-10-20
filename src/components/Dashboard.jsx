import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { puedeEliminar } from '../utils/permisos';
import { registrarLog } from '../services/loggerService';
import VerEquipo from './VerEquipo';

// ============================================================================
// SUBCOMPONENTES REUTILIZABLES DE UI
// ============================================================================

function StatCard({ label, val, pct, colorClass }) {
  return (
    <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
      <span className={`text-[10px] font-bold uppercase tracking-wider block ${colorClass}`}>
        {label}
      </span>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-2xl font-black text-white">{val}</p>
        {pct !== undefined && (
          <span className={`text-[10px] font-bold ${colorClass}`}>({pct}%)</span>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ label, total, pct, colorBg, colorText }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold mb-1">
        <span className={colorText}>{label} ({total})</span>
        <span className="text-slate-300">{pct}%</span>
      </div>
      <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-700">
        <div 
          className={`${colorBg} h-full rounded-full transition-all duration-500`} 
          style={{ width: `${pct}%` }} 
        />
      </div>
    </div>
  );
}

function BadgeEstado({ eq }) {
  if (eq.dadoDeBaja) {
    return <span className="bg-red-500/15 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">🚫 Dado de Baja</span>;
  }
  if (eq.enTaller) {
    return <span className="bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">🔧 En Taller</span>;
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
      eq.disponible 
        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
    }`}>
      {eq.disponible ? '● Disponible' : '● Asignado'}
    </span>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL DASHBOARD
// ============================================================================

export default function Dashboard({ usuarioLogueado }) {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [equipos, setEquipos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [cargando, setCargando] = useState(true);

  // Modales y Controles
  const [equipoBaja, setEquipoBaja] = useState(null);
  const [motivoBaja, setMotivoBaja] = useState('');
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [mostrarPanelNotificaciones, setMostrarPanelNotificaciones] = useState(false);
  const [mostrarModuloRecepcion, setMostrarModuloRecepcion] = useState(false);

  // Modal Custom para Correo Faltante
  const [modalCorreo, setModalCorreo] = useState({ abierto: false, equipo: null, correoInput: '' });

  // Estado para Recepción de Equipo
  const [equipoRecepcion, setEquipoRecepcion] = useState(null);
  const [motivoDevolucion, setMotivoDevolucion] = useState('Fin de Préstamo');
  const [estadoFisico, setEstadoFisico] = useState('Óptimo / Completo');
  const [obsDevolucion, setObsDevolucion] = useState('');
  const [procesandoDevolucion, setProcesandoDevolucion] = useState(false);

  // Edición rápida / Apertura de Ficha Técnica
  const [codigoAEditarVerEquipo, setCodigoAEditarVerEquipo] = useState(null);

  const esAdmin = puedeEliminar(usuarioLogueado?.rol);

  // Cargar Empresas
  useEffect(() => {
    async function cargarEmpresasUsuario() {
      const emailUsuario = usuarioLogueado?.email || auth.currentUser?.email;
      if (!emailUsuario) return;

      try {
        const userRef = doc(db, 'usuarios', emailUsuario);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const IDsPermitidos = userSnap.data().empresasPermitidas || [];
          if (IDsPermitidos.length === 0) {
            setEmpresas([]);
            setCargando(false);
            return;
          }

          const q = query(collection(db, 'empresas'), where('__name__', 'in', IDsPermitidos));
          const snap = await getDocs(q);
          const listaEmpresas = snap.docs.map(d => ({ id: d.id, ...d.data() }));

          setEmpresas(listaEmpresas);
          if (listaEmpresas.length > 0) setEmpresaSeleccionada(listaEmpresas[0].id);
        }
      } catch (err) {
        console.error("Error al cargar empresas:", err);
      }
    }
    cargarEmpresasUsuario();
  }, [usuarioLogueado]);

  // Escuchar Equipos
  useEffect(() => {
    if (!empresaSeleccionada) {
      setEquipos([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    const q = query(collection(db, 'equipos'), where('empresaId', '==', empresaSeleccionada));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEquipos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
    }, (error) => {
      console.error("Error al consultar equipos:", error);
      setCargando(false);
    });

    return () => unsubscribe();
  }, [empresaSeleccionada]);

  // Alertas
  const { alertasPrestamos, alertasGarantias, totalAlertas } = useMemo(() => {
    const hoy = new Date();
    const prestamos = [];
    const garantias = [];

    equipos.forEach(eq => {
      if (eq.tipoAsignacion === 'Temporal / Préstamo' && eq.fechaDevolucionEstimada) {
        const fechaDev = new Date(eq.fechaDevolucionEstimada);
        const diffDias = Math.ceil((fechaDev - hoy) / (1000 * 60 * 60 * 24));
        if (diffDias <= 5) prestamos.push({ ...eq, diasRestantes: diffDias });
      }

      const fechaGarantiaValida = eq.fechaVencimientoGarantia || eq.fechaFinGarantia;
      if (fechaGarantiaValida) {
        const fechaGar = new Date(fechaGarantiaValida);
        const diffDiasGarantia = Math.ceil((fechaGar - hoy) / (1000 * 60 * 60 * 24));
        if (diffDiasGarantia <= 30) garantias.push({ ...eq, diasGarantia: diffDiasGarantia });
      }
    });

    return { 
      alertasPrestamos: prestamos, 
      alertasGarantias: garantias,
      totalAlertas: prestamos.length + garantias.length 
    };
  }, [equipos]);

  // Métricas KPI
  const stats = useMemo(() => {
    const total = equipos.length;
    const disp = equipos.filter(e => e.disponible && !e.enTaller && !e.dadoDeBaja).length;
    const uso = equipos.filter(e => !e.disponible && !e.enTaller && !e.dadoDeBaja).length;
    const taller = equipos.filter(e => e.enTaller && !e.dadoDeBaja).length;
    const bajas = equipos.filter(e => e.dadoDeBaja).length;

    const calcPct = (val) => (total > 0 ? Math.round((val / total) * 100) : 0);

    return {
      total,
      disp, pctDisp: calcPct(disp),
      uso, pctUso: calcPct(uso),
      taller, pctTaller: calcPct(taller),
      bajas, pctBajas: calcPct(bajas)
    };
  }, [equipos]);

  // Exportar Excel
  // 📥 EXPORTAR EXCEL / CSV CORREGIDO PARA COLUMNAS EN EXCEL EN ESPAÑOL
const handleExportarExcel = () => {
  if (equipos.length === 0) return alert("No hay registros para exportar.");

  // Usamos punto y coma (;) como separador para que Excel en español organice en columnas reales (A, B, C...)
  const encabezados = ["Codigo", "Empresa", "Tipo", "Marca", "Modelo", "Serie", "Estado", "Usuario Asignado", "Correo", "Garantia Vence"];
  
  const filas = equipos.map(eq => [
    `"${eq.codigo || ''}"`,
    `"${eq.empresaNombre || eq.empresa || ''}"`,
    `"${eq.tipoNombre || eq.tipo || ''}"`,
    `"${eq.marca || ''}"`,
    `"${eq.modelo || ''}"`,
    `"${eq.serie || ''}"`,
    `"${eq.dadoDeBaja ? 'Dado de Baja' : eq.enTaller ? 'En Mantenimiento' : eq.disponible ? 'Disponible' : 'Asignado'}"`,
    `"${eq.asignadoA || 'Sin Asignar'}"`,
    `"${eq.correoAsignado || eq.correo || 'N/A'}"`,
    `"${eq.fechaFinGarantia || eq.fechaVencimientoGarantia || 'N/A'}"`
  ]);

  // Unimos por ';' en lugar de ','
  const contenidoCSV = "\uFEFF" + [encabezados.join(";"), ...filas.map(f => f.join(";"))].join("\n");
  
  const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Inventario_LOGIX_IT_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
};

  // 📄 ENVIAR NOTIFICACIÓN / ABRIR FICHA TÉCNICA
  const handleEnviarCorreoEquipo = (eq) => {
    const destino = eq.correoAsignado || eq.correo || '';

    if (!destino) {
      setModalCorreo({
        abierto: true,
        equipo: eq,
        correoInput: ''
      });
      return;
    }

    ejecutarEnvioCorreo(destino, eq);
  };

  const ejecutarEnvioCorreo = (correoDestino, eq) => {
    setCodigoAEditarVerEquipo(eq.codigo);
  };

  const handleGuardarYEnviarCorreo = async (e) => {
    e.preventDefault();
    const { equipo, correoInput } = modalCorreo;
    if (!correoInput.trim() || !equipo) return;

    try {
      await updateDoc(doc(db, 'equipos', equipo.id), {
        correoAsignado: correoInput.trim()
      });

      setModalCorreo({ abierto: false, equipo: null, correoInput: '' });
      ejecutarEnvioCorreo(correoInput.trim(), equipo);
    } catch (err) {
      console.error("Error al actualizar correo del custodio:", err);
    }
  };

  // Recepción Bodega
  const handleConfirmarRecepcion = async (e) => {
    e.preventDefault();
    if (!equipoRecepcion) return;

    setProcesandoDevolucion(true);
    try {
      await addDoc(collection(db, 'actasRecepcion'), {
        equipoId: equipoRecepcion.id,
        codigo: equipoRecepcion.codigo,
        serie: equipoRecepcion.serie || 'N/A',
        custodioAnterior: equipoRecepcion.asignadoA || 'N/A',
        motivoDevolucion,
        estadoFisico,
        observaciones: obsDevolucion,
        recibidoPor: usuarioLogueado?.nombre || usuarioLogueado?.email || 'Sistemas',
        fechaRecepcion: serverTimestamp()
      });

      await updateDoc(doc(db, 'equipos', equipoRecepcion.id), {
        disponible: true,
        asignadoA: '',
        correoAsignado: '',
        departamento: '',
        tipoAsignacion: '',
        fechaDevolucionEstimada: ''
      });

      await registrarLog({
        usuario: usuarioLogueado?.email || 'Sistemas',
        accion: 'ESTADO',
        modulo: 'EQUIPOS',
        detalles: `Retorno a bodega de activo [${equipoRecepcion.codigo}] previamente asignado a ${equipoRecepcion.asignadoA}`
      });

      alert(`✅ Equipo [${equipoRecepcion.codigo}] recepcionado correctamente en bodega.`);
      setEquipoRecepcion(null);
      setObsDevolucion('');
      setMostrarModuloRecepcion(false);
    } catch (err) {
      console.error(err);
      alert("Error al recepcionar el equipo.");
    } finally {
      setProcesandoDevolucion(false);
    }
  };

  const handleConfirmarBaja = async (e) => {
    e.preventDefault();
    if (!equipoBaja || !motivoBaja.trim()) return;

    try {
      await updateDoc(doc(db, 'equipos', equipoBaja.id), {
        dadoDeBaja: true,
        motivoBaja: motivoBaja.trim(),
        fechaBaja: new Date().toLocaleDateString(),
        disponible: false
      });
      setEquipoBaja(null);
      setMotivoBaja('');
      alert('El equipo ha sido marcado como Dado de Baja.');
    } catch (err) {
      console.error(err);
      alert("Error al dar de baja el activo.");
    }
  };

  const handleEliminarEquipo = async (id, codigo) => {
    if (!esAdmin) return;
    if (window.confirm(`¿Estás seguro de eliminar permanentemente el activo ${codigo}?`)) {
      await deleteDoc(doc(db, 'equipos', id));
    }
  };

  // Filtrado de Equipos
  const equiposFiltrados = useMemo(() => {
    return equipos.filter(eq => {
      const match = [eq.codigo, eq.marca, eq.modelo, eq.asignadoA, eq.serie]
        .some(val => val?.toLowerCase().includes(busqueda.toLowerCase()));

      if (filtroEstado === 'disponibles') return match && eq.disponible && !eq.enTaller && !eq.dadoDeBaja;
      if (filtroEstado === 'asignados') return match && !eq.disponible && !eq.enTaller && !eq.dadoDeBaja;
      if (filtroEstado === 'taller') return match && eq.enTaller && !eq.dadoDeBaja;
      if (filtroEstado === 'bajas') return match && eq.dadoDeBaja;
      return match;
    });
  }, [equipos, busqueda, filtroEstado]);

  const equiposAsignadosParaDevolver = useMemo(() => {
    return equipos.filter(e => !e.disponible && !e.dadoDeBaja);
  }, [equipos]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* 1. BARRA SUPERIOR DE ACCIONES */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-800 border border-slate-700/80 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">📊 Panel Central de Gestión</h2>
          <p className="text-xs text-slate-300">Control unificado de inventario y analítica operacional</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 px-3 py-2 rounded-xl">
            <span className="text-xs text-slate-300 font-bold">Empresa:</span>
            <select
              value={empresaSeleccionada}
              onChange={(e) => setEmpresaSeleccionada(e.target.value)}
              className="bg-transparent text-xs font-bold text-blue-400 focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              {empresas.length === 0 ? (
                <option value="" className="bg-slate-900 text-slate-400">Sin empresas</option>
              ) : (
                empresas.map(emp => (
                  <option key={emp.id} value={emp.id} className="bg-slate-900 text-white">
                    {emp.nombre || emp.nombreComercial || emp.razonSocial || 'Empresa'}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={() => setMostrarPanelNotificaciones(!mostrarPanelNotificaciones)}
            className={`relative p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              totalAlertas > 0
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-white'
            }`}
            title="Alertas de Préstamos y Garantías"
          >
            <span className="text-base">🔔</span>
            {totalAlertas > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {totalAlertas}
              </span>
            )}
          </button>

          <button
            onClick={() => setMostrarModuloRecepcion(!mostrarModuloRecepcion)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
          >
            🔄 Recepción Bodega
          </button>

          <button 
            onClick={() => setMostrarEscaner(!mostrarEscaner)} 
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
          >
            📷 {mostrarEscaner ? 'Cerrar' : 'Escanear'}
          </button>

          <button 
            onClick={handleExportarExcel} 
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
          >
            📥 Exportar Excel
          </button>
        </div>
      </div>

      {/* 2. PANEL DE ALERTAS */}
      {(totalAlertas > 0 || mostrarPanelNotificaciones) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold text-amber-400 border-b border-amber-500/30 pb-2 flex items-center justify-between">
              <span>⏰ Préstamos Temporales por Vencer</span>
              <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">{alertasPrestamos.length}</span>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {alertasPrestamos.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic text-center py-3">Sin préstamos pendientes de devolución.</p>
              ) : (
                alertasPrestamos.map(item => (
                  <div key={item.id} className="bg-slate-900/90 p-2.5 rounded-xl border border-amber-500/20 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white">[{item.codigo}] {item.marca} {item.modelo}</p>
                      <p className="text-[10px] text-slate-400">Custodio: <span className="text-amber-300 font-semibold">{item.asignadoA}</span></p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${item.diasRestantes < 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                      {item.diasRestantes < 0 ? `Vencido hace ${Math.abs(item.diasRestantes)}d` : `${item.diasRestantes}d restantes`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-purple-950/40 border border-purple-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold text-purple-400 border-b border-purple-500/30 pb-2 flex items-center justify-between">
              <span>🛡️ Vencimiento de Garantías</span>
              <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono">{alertasGarantias.length}</span>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {alertasGarantias.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic text-center py-3">Sin garantías próximas a expirar.</p>
              ) : (
                alertasGarantias.map(item => (
                  <div key={item.id} className="bg-slate-900/90 p-2.5 rounded-xl border border-purple-500/20 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white">[{item.codigo}] {item.marca} {item.modelo}</p>
                      <p className="text-[10px] text-slate-400">S/N: {item.serie}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${item.diasGarantia <= 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-purple-500/20 text-purple-300 border-purple-500/40'}`}>
                      {item.diasGarantia <= 0 ? 'Vencida' : `Vence en ${item.diasGarantia}d`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. RECEPCIÓN EN BODEGA */}
      {mostrarModuloRecepcion && (
        <div className="bg-slate-900 border border-indigo-500/40 p-6 rounded-2xl shadow-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
              🔄 Recepción y Retorno de Activos a Bodega
            </h3>
            <button onClick={() => setMostrarModuloRecepcion(false)} className="text-slate-400 hover:text-white text-xs cursor-pointer">✕ Cerrar</button>
          </div>

          <form onSubmit={handleConfirmarRecepcion} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Seleccionar Equipo a Retornar *</label>
              <select
                required
                value={equipoRecepcion?.id || ''}
                onChange={e => {
                  const eq = equiposAsignadosParaDevolver.find(x => x.id === e.target.value);
                  setEquipoRecepcion(eq || null);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              >
                <option value="">-- Seleccionar Equipo Asignado --</option>
                {equiposAsignadosParaDevolver.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    [{eq.codigo}] {eq.marca} {eq.modelo} — Asignado a: {eq.asignadoA}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Motivo</label>
                <select value={motivoDevolucion} onChange={e => setMotivoDevolucion(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white">
                  <option value="Fin de Préstamo">Fin de Préstamo</option>
                  <option value="Baja de Empleado">Baja de Empleado</option>
                  <option value="Falla / Garantía">Falla / Garantía</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Estado Físico</label>
                <select value={estadoFisico} onChange={e => setEstadoFisico(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white">
                  <option value="Óptimo / Completo">Óptimo / Completo</option>
                  <option value="Detalles Estéticos">Detalles Estéticos</option>
                  <option value="Inoperativo / Dañado">Inoperativo / Dañado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Observaciones</label>
              <input
                type="text"
                placeholder="Notas de entrega, cargador, maletín..."
                value={obsDevolucion}
                onChange={e => setObsDevolucion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
              />
            </div>

            <button
              type="submit"
              disabled={!equipoRecepcion || procesandoDevolucion}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-50 transition"
            >
              {procesandoDevolucion ? 'Procesando Retorno...' : '🔄 Confirmar Recepción y Liberar Equipo'}
            </button>
          </form>
        </div>
      )}

      {/* 4. KPIS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Activos" val={stats.total} colorClass="text-slate-300" />
        <StatCard label="Disponibles" val={stats.disp} pct={stats.pctDisp} colorClass="text-emerald-400" />
        <StatCard label="En Uso / Asignados" val={stats.uso} pct={stats.pctUso} colorClass="text-amber-400" />
        <StatCard label="En Mantenimiento" val={stats.taller} pct={stats.pctTaller} colorClass="text-purple-400" />
        <StatCard label="Dados de Baja" val={stats.bajas} pct={stats.pctBajas} colorClass="text-red-400" />
      </div>

      {/* 5. SECCIÓN DE GRÁFICOS ANALÍTICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">📈 Distribución Operativa</h3>
            <span className="text-[10px] text-slate-400 font-mono">Ocupación: {stats.pctUso}%</span>
          </div>
          <ProgressBar label="En Uso / Asignados" total={stats.uso} pct={stats.pctUso} colorBg="bg-amber-500" colorText="text-amber-400" />
          <ProgressBar label="Disponibles" total={stats.disp} pct={stats.pctDisp} colorBg="bg-emerald-500" colorText="text-emerald-400" />
          <ProgressBar label="En Mantenimiento" total={stats.taller} pct={stats.pctTaller} colorBg="bg-purple-500" colorText="text-purple-400" />
          <ProgressBar label="Dados de Baja" total={stats.bajas} pct={stats.pctBajas} colorBg="bg-red-500" colorText="text-red-400" />
        </div>

        {/* DONUT CHART */}
        <div className="bg-slate-800 border border-slate-700/80 p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-4">
          <h3 className="text-sm font-bold text-white">🍩 Balance General</h3>
          <div className="flex items-center justify-center relative py-2">
            <svg viewBox="0 0 36 36" className="w-36 h-36 transform -rotate-90">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1E293B" strokeWidth="3.8" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F59E0B" strokeWidth="3.8" strokeDasharray={`${stats.pctUso}, 100`} />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" strokeWidth="3.8" strokeDasharray={`${stats.pctDisp}, 100`} strokeDashoffset={`-${stats.pctUso}`} />
            </svg>
            <div className="absolute text-center">
              <span className="text-xl font-black text-white">{stats.total}</span>
              <span className="text-[9px] block text-slate-400 uppercase font-bold">Total</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-700/60">
            <span className="text-emerald-400">● Disp: {stats.pctDisp}%</span>
            <span className="text-amber-400">● Uso: {stats.pctUso}%</span>
            <span className="text-purple-400">● Taller: {stats.pctTaller}%</span>
            <span className="text-red-400">● Baja: {stats.pctBajas}%</span>
          </div>
        </div>
      </div>

      {/* 6. ESCÁNER OPTIMIZADO PARA MÓVIL Y ESCRITORIO */}
      {mostrarEscaner && (
        <div className="bg-slate-800 border border-blue-500/50 p-4 rounded-2xl text-center space-y-3 animate-fadeIn shadow-2xl">
          <p className="text-xs text-blue-400 font-bold flex items-center justify-center gap-2">
            📷 Lector de Código de Activo / QR
          </p>
          <input
            type="text"
            placeholder="Escanea o ingresa el código (Ej: ZAM-LAP-001)"
            autoFocus
            className="w-full max-w-md bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono mx-auto text-center focus:outline-none focus:border-blue-500 shadow-inner"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const codigoLimpio = e.target.value.trim();
                if (codigoLimpio) {
                  setCodigoAEditarVerEquipo(codigoLimpio);
                  setMostrarEscaner(false);
                }
              }
            }}
          />
          <p className="text-[10px] text-slate-400">Presiona Enter o permite que tu escáner óptico cargue la ficha del activo y custodio.</p>
        </div>
      )}

      {/* 7. FILTROS Y BÚSQUEDA */}
      <div className="bg-slate-800 border border-slate-700/80 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="flex flex-wrap bg-slate-900 p-1 rounded-xl border border-slate-700/80 text-xs font-bold w-full sm:w-auto">
          {['todos', 'disponibles', 'asignados', 'taller', 'bajas'].map(tab => (
            <button
              key={tab}
              onClick={() => setFiltroEstado(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                filtroEstado === tab ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="🔍 Buscar activo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2 text-xs text-white w-full sm:w-64 focus:outline-none"
        />
      </div>

      {/* 8. TABLA PRINCIPAL DE INVENTARIO */}
      <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl overflow-hidden">
        {cargando ? (
          <p className="text-center py-8 text-slate-300 text-xs">Cargando inventario...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-900 border-b border-slate-700/80 text-[11px] uppercase font-semibold text-slate-300">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Equipo / Marca</th>
                  <th className="px-4 py-3">Serie</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Asignado A</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {equiposFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                      No hay activos que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  equiposFiltrados.map(eq => (
                    <tr key={eq.id} className="hover:bg-slate-700/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-400">{eq.codigo}</td>
                      <td className="px-4 py-3 text-white font-semibold">{eq.marca} {eq.modelo}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{eq.serie || 'N/A'}</td>
                      <td className="px-4 py-3"><BadgeEstado eq={eq} /></td>
                      <td className="px-4 py-3 text-slate-200">{eq.asignadoA || 'Sin Asignar'}</td>
                      <td className="px-4 py-3 text-center space-x-1">
                        
                        {/* 👁️ Ver */}
                        <button 
                          type="button"
                          onClick={() => window.open(`/?codigo=${eq.codigo}`, '_blank')} 
                          className="bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 px-2 py-1 rounded-lg font-bold cursor-pointer transition"
                        >
                          👁️ Ver
                        </button>

                        {/* ✉️ Ficha Digital */}
                        {!eq.disponible && (
                          <button
                            type="button"
                            onClick={() => handleEnviarCorreoEquipo(eq)}
                            className="bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 px-2 py-1 rounded-lg font-bold cursor-pointer transition"
                            title="Ver Ficha / Acta Digital del Custodio"
                          >
                            ✉️ Ficha Digital
                          </button>
                        )}
                        
                        {/* ✏️ Editar */}
                        {esAdmin && !eq.dadoDeBaja && (
                          <>
                            <button 
                              type="button"
                              onClick={() => setCodigoAEditarVerEquipo(eq.codigo)} 
                              className="bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/30 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
                              title="Editar Ficha Técnica Completa"
                            >
                              ✏️ Editar
                            </button>
                            <button 
                              type="button"
                              onClick={() => setEquipoBaja(eq)} 
                              className="bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/30 px-2 py-1 rounded-lg font-bold cursor-pointer transition"
                            >
                              🚫 Baja
                            </button>
                          </>
                        )}

                        {/* 🗑️ Eliminar */}
                        {esAdmin && (
                          <button 
                            type="button"
                            onClick={() => handleEliminarEquipo(eq.id, eq.codigo)} 
                            className="bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 px-2 py-1 rounded-lg font-bold cursor-pointer transition"
                            title="Eliminar registro permanentemente"
                          >
                            🗑️ Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 📧 MODAL CUSTOM DE CORREO FALTANTE */}
      {modalCorreo.abierto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-amber-400 font-bold text-lg">
                ✉️
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Correo no registrado</h3>
                <p className="text-xs text-slate-400">
                  El colaborador <span className="text-amber-400 font-semibold">{modalCorreo.equipo?.asignadoA}</span> no tiene e-mail asociado.
                </p>
              </div>
            </div>

            <form onSubmit={handleGuardarYEnviarCorreo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Ingresa el correo electrónico:
                </label>
                <input
                  type="email"
                  required
                  placeholder="colaborador@empresa.com"
                  value={modalCorreo.correoInput}
                  onChange={(e) => setModalCorreo(prev => ({ ...prev, correoInput: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCorreo({ abierto: false, equipo: null, correoInput: '' })}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg transition cursor-pointer"
                >
                  Guardar y Continuar 📄
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✏️ MODAL COMPLETO DE FICHA TÉCNICA / EDICIÓN USANDO VerEquipo */}
      {codigoAEditarVerEquipo && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-2 sm:p-6 z-50 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 relative shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3 sticky top-0 bg-slate-900/95 z-20 backdrop-blur-md">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                📄 Ficha Técnica / Acta Digital - {codigoAEditarVerEquipo}
              </span>
              <button 
                type="button"
                onClick={() => setCodigoAEditarVerEquipo(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl font-bold text-xs transition border border-slate-700 cursor-pointer"
              >
                ✕ Cerrar Ficha
              </button>
            </div>
            <VerEquipo 
              codigoProp={codigoAEditarVerEquipo} 
              initialEditar={false} 
              usuarioLogueado={usuarioLogueado} 
            />
          </div>
        </div>
      )}

      {/* MODAL BAJA */}
      {equipoBaja && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-red-400">🚫 Dar de Baja: {equipoBaja.codigo}</h3>
            <form onSubmit={handleConfirmarBaja} className="space-y-3">
              <textarea
                required
                rows="3"
                placeholder="Motivo de la baja..."
                value={motivoBaja}
                onChange={(e) => setMotivoBaja(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setEquipoBaja(null)} className="flex-1 bg-slate-700 py-2 rounded-xl text-xs font-bold cursor-pointer">Cancelar</button>
                <button type="submit" className="flex-1 bg-red-600 py-2 rounded-xl text-xs font-bold text-white cursor-pointer">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
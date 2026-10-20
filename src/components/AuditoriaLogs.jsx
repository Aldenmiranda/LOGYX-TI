import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { registrarLog } from '../services/loggerService';

export default function AuditoriaLogs({ usuarioLogueado }) {
  const [logs, setLogs] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('TODOS');
  const [filtroAccion, setFiltroAccion] = useState('TODAS');
  const [limiteLogs, setLimiteLogs] = useState(100);

  // Registrar consulta de auditoría al ingresar
  useEffect(() => {
    if (usuarioLogueado) {
      registrarLog({
        usuario: usuarioLogueado.nombre || usuarioLogueado.email || 'ADMIN',
        accion: 'CONSULTA',
        modulo: 'AUDITORIA',
        detalles: 'El administrador ingresó a revisar la bitácora de auditoría.'
      });
    }
  }, [usuarioLogueado]);

  // Cargar logs en tiempo real
  useEffect(() => {
    const q = query(
      collection(db, 'logsAuditoria'),
      orderBy('fecha', 'desc'),
      limit(limiteLogs)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          fechaFormateada: data.fecha?.toDate ? data.fecha.toDate().toLocaleString('es-HN', {
            dateStyle: 'short',
            timeStyle: 'medium'
          }) : 'Registrando...'
        };
      });
      setLogs(docs);
    });

    return () => unsubscribe();
  }, [limiteLogs]);

  // Restricción por rol de usuario
  const rol = usuarioLogueado?.rol || 'Admin';
  if (rol !== 'Admin' && rol !== 'admin') {
    return (
      <div className="bg-[#050811] min-h-screen p-8 flex items-center justify-center">
        <div className="bg-[#0c101d] border border-rose-800/50 rounded-2xl p-8 max-w-md text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🚫</div>
          <h2 className="text-lg font-bold text-rose-400">Acceso Restringido</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            No tienes los permisos de Administrador necesarios para consultar la bitácora de auditoría y los registros del sistema.
          </p>
        </div>
      </div>
    );
  }

  const getBadgeAccion = (accion) => {
    switch (accion) {
      case 'CREAR':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'EDITAR':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'ELIMINAR':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'ASIGNACION':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'ESTADO':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const logsFiltrados = logs.filter(log => {
    const coincideTexto = 
      (log.usuario || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (log.detalles || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (log.modulo || '').toLowerCase().includes(busqueda.toLowerCase());

    const coincideModulo = filtroModulo === 'TODOS' || log.modulo === filtroModulo;
    const coincideAccion = filtroAccion === 'TODAS' || log.accion === filtroAccion;

    return coincideTexto && coincideModulo && coincideAccion;
  });

  return (
    <div className="bg-[#050811] min-h-screen p-6 text-slate-100 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🛡️ Bitácora de Auditoría y Logs del Sistema
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro cronológico inmutable de actividades y movimientos en la plataforma
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Mostrar:</span>
          <select
            value={limiteLogs}
            onChange={(e) => setLimiteLogs(Number(e.target.value))}
            className="bg-[#141a2e] border border-slate-700/60 rounded-lg px-3 py-1 text-xs text-white focus:outline-none"
          >
            <option value={50}>Últimos 50</option>
            <option value={100}>Últimos 100</option>
            <option value={200}>Últimos 200</option>
            <option value={500}>Últimos 500</option>
          </select>
        </div>
      </div>

      <div className="bg-[#0c101d] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Buscar por Usuario, Detalle o Módulo</label>
            <input
              type="text"
              placeholder="🔍 Buscar registro..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-[#141a2e] border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Módulo</label>
            <select
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value)}
              className="w-full bg-[#141a2e] border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="TODOS">-- Todos los Módulos --</option>
              <option value="EMPRESAS">EMPRESAS</option>
              <option value="EMPLEADOS">EMPLEADOS</option>
              <option value="EQUIPOS">EQUIPOS</option>
              <option value="ASIGNACIONES">ASIGNACIONES</option>
              <option value="CATALOGOS">CATÁLOGOS</option>
              <option value="AUDITORIA">AUDITORÍA</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Acción</label>
            <select
              value={filtroAccion}
              onChange={(e) => setFiltroAccion(e.target.value)}
              className="w-full bg-[#141a2e] border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="TODAS">-- Todas las Acciones --</option>
              <option value="CREAR">CREAR</option>
              <option value="EDITAR">EDITAR</option>
              <option value="ELIMINAR">ELIMINAR</option>
              <option value="ASIGNACION">ASIGNACIÓN</option>
              <option value="ESTADO">CAMBIO ESTADO</option>
              <option value="CONSULTA">CONSULTA</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141a2e] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-bold">Fecha / Hora</th>
                <th className="py-3 px-4 font-bold">Usuario</th>
                <th className="py-3 px-4 font-bold text-center">Acción</th>
                <th className="py-3 px-4 font-bold">Módulo</th>
                <th className="py-3 px-4 font-bold">Detalle de la Actividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {logsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-500 italic">
                    No se encontraron eventos de auditoría registrados.
                  </td>
                </tr>
              ) : (
                logsFiltrados.map((log) => (
                  <tr key={log.id} className="hover:bg-[#141a2e]/50 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      ⏱️ {log.fechaFormateada}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200 whitespace-nowrap">
                      👤 {log.usuario}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getBadgeAccion(log.accion)}`}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-blue-400 whitespace-nowrap">
                      {log.modulo}
                    </td>
                    <td className="py-3 px-4 text-slate-300 leading-relaxed">
                      {log.detalles}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="text-right text-[10px] text-slate-500 font-mono">
          Mostrando {logsFiltrados.length} de {logs.length} registros cargados
        </div>
      </div>
    </div>
  );
}
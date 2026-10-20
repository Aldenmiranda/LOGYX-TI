import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

export default function CatalogoEmpleados() {
  const [empleados, setEmpleados] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [puestos, setPuestos] = useState([]);

  // Formulario Empleado
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [departamentoId, setDepartamentoId] = useState('');
  const [puestoId, setPuestoId] = useState('');
  const [activo, setActivo] = useState(true);

  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Escuchar catálogos en tiempo real
  useEffect(() => {
    const unsubEmp = onSnapshot(collection(db, 'empleados'), snap => setEmpleados(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubComp = onSnapshot(collection(db, 'empresas'), snap => setEmpresas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubDep = onSnapshot(collection(db, 'departamentos'), snap => setDepartamentos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPue = onSnapshot(collection(db, 'puestos'), snap => setPuestos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubEmp(); unsubComp(); unsubDep(); unsubPue(); };
  }, []);

  const limpiarFormulario = () => {
    setNombre('');
    setCorreo('');
    setEmpresaId('');
    setDepartamentoId('');
    setPuestoId('');
    setActivo(true);
    setEditandoId(null);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!nombre || !empresaId) return;

    setCargando(true);
    try {
      const empObj = empresas.find(e => e.id === empresaId);
      const depObj = departamentos.find(d => d.id === departamentoId);
      const pueObj = puestos.find(p => p.id === puestoId);

      const payload = {
        nombre: nombre.trim(),
        correo: correo.trim().toLowerCase(),
        empresaId,
        empresaNombre: empObj?.nombreComercial || empObj?.nombre || 'General',
        departamentoId: departamentoId || '',
        departamentoNombre: depObj?.nombre || 'General',
        puestoId: puestoId || '',
        puestoNombre: pueObj?.nombre || 'Personal',
        activo,
        fechaModificacion: serverTimestamp()
      };

      if (editandoId) {
        await updateDoc(doc(db, 'empleados', editandoId), payload);
      } else {
        await addDoc(collection(db, 'empleados'), { ...payload, fechaRegistro: serverTimestamp() });
      }

      limpiarFormulario();
    } catch (err) {
      console.error("Error al guardar empleado:", err);
    } finally {
      setCargando(false);
    }
  };

  const handleEditar = (emp) => {
    setEditandoId(emp.id);
    setNombre(emp.nombre || '');
    setCorreo(emp.correo || '');
    setEmpresaId(emp.empresaId || '');
    setDepartamentoId(emp.departamentoId || '');
    setPuestoId(emp.puestoId || '');
    setActivo(emp.activo !== undefined ? emp.activo : true);
  };

  const toggleEstado = async (emp) => {
    try {
      await updateDoc(doc(db, 'empleados', emp.id), { activo: !emp.activo });
    } catch (err) {
      console.error("Error cambiando estado:", err);
    }
  };

  const empleadosFiltrados = empleados.filter(e => {
    const t = busqueda.toLowerCase();
    return (
      e.nombre?.toLowerCase().includes(t) ||
      e.correo?.toLowerCase().includes(t) ||
      e.empresaNombre?.toLowerCase().includes(t) ||
      e.departamentoNombre?.toLowerCase().includes(t)
    );
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl max-w-5xl mx-auto text-slate-100 space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            👥 Catálogo de Empleados / Colaboradores
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Administra el personal custodio de activos y su disponibilidad
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full self-start sm:self-auto">
          {empleados.filter(e => e.activo).length} Activos
        </span>
      </div>

      {/* Formulario de Registro / Edición */}
      <form onSubmit={handleGuardar} className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <p className="text-xs font-extrabold text-blue-400 uppercase tracking-widest">
          {editandoId ? '✏️ Editar Empleado' : '➕ Registrar Nuevo Empleado'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              placeholder="Ej: Juan Carlos Alfonso"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Correo Electrónico</label>
            <input
              type="email"
              placeholder="juan.alfonso@empresa.com"
              value={correo}
              onChange={e => setCorreo(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Empresa Perteneciente *</label>
            <select
              required
              value={empresaId}
              onChange={e => setEmpresaId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="">-- Seleccionar Empresa --</option>
              {empresas.map(e => (
                <option key={e.id} value={e.id}>{e.nombreComercial || e.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Departamento</label>
            <select
              value={departamentoId}
              onChange={e => setDepartamentoId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="">-- Seleccionar Departamento --</option>
              {departamentos.map(d => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Puesto / Cargo</label>
            <select
              value={puestoId}
              onChange={e => setPuestoId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="">-- Seleccionar Puesto --</option>
              {puestos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Estado de Disponibilidad</label>
            <select
              value={activo ? 'activo' : 'inactivo'}
              onChange={e => setActivo(e.target.value === 'activo')}
              className={`w-full border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold ${
                activo ? 'bg-emerald-950/60 text-emerald-400' : 'bg-rose-950/60 text-rose-400'
              }`}
            >
              <option value="activo">🟢 Activo (Disponible para asignación)</option>
              <option value="inactivo">🔴 Inactivo (Baja / No disponible)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          {editandoId && (
            <button
              type="button"
              onClick={limpiarFormulario}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={cargando}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            {cargando ? 'Guardando...' : editandoId ? 'Actualizar Empleado' : '➕ Guardar Empleado'}
          </button>
        </div>
      </form>

      {/* Buscador */}
      <div className="relative">
        <span className="absolute left-4 top-3 text-slate-400 text-xs">🔍</span>
        <input
          type="text"
          placeholder="Buscar por Nombre, Correo, Empresa o Departamento..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Tabla de Empleados */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="p-3">Empleado</th>
              <th className="p-3">Empresa</th>
              <th className="p-3">Depto / Puesto</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {empleadosFiltrados.length > 0 ? (
              empleadosFiltrados.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3">
                    <span className="font-bold text-white block">{emp.nombre}</span>
                    <span className="text-[10px] text-slate-400">{emp.correo || 'Sin correo registrado'}</span>
                  </td>
                  <td className="p-3 font-semibold text-slate-200">{emp.empresaNombre}</td>
                  <td className="p-3">
                    <span className="block text-slate-200 font-medium">{emp.departamentoNombre}</span>
                    <span className="text-[10px] text-slate-400">{emp.puestoNombre}</span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleEstado(emp)}
                      className={`px-2.5 py-1 rounded-full text-[9px] font-bold cursor-pointer transition ${
                        emp.activo !== false
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {emp.activo !== false ? '🟢 ACTIVO' : '🔴 INACTIVO'}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleEditar(emp)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition"
                    >
                      ✏️ Editar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center p-6 text-slate-500 italic">
                  No hay empleados registrados o que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
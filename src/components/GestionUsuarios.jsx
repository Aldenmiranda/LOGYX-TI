import React, { useState, useEffect } from 'react';
import { db, secondaryAuth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  getDocs 
} from 'firebase/firestore';
import { puedeEliminar, puedeGestionarUsuarios } from '../utils/permisos';

export default function GestionUsuarios({ usuarioLogueado }) {
  const [usuarios, setUsuarios] = useState([]);
  const [empresasLista, setEmpresasLista] = useState([]);
  
  // Campos del Formulario
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('Inventra2026!');
  const [rol, setRol] = useState('Tecnico');
  const [empresasSeleccionadas, setEmpresasSeleccionadas] = useState([]);
  
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [usuarioEditar, setUsuarioEditar] = useState(null);

  const esAdmin = puedeGestionarUsuarios(usuarioLogueado?.rol);
  const tienePermisoBorrar = puedeEliminar(usuarioLogueado?.rol);

  // 1. Escuchar la colección de usuarios
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'usuarios'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsuarios(docs);
    });
    return () => unsubscribe();
  }, []);

  // 2. Cargar el catálogo completo de empresas para asignación
  useEffect(() => {
    async function obtenerEmpresas() {
      try {
        const snap = await getDocs(collection(db, 'empresas'));
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEmpresasLista(docs);
      } catch (err) {
        console.error("Error al cargar lista de empresas:", err);
      }
    }
    obtenerEmpresas();
  }, []);

  // Manejo de checkboxes de empresas
  const handleToggleEmpresa = (empresaId) => {
    if (empresasSeleccionadas.includes(empresaId)) {
      setEmpresasSeleccionadas(empresasSeleccionadas.filter(id => id !== empresaId));
    } else {
      setEmpresasSeleccionadas([...empresasSeleccionadas, empresaId]);
    }
  };

  // Crear Usuario
  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    if (!esAdmin) {
      alert('No tienes permisos de Administrador para realizar esta acción.');
      return;
    }
    if (!email || !nombre || !password) return;

    setCargando(true);
    try {
      const correoLimpio = email.trim().toLowerCase();

      // Crear en Firebase Auth
      if (secondaryAuth) {
        await createUserWithEmailAndPassword(secondaryAuth, correoLimpio, password);
      }

      // Guardar en colección 'usuarios' con las empresasPermitidas
      await setDoc(doc(db, 'usuarios', correoLimpio), {
        email: correoLimpio,
        nombre: nombre.trim(),
        rol: rol,
        empresasPermitidas: empresasSeleccionadas,
        fechaCreacion: serverTimestamp()
      });

      setEmail('');
      setNombre('');
      setPassword('Inventra2026!');
      setRol('Tecnico');
      setEmpresasSeleccionadas([]);
      alert('Usuario creado correctamente.');
    } catch (err) {
      console.error("Error al crear usuario:", err);
      alert('Error al crear el usuario: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  // Editar Permisos / Empresas de Usuario
  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    if (!usuarioEditar) return;

    try {
      await updateDoc(doc(db, 'usuarios', usuarioEditar.id), {
        nombre: usuarioEditar.nombre,
        rol: usuarioEditar.rol,
        empresasPermitidas: usuarioEditar.empresasPermitidas || []
      });
      setUsuarioEditar(null);
      alert('Permisos de usuario actualizados con éxito.');
    } catch (err) {
      console.error("Error al actualizar usuario:", err);
      alert('Error al actualizar permisos.');
    }
  };

  // Eliminar Usuario
  const handleEliminarUsuario = async (id) => {
    if (!tienePermisoBorrar) return;
    if (window.confirm(`¿Estás seguro de eliminar el acceso de ${id}?`)) {
      try {
        await deleteDoc(doc(db, 'usuarios', id));
      } catch (err) {
        console.error("Error al eliminar usuario:", err);
      }
    }
  };

  // Filtrado de lista
  const usuariosFiltrados = usuarios.filter(u => 
    u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.rol?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100">
      
      {/* FORMULARIO PARA CREAR USUARIO */}
      {esAdmin && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            👤 Crear Nuevo Usuario / Contralor
          </h2>

          <form onSubmit={handleCrearUsuario} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Mendoza"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  placeholder="usuario@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Contraseña Inicial *</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Rol de Sistema *</label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Admin">Administrador (Acceso Total)</option>
                  <option value="Contralor">Contralor (Asignación Multi-Empresa)</option>
                  <option value="Tecnico">Técnico TI</option>
                  <option value="Consulta">Solo Lectura</option>
                </select>
              </div>
            </div>

            {/* SELECTOR MULTI-EMPRESA PERMITIDA */}
            <div className="border border-slate-800 p-4 rounded-xl space-y-2 bg-slate-950/50">
              <label className="block text-xs font-bold text-slate-300">
                🏢 Empresas Asignadas / Permitidas para este usuario:
              </label>
              {empresasLista.length === 0 ? (
                <p className="text-xs text-slate-500">Cargando catálogo de empresas...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {empresasLista.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={empresasSeleccionadas.includes(emp.id)}
                        onChange={() => handleToggleEmpresa(emp.id)}
                        className="rounded accent-blue-600"
                      />
                      {emp.nombreComercial || emp.razonSocial || emp.nombre || 'Empresa'}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-xl text-xs shadow-lg transition"
            >
              {cargando ? 'Guardando...' : '➕ Registrar Usuario'}
            </button>
          </form>
        </div>
      )}

      {/* TABLA DE USUARIOS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">👥 Usuarios Registrados ({usuarios.length})</h3>
          <input
            type="text"
            placeholder="🔍 Buscar por nombre, correo, rol..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Usuario / Correo</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Empresas Asignadas</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {usuariosFiltrados.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-blue-400">{u.email || u.id}</td>
                  <td className="px-4 py-3 text-white font-semibold">{u.nombre || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full text-[10px]">
                      {u.rol || 'Tecnico'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-[11px]">
                    {u.empresasPermitidas?.length > 0 
                      ? `${u.empresasPermitidas.length} Empresa(s)`
                      : 'Ninguna'}
                  </td>
                  <td className="px-4 py-3 text-center space-x-1">
                    <button
                      onClick={() => setUsuarioEditar(u)}
                      className="bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 px-2 py-1 rounded text-xs"
                      title="Editar Permisos y Empresas"
                    >
                      ✏️ Permisos
                    </button>
                    {tienePermisoBorrar && (
                      <button
                        onClick={() => handleEliminarUsuario(u.id)}
                        className="bg-slate-800 text-slate-400 hover:text-red-400 p-1 rounded text-xs"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDICIÓN DE PERMISOS */}
      {usuarioEditar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-white">✏️ Permisos de: {usuarioEditar.email}</h3>

            <form onSubmit={handleGuardarEdicion} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={usuarioEditar.nombre || ''}
                  onChange={(e) => setUsuarioEditar({ ...usuarioEditar, nombre: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Rol</label>
                <select
                  value={usuarioEditar.rol || 'Tecnico'}
                  onChange={(e) => setUsuarioEditar({ ...usuarioEditar, rol: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  <option value="Admin">Administrador</option>
                  <option value="Contralor">Contralor</option>
                  <option value="Tecnico">Técnico TI</option>
                  <option value="Consulta">Solo Lectura</option>
                </select>
              </div>

              {/* ASIGNACIÓN DE EMPRESAS EN MODAL */}
              <div className="border border-slate-800 p-3 rounded-xl space-y-2">
                <label className="block text-[11px] font-bold text-slate-300">Empresas Autorizadas:</label>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {empresasLista.map((emp) => {
                    const permitidas = usuarioEditar.empresasPermitidas || [];
                    const checked = permitidas.includes(emp.id);

                    return (
                      <label key={emp.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const nuevas = e.target.checked
                              ? [...permitidas, emp.id]
                              : permitidas.filter(id => id !== emp.id);
                            setUsuarioEditar({ ...usuarioEditar, empresasPermitidas: nuevas });
                          }}
                          className="rounded accent-blue-600"
                        />
                        {emp.nombreComercial || emp.razonSocial || emp.nombre || 'Empresa'}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUsuarioEditar(null)}
                  className="flex-1 bg-slate-800 text-slate-300 font-bold py-2 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-xl text-xs"
                >
                  Guardar Permisos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
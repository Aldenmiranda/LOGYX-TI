import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { registrarLog } from '../services/loggerService';

export default function CatalogoEmpresas({ usuarioLogueado }) {
  const [pestanaActiva, setPestanaActiva] = useState('empresas');

  // Estados de catálogos
  const [empresas, setEmpresas] = useState([]);
  const [tiposEquipos, setTiposEquipos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [deptos, setDeptos] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [prefijo, setPrefijo] = useState('');
  const [simbolo, setSimbolo] = useState('');
  const [codigoMoneda, setCodigoMoneda] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [deptoId, setDeptoId] = useState('');
  const [puestoId, setPuestoId] = useState('');
  const [correo, setCorreo] = useState('');
  const [activoEmpleado, setActivoEmpleado] = useState(true);
  const [contacto, setContacto] = useState('');
  const [edificio, setEdificio] = useState('');
  const [piso, setPiso] = useState('');
  const [idEditando, setIdEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const [prefijoEditadoManualmente, setPrefijoEditadoManualmente] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensajeToast, setMensajeToast] = useState(null);

  const mostrarNotificacion = (msg, tipo = 'exito') => {
    setMensajeToast({ texto: msg, tipo });
    setTimeout(() => setMensajeToast(null), 3000);
  };

  const cargarCatalogos = async () => {
    try {
      const empSnap = await getDocs(collection(db, 'empresas'));
      setEmpresas(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const tipoSnap = await getDocs(collection(db, 'tiposEquipos'));
      setTiposEquipos(tipoSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const catSnap = await getDocs(collection(db, 'categorias'));
      setCategorias(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const marcaSnap = await getDocs(collection(db, 'marcas'));
      setMarcas(marcaSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const provSnap = await getDocs(collection(db, 'proveedores'));
      setProveedores(provSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const depSnap = await getDocs(collection(db, 'departamentos'));
      setDeptos(depSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const puestoSnap = await getDocs(collection(db, 'puestos'));
      setPuestos(puestoSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const ubicSnap = await getDocs(collection(db, 'ubicaciones'));
      setUbicaciones(ubicSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const monSnap = await getDocs(collection(db, 'monedas'));
      setMonedas(monSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const empleSnap = await getDocs(collection(db, 'empleados'));
      setEmpleados(empleSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
    }
  };

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const handleImagenUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const resetFormulario = () => {
    setNombre('');
    setPrefijo('');
    setSimbolo('');
    setCodigoMoneda('');
    setLogoUrl('');
    setCategoriaId('');
    setEmpresaId('');
    setDeptoId('');
    setPuestoId('');
    setCorreo('');
    setActivoEmpleado(true);
    setContacto('');
    setEdificio('');
    setPiso('');
    setIdEditando(null);
    setPrefijoEditadoManualmente(false);
  };

  const cambiarPestana = (pestana) => {
    setPestanaActiva(pestana);
    resetFormulario();
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return mostrarNotificacion('El campo nombre es obligatorio.', 'error');

    setCargando(true);
    try {
      let coleccionNombre = '';
      let datosGuardar = {
        nombre: nombre.trim().toUpperCase(),
        fechaModificacion: serverTimestamp(),
      };

      if (pestanaActiva === 'empresas') {
        coleccionNombre = 'empresas';
        datosGuardar.prefijo = prefijo.trim().toUpperCase();
        datosGuardar.logoUrl = logoUrl || '';
      } else if (pestanaActiva === 'tipos') {
        coleccionNombre = 'tiposEquipos';
        datosGuardar.prefijo = (prefijo.trim() || 'EQ').toUpperCase();
        datosGuardar.categoriaId = categoriaId || '';
      } else if (pestanaActiva === 'categorias') {
        coleccionNombre = 'categorias';
      } else if (pestanaActiva === 'marcas') {
        coleccionNombre = 'marcas';
        datosGuardar.marca = nombre.trim().toUpperCase();
      } else if (pestanaActiva === 'proveedores') {
        coleccionNombre = 'proveedores';
        datosGuardar.contacto = contacto.trim();
      } else if (pestanaActiva === 'deptos') {
        coleccionNombre = 'departamentos';
      } else if (pestanaActiva === 'puestos') {
        coleccionNombre = 'puestos';
        datosGuardar.deptoId = deptoId || '';
        const deptoObj = deptos.find(d => d.id === deptoId);
        datosGuardar.deptoNombre = deptoObj ? deptoObj.nombre : '';
      } else if (pestanaActiva === 'ubicaciones') {
        coleccionNombre = 'ubicaciones';
        datosGuardar.edificio = edificio.trim().toUpperCase();
        datosGuardar.piso = piso.trim().toUpperCase();
      } else if (pestanaActiva === 'monedas') {
        coleccionNombre = 'monedas';
        datosGuardar.codigo = (codigoMoneda.trim() || 'USD').toUpperCase();
        datosGuardar.simbolo = simbolo.trim() || '$';
      } else if (pestanaActiva === 'empleados') {
        coleccionNombre = 'empleados';
        const empObj = empresas.find(e => e.id === empresaId);
        const depObj = deptos.find(d => d.id === deptoId);
        const pueObj = puestos.find(p => p.id === puestoId);

        datosGuardar.correo = correo.trim().toLowerCase();
        datosGuardar.empresaId = empresaId || '';
        datosGuardar.empresaNombre = empObj ? (empObj.nombreComercial || empObj.nombre) : '';
        datosGuardar.deptoId = deptoId || '';
        datosGuardar.deptoNombre = depObj ? depObj.nombre : '';
        datosGuardar.puestoId = puestoId || '';
        datosGuardar.puestoNombre = pueObj ? pueObj.nombre : '';
        datosGuardar.activo = activoEmpleado;
      }

      const usuarioNom = usuarioLogueado?.nombre || usuarioLogueado?.email || 'SISTEMA';

      if (idEditando) {
        await updateDoc(doc(db, coleccionNombre, idEditando), datosGuardar);
        await registrarLog({
          usuario: usuarioNom,
          accion: 'EDITAR',
          modulo: pestanaActiva.toUpperCase(),
          detalles: `Modificó el elemento "${nombre.trim()}" en el catálogo de ${pestanaActiva}`
        });
        mostrarNotificacion('Registro actualizado correctamente.');
      } else {
        datosGuardar.fechaRegistro = serverTimestamp();
        await addDoc(collection(db, coleccionNombre), datosGuardar);
        await registrarLog({
          usuario: usuarioNom,
          accion: 'CREAR',
          modulo: pestanaActiva.toUpperCase(),
          detalles: `Creó un nuevo elemento "${nombre.trim()}" en el catálogo de ${pestanaActiva}`
        });
        mostrarNotificacion('Registro guardado correctamente.');
      }

      resetFormulario();
      cargarCatalogos();

    } catch (err) {
      console.error("Error al guardar:", err);
      mostrarNotificacion('Ocurrió un error al procesar el guardado.', 'error');
    } finally {
      setCargando(false);
    }
  };

  const handleEditar = (item) => {
    setIdEditando(item.id);
    setNombre(item.nombre || item.marca || '');
    setPrefijo(item.prefijo || '');
    setSimbolo(item.simbolo || '');
    setCodigoMoneda(item.codigo || '');
    setLogoUrl(item.logoUrl || '');
    setCategoriaId(item.categoriaId || '');
    setEmpresaId(item.empresaId || '');
    setDeptoId(item.deptoId || '');
    setPuestoId(item.puestoId || '');
    setCorreo(item.correo || '');
    setActivoEmpleado(item.activo !== undefined ? item.activo : true);
    setContacto(item.contacto || '');
    setEdificio(item.edificio || '');
    setPiso(item.piso || '');
    setPrefijoEditadoManualmente(true);
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Deseas eliminar este elemento?')) return;
    try {
      const mapaColecciones = {
        empresas: 'empresas',
        tipos: 'tiposEquipos',
        categorias: 'categorias',
        marcas: 'marcas',
        proveedores: 'proveedores',
        deptos: 'departamentos',
        puestos: 'puestos',
        ubicaciones: 'ubicaciones',
        monedas: 'monedas',
        empleados: 'empleados'
      };
      await deleteDoc(doc(db, mapaColecciones[pestanaActiva], id));
      
      await registrarLog({
        usuario: usuarioLogueado?.nombre || usuarioLogueado?.email || 'SISTEMA',
        accion: 'ELIMINAR',
        modulo: pestanaActiva.toUpperCase(),
        detalles: `Eliminó un elemento (ID: ${id}) de la sección ${pestanaActiva}`
      });

      mostrarNotificacion('Elemento eliminado correctamente.');
      cargarCatalogos();
    } catch (err) {
      console.error("Error al eliminar:", err);
      mostrarNotificacion('Error al intentar eliminar.', 'error');
    }
  };

  const handleToggleEstadoEmpleado = async (emp) => {
    try {
      const nuevoEstado = !emp.activo;
      await updateDoc(doc(db, 'empleados', emp.id), { activo: nuevoEstado });
      
      await registrarLog({
        usuario: usuarioLogueado?.nombre || usuarioLogueado?.email || 'SISTEMA',
        accion: 'ESTADO',
        modulo: 'EMPLEADOS',
        detalles: `Cambió el estado del colaborador "${emp.nombre}" a ${nuevoEstado ? '🟢 ACTIVO' : '🔴 INACTIVO'}`
      });

      mostrarNotificacion(`Estado de ${emp.nombre} actualizado.`);
      cargarCatalogos();
    } catch (err) {
      console.error("Error cambiando estado:", err);
    }
  };

  const obtenerListaActiva = () => {
    switch (pestanaActiva) {
      case 'empresas': return empresas;
      case 'tipos': return tiposEquipos;
      case 'categorias': return categorias;
      case 'marcas': return marcas;
      case 'proveedores': return proveedores;
      case 'deptos': return deptos;
      case 'puestos': return puestos;
      case 'ubicaciones': return ubicaciones;
      case 'monedas': return monedas;
      case 'empleados': return empleados;
      default: return [];
    }
  };

  const listaFiltrada = obtenerListaActiva().filter(item => 
    (item.nombre || item.marca || item.codigo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (item.correo || item.empresaNombre || item.deptoNombre || item.prefijo || item.edificio || item.simbolo || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="bg-[#050811] min-h-screen p-6 text-slate-100 relative">
      
      {mensajeToast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border ${
          mensajeToast.tipo === 'exito' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/50' : 'bg-rose-950/90 text-rose-300 border-rose-700/50'
        }`}>
          <span>{mensajeToast.tipo === 'exito' ? '✅' : '⚠️'}</span>
          <span>{mensajeToast.texto}</span>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          📁 Mantenimiento de Catálogos
        </h2>
        <p className="text-xs text-slate-400">
          Configuración unificada de empresas, logotipos, empleados custodios, puestos, ubicaciones y monedas
        </p>
      </div>

      <div className="flex flex-wrap gap-2 bg-[#0c101d] border border-slate-800 p-2 rounded-xl mb-6 shadow-xl">
        {[
          { id: 'empresas', nombre: '🏢 Compañías' },
          { id: 'empleados', nombre: '👥 Empleados / Custodios' },
          { id: 'tipos', nombre: '🖥️ Tipos de Activos' },
          { id: 'categorias', nombre: '📁 Categorías' },
          { id: 'marcas', nombre: '🏷️ Marcas' },
          { id: 'proveedores', nombre: '🚚 Proveedores' },
          { id: 'deptos', nombre: '👥 Departamentos' },
          { id: 'puestos', nombre: '👔 Puestos / Cargos' },
          { id: 'ubicaciones', nombre: '📍 Ubicaciones' },
          { id: 'monedas', nombre: '🪙 Monedas / Divisas' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => cambiarPestana(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              pestanaActiva === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.nombre}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#0c101d] border border-slate-800 rounded-xl p-5 shadow-xl h-fit">
          <h3 className="text-sm font-bold text-slate-200 mb-4">
            {idEditando ? '✏️ Editar Registro' : '➕ Agregar Registro'}
          </h3>

          <form onSubmit={handleGuardar} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Nombre {pestanaActiva === 'empleados' ? 'Completo del Empleado' : pestanaActiva === 'empresas' ? 'de la Empresa' : 'del Elemento'} *
              </label>
              <input
                type="text"
                required
                placeholder={pestanaActiva === 'empleados' ? 'Ej: Juan Carlos Alfonso' : 'Nombre...'}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-[#141a2e] border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {pestanaActiva === 'empresas' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">
                  Logotipo de la Empresa
                </label>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white/10 p-1 border border-slate-700" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-500">
                      Sin Logo
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImagenUpload}
                    className="text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {(pestanaActiva === 'tipos' || pestanaActiva === 'empresas') && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Prefijo</label>
                <input
                  type="text"
                  required
                  placeholder={pestanaActiva === 'empresas' ? 'Ej: ZAM' : 'Ej: LAP'}
                  value={prefijo}
                  onChange={(e) => {
                    setPrefijo(e.target.value.toUpperCase());
                    setPrefijoEditadoManualmente(true);
                  }}
                  className="w-full bg-[#141a2e] border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none"
                />
              </div>
            )}

            {pestanaActiva === 'empleados' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="usuario@empresa.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full bg-[#141a2e] border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Empresa Perteneciente *</label>
                  <select
                    required
                    value={empresaId}
                    onChange={(e) => setEmpresaId(e.target.value)}
                    className="w-full bg-[#141a2e] border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">-- Seleccionar Empresa --</option>
                    {empresas.map((e) => (
                      <option key={e.id} value={e.id}>{e.nombreComercial || e.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Departamento</label>
                  <select
                    value={deptoId}
                    onChange={(e) => setDeptoId(e.target.value)}
                    className="w-full bg-[#141a2e] border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">-- Seleccionar Departamento --</option>
                    {deptos.map((d) => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Puesto / Cargo</label>
                  <select
                    value={puestoId}
                    onChange={(e) => setPuestoId(e.target.value)}
                    className="w-full bg-[#141a2e] border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">-- Seleccionar Puesto --</option>
                    {puestos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Estado del Empleado</label>
                  <select
                    value={activoEmpleado ? 'activo' : 'inactivo'}
                    onChange={(e) => setActivoEmpleado(e.target.value === 'activo')}
                    className={`w-full border border-slate-700/60 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none ${
                      activoEmpleado ? 'bg-emerald-950/60 text-emerald-400' : 'bg-rose-950/60 text-rose-400'
                    }`}
                  >
                    <option value="activo">🟢 Activo (Aparece en Asignaciones)</option>
                    <option value="inactivo">🔴 Inactivo (Baja / Oculto)</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={cargando}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs transition cursor-pointer"
              >
                {cargando ? 'Guardando...' : idEditando ? 'Actualizar' : 'Guardar'}
              </button>
              {idEditando && (
                <button
                  type="button"
                  onClick={resetFormulario}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 bg-[#0c101d] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-200">Listado ({listaFiltrada.length})</h3>
            <input
              type="text"
              placeholder="🔍 Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="bg-[#141a2e] border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141a2e] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  {pestanaActiva === 'empresas' && <th className="py-3 px-4 font-bold">Logo</th>}
                  <th className="py-3 px-4 font-bold">
                    {pestanaActiva === 'empleados' ? 'Empleado / Correo' : 'Nombre'}
                  </th>
                  {(pestanaActiva === 'tipos' || pestanaActiva === 'empresas') && <th className="py-3 px-4 font-bold">Prefijo</th>}
                  {pestanaActiva === 'empleados' && <th className="py-3 px-4 font-bold">Empresa</th>}
                  {(pestanaActiva === 'puestos' || pestanaActiva === 'empleados') && <th className="py-3 px-4 font-bold">Departamento / Puesto</th>}
                  {pestanaActiva === 'empleados' && <th className="py-3 px-4 text-center font-bold">Estado</th>}
                  <th className="py-3 px-4 text-center font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {listaFiltrada.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-slate-500">
                      No hay registros guardados.
                    </td>
                  </tr>
                ) : (
                  listaFiltrada.map((item) => (
                    <tr key={item.id} className="hover:bg-[#141a2e]/50 transition">
                      {pestanaActiva === 'empresas' && (
                        <td className="py-2 px-4">
                          {item.logoUrl ? (
                            <img src={item.logoUrl} alt="Logo" className="w-8 h-8 rounded object-contain bg-white/10 p-0.5" />
                          ) : (
                            <span className="text-[10px] text-slate-500">Sin logo</span>
                          )}
                        </td>
                      )}

                      <td className="py-3 px-4 font-bold">
                        <div>{item.nombre || item.marca}</div>
                        {pestanaActiva === 'empleados' && (
                          <div className="text-[10px] text-slate-400 font-normal">{item.correo || 'Sin correo'}</div>
                        )}
                      </td>

                      {(pestanaActiva === 'tipos' || pestanaActiva === 'empresas') && (
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">{item.prefijo || 'N/A'}</td>
                      )}

                      {pestanaActiva === 'empleados' && (
                        <td className="py-3 px-4 font-semibold text-slate-300">
                          {item.empresaNombre || 'N/A'}
                        </td>
                      )}

                      {(pestanaActiva === 'puestos' || pestanaActiva === 'empleados') && (
                        <td className="py-3 px-4 text-slate-300">
                          <div>{item.deptoNombre || 'General'}</div>
                          {item.puestoNombre && <div className="text-[10px] text-slate-400">{item.puestoNombre}</div>}
                        </td>
                      )}

                      {pestanaActiva === 'empleados' && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleEstadoEmpleado(item)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer transition ${
                              item.activo !== false
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {item.activo !== false ? '🟢 ACTIVO' : '🔴 INACTIVO'}
                          </button>
                        </td>
                      )}

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEditar(item)} className="bg-amber-600/20 text-amber-400 p-1.5 rounded-lg transition hover:bg-amber-600/30 cursor-pointer">✏️</button>
                          <button onClick={() => handleEliminar(item.id)} className="bg-rose-600/20 text-rose-400 p-1.5 rounded-lg transition hover:bg-rose-600/30 cursor-pointer">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
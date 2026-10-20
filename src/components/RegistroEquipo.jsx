import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import EtiquetaActivoFijo from './EtiquetaActivoFijo';
import { registrarLog } from '../services/loggerService';

export default function RegistroEquipo({ usuarioLogueado }) {
  const [equipos, setEquipos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  // Campos de Identificación y Registro
  const [codigo, setCodigo] = useState('');
  const [serie, setSerie] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [marcaId, setMarcaId] = useState('');
  const [modelo, setModelo] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [fechaCompra, setFechaCompra] = useState('');
  const [costo, setCosto] = useState('');
  const [ordenCompra, setOrdenCompra] = useState('');
  const [autorizadoPor, setAutorizadoPor] = useState('');

  // Especificaciones técnicas avanzadas
  const [cpu, setCpu] = useState('');
  const [ram, setRam] = useState('');
  const [almacenamiento, setAlmacenamiento] = useState('');
  const [so, setSo] = useState('');
  const [mac, setMac] = useState('');

  // 📸 Manejo de Imágenes y ArchivosAdjuntos
  const [imagenUrl, setImagenUrl] = useState('');
  const [facturaUrl, setFacturaUrl] = useState('');

  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarEtiqueta, setMostrarEtiqueta] = useState(null);

  // Cargar colecciones desde Firestore
  const cargarDatos = async () => {
    try {
      const eqSnap = await getDocs(collection(db, 'equipos'));
      setEquipos(eqSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const empSnap = await getDocs(collection(db, 'empresas'));
      setEmpresas(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const tipoSnap = await getDocs(collection(db, 'tiposEquipos'));
      setTipos(tipoSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const catSnap = await getDocs(collection(db, 'categorias'));
      setCategorias(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const marcaSnap = await getDocs(collection(db, 'marcas'));
      setMarcas(marcaSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const provSnap = await getDocs(collection(db, 'proveedores'));
      setProveedores(provSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error al cargar datos de registro:", err);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Handler para subir imagen/fotografía del activo en Base64
  const handleImagenUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagenUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Handler para subir archivo adjunto de factura
  const handleFacturaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFacturaUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const resetFormulario = () => {
    setCodigo('');
    setSerie('');
    setEmpresaId('');
    setTipoId('');
    setCategoriaId('');
    setMarcaId('');
    setModelo('');
    setProveedorId('');
    setFechaCompra('');
    setCosto('');
    setOrdenCompra('');
    setAutorizadoPor('');
    setCpu('');
    setRam('');
    setAlmacenamiento('');
    setSo('');
    setMac('');
    setImagenUrl('');
    setFacturaUrl('');
    setEditandoId(null);
  };

  const handleGuardarEquipo = async (e) => {
    e.preventDefault();
    if (!serie.trim()) return alert('El número de serie es obligatorio.');

    setCargando(true);
    try {
      const empObj = empresas.find(e => e.id === empresaId);
      const tipObj = tipos.find(t => t.id === tipoId);
      const catObj = categorias.find(c => c.id === categoriaId);
      const marObj = marcas.find(m => m.id === marcaId);
      const proObj = proveedores.find(p => p.id === proveedorId);

      const prefijoEmp = empObj?.prefijo || 'EQ';
      const prefijoTip = tipObj?.prefijo || 'ACT';
      const codigoGenerado = codigo || `${prefijoEmp}-${prefijoTip}-${Math.floor(1000 + Math.random() * 9000)}`;

      const datosEquipo = {
        codigo: codigoGenerado,
        serie: serie.trim().toUpperCase(),
        empresaId: empresaId || '',
        empresaNombre: empObj ? (empObj.nombreComercial || empObj.nombre) : '',
        empresaLogo: empObj?.logoUrl || '',
        tipoId: tipoId || '',
        tipoNombre: tipObj?.nombre || '',
        categoriaId: categoriaId || '',
        categoriaNombre: catObj?.nombre || '',
        marcaId: marcaId || '',
        marca: marObj?.nombre || marObj?.marca || '',
        modelo: modelo.trim().toUpperCase(),
        proveedorId: proveedorId || '',
        proveedor: proObj?.nombre || '',
        fechaCompra,
        costo,
        ordenCompra,
        autorizadoPor,
        cpu,
        ram,
        almacenamiento,
        sistemaOperativo: so,
        macAddress: mac,
        imagenUrl: imagenUrl || '',
        facturaUrl: facturaUrl || '',
        disponible: editandoId ? true : true,
        fechaActualizacion: serverTimestamp()
      };

      const usuarioNombreLog = usuarioLogueado?.nombre || usuarioLogueado?.email || 'SISTEMA';

      if (editandoId) {
        await updateDoc(doc(db, 'equipos', editandoId), datosEquipo);
        
        // 🛡️ Log de Auditoría
        await registrarLog({
          usuario: usuarioNombreLog,
          accion: 'EDITAR',
          modulo: 'EQUIPOS',
          detalles: `Actualizó especificaciones del activo [${codigoGenerado}] S/N: ${serie}`
        });

      } else {
        datosEquipo.fechaRegistro = serverTimestamp();
        await addDoc(collection(db, 'equipos'), datosEquipo);
        
        // 🛡️ Log de Auditoría
        await registrarLog({
          usuario: usuarioNombreLog,
          accion: 'CREAR',
          modulo: 'EQUIPOS',
          detalles: `Registró nuevo activo [${codigoGenerado}] ${datosEquipo.marca} ${modelo} (S/N: ${serie})`
        });

        // Previsualizar Etiqueta QR para impresión inmediata
        setMostrarEtiqueta({
          codigo: codigoGenerado,
          serie: serie.trim().toUpperCase(),
          marca: datosEquipo.marca,
          modelo: modelo.trim().toUpperCase(),
          empresaNombre: datosEquipo.empresaNombre || 'LOGIX IT',
          empresaLogo: datosEquipo.empresaLogo || '',
          custodioNombre: 'DISPONIBLE EN STOCK',
          departamento: 'INVENTARIO TI',
          puesto: 'ACTIVO FIJO',
          ubicacion: 'BODEGA TI'
        });
      }

      resetFormulario();
      cargarDatos();
    } catch (err) {
      console.error("Error al guardar equipo:", err);
    } finally {
      setCargando(false);
    }
  };

  const handleEditar = (eq) => {
    setEditandoId(eq.id);
    setCodigo(eq.codigo || '');
    setSerie(eq.serie || '');
    setEmpresaId(eq.empresaId || '');
    setTipoId(eq.tipoId || '');
    setCategoriaId(eq.categoriaId || '');
    setMarcaId(eq.marcaId || '');
    setModelo(eq.modelo || '');
    setProveedorId(eq.proveedorId || '');
    setFechaCompra(eq.fechaCompra || '');
    setCosto(eq.costo || '');
    setOrdenCompra(eq.ordenCompra || '');
    setAutorizadoPor(eq.autorizadoPor || '');
    setCpu(eq.cpu || '');
    setRam(eq.ram || '');
    setAlmacenamiento(eq.almacenamiento || '');
    setSo(eq.sistemaOperativo || '');
    setMac(eq.macAddress || '');
    setImagenUrl(eq.imagenUrl || '');
    setFacturaUrl(eq.facturaUrl || '');
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Deseas eliminar este equipo del inventario?')) return;
    try {
      await deleteDoc(doc(db, 'equipos', id));
      
      const usuarioNombreLog = usuarioLogueado?.nombre || usuarioLogueado?.email || 'SISTEMA';
      await registrarLog({
        usuario: usuarioNombreLog,
        accion: 'ELIMINAR',
        modulo: 'EQUIPOS',
        detalles: `Eliminó el activo ID: ${id} del inventario`
      });

      cargarDatos();
    } catch (err) {
      console.error("Error al eliminar equipo:", err);
    }
  };

  const equiposFiltrados = equipos.filter(eq =>
    (eq.codigo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (eq.serie || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (eq.marca || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (eq.modelo || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="bg-[#050811] min-h-screen p-6 text-slate-100 space-y-6">
      
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            💻 Registro de Activos de Cómputo
          </h2>
          <p className="text-xs text-slate-400">Ingreso técnico de hardware al inventario central con imágenes y adjuntos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORMULARIO */}
        <div className="bg-[#0c101d] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 h-fit">
          <h3 className="text-sm font-bold text-slate-200">
            {editandoId ? '✏️ Editar Activo' : '➕ Registrar Nuevo Activo'}
          </h3>

          <form onSubmit={handleGuardarEquipo} className="space-y-3 text-xs">
            
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Número de Serie (S/N) *</label>
              <input
                type="text"
                required
                placeholder="Ej: 5CD234899X"
                value={serie}
                onChange={e => setSerie(e.target.value)}
                className="w-full bg-[#141a2e] border border-slate-700/60 rounded-lg px-3 py-2 text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Empresa</label>
                <select
                  value={empresaId}
                  onChange={e => setEmpresaId(e.target.value)}
                  className="w-full bg-[#141a2e] border border-slate-700/60 rounded-lg px-2.5 py-2 text-white focus:outline-none"
                >
                  <option value="">-- Seleccionar --</option>
                  {empresas.map(e => (
                    <option key={e.id} value={e.id}>{e.nombreComercial || e.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tipo de Activo</label>
                <select
                  value={tipoId}
                  onChange={e => setTipoId(e.target.value)}
                  className="w-full bg-[#141a2e] border border-slate-700/60 rounded-lg px-2.5 py-2 text-white focus:outline-none"
                >
                  <option value="">-- Seleccionar --</option>
                  {tipos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Marca</label>
                <select
                  value={marcaId}
                  onChange={e => setMarcaId(e.target.value)}
                  className="w-full bg-[#141a2e] border border-slate-700/60 rounded-lg px-2.5 py-2 text-white focus:outline-none"
                >
                  <option value="">-- Seleccionar --</option>
                  {marcas.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre || m.marca}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Modelo</label>
                <input
                  type="text"
                  placeholder="Ej: ProBook 450 G8"
                  value={modelo}
                  onChange={e => setModelo(e.target.value)}
                  className="w-full bg-[#141a2e] border border-slate-700/60 rounded-lg px-3 py-2 text-white uppercase focus:outline-none"
                />
              </div>
            </div>

            {/* ESPECIFICACIONES TÉCNICAS */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-blue-400 uppercase">Especificaciones Técnicas</span>
              
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="CPU (Ej: i5-1135G7)" value={cpu} onChange={e => setCpu(e.target.value)} className="bg-[#141a2e] border border-slate-700/60 rounded px-2.5 py-1.5 text-white" />
                <input type="text" placeholder="RAM (Ej: 16GB)" value={ram} onChange={e => setRam(e.target.value)} className="bg-[#141a2e] border border-slate-700/60 rounded px-2.5 py-1.5 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Disco (Ej: 512GB SSD)" value={almacenamiento} onChange={e => setAlmacenamiento(e.target.value)} className="bg-[#141a2e] border border-slate-700/60 rounded px-2.5 py-1.5 text-white" />
                <input type="text" placeholder="S.O. (Ej: Windows 11)" value={so} onChange={e => setSo(e.target.value)} className="bg-[#141a2e] border border-slate-700/60 rounded px-2.5 py-1.5 text-white" />
              </div>

              <input type="text" placeholder="Dirección MAC (Ej: 00:1A:2B:3C:4D:5E)" value={mac} onChange={e => setMac(e.target.value)} className="w-full bg-[#141a2e] border border-slate-700/60 rounded px-2.5 py-1.5 text-white font-mono" />
            </div>

            {/* 📸 FOTOGRAFÍA DEL ACTIVO Y ADJUNTOS */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-blue-400 uppercase">Fotografía y Factura Adjunta</span>
              
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400">Imagen del Equipo</label>
                <div className="flex items-center gap-2">
                  {imagenUrl ? (
                    <img src={imagenUrl} alt="Foto Equipo" className="w-10 h-10 rounded object-cover bg-slate-800 border border-slate-700" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] text-slate-500">Sin Foto</div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImagenUpload}
                    className="text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400">Comprobante de Factura / Documento</label>
                <input
                  type="file"
                  onChange={handleFacturaUpload}
                  className="text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-emerald-600/20 file:text-emerald-400 hover:file:bg-emerald-600/30 cursor-pointer w-full"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="submit"
                disabled={cargando}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition cursor-pointer"
              >
                {cargando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Guardar y Generar QR'}
              </button>
              {editandoId && (
                <button
                  type="button"
                  onClick={resetFormulario}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>

          </form>
        </div>

        {/* LISTADO DE ACTIVOS */}
        <div className="lg:col-span-2 bg-[#0c101d] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-200">Inventario ({equiposFiltrados.length})</h3>
            <input
              type="text"
              placeholder="🔍 Buscar serie, código, marca..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="bg-[#141a2e] border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141a2e] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Foto</th>
                  <th className="py-3 px-4 font-bold">Código</th>
                  <th className="py-3 px-4 font-bold">Serie / Equipo</th>
                  <th className="py-3 px-4 font-bold">Empresa</th>
                  <th className="py-3 px-4 text-center font-bold">Estado</th>
                  <th className="py-3 px-4 text-center font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {equiposFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-slate-500">
                      No hay activos registrados.
                    </td>
                  </tr>
                ) : (
                  equiposFiltrados.map((eq) => (
                    <tr key={eq.id} className="hover:bg-[#141a2e]/50 transition">
                      <td className="py-2 px-4">
                        {eq.imagenUrl ? (
                          <img src={eq.imagenUrl} alt="Activo" className="w-8 h-8 rounded object-cover border border-slate-700" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-800/80 border border-slate-700 flex items-center justify-center text-[8px] text-slate-500">S/F</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">{eq.codigo}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold">{eq.marca} {eq.modelo}</div>
                        <div className="text-[10px] text-slate-400 font-mono">S/N: {eq.serie}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{eq.empresaNombre || 'N/A'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          eq.disponible 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {eq.disponible ? '🟢 DISPONIBLE' : `🔴 ASIGNADO (${eq.asignadoA || 'N/A'})`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setMostrarEtiqueta({
                              codigo: eq.codigo,
                              serie: eq.serie,
                              marca: eq.marca,
                              modelo: eq.modelo,
                              empresaNombre: eq.empresaNombre || 'LOGIX IT',
                              empresaLogo: eq.empresaLogo || '',
                              custodioNombre: eq.asignadoA ? eq.asignadoA.toUpperCase() : 'DISPONIBLE EN STOCK',
                              departamento: eq.departamento ? eq.departamento.toUpperCase() : 'INVENTARIO TI',
                              puesto: eq.puesto ? eq.puesto.toUpperCase() : 'ACTIVO FIJO',
                              ubicacion: eq.asignadoA ? `ASIGNADO A: ${eq.asignadoA.toUpperCase()}` : 'BODEGA TI'
                            })}
                            className="bg-blue-600/20 text-blue-400 p-1.5 rounded-lg hover:bg-blue-600/30 cursor-pointer"
                            title="Imprimir Etiqueta QR"
                          >
                            🏷️
                          </button>
                          <button onClick={() => handleEditar(eq)} className="bg-amber-600/20 text-amber-400 p-1.5 rounded-lg hover:bg-amber-600/30 cursor-pointer">✏️</button>
                          <button onClick={() => handleEliminar(eq.id)} className="bg-rose-600/20 text-rose-400 p-1.5 rounded-lg hover:bg-rose-600/30 cursor-pointer">🗑️</button>
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

      {/* COMPONENTE DE LA ETIQUETA QR */}
      {mostrarEtiqueta && (
        <EtiquetaActivoFijo
          datos={mostrarEtiqueta}
          onClose={() => setMostrarEtiqueta(null)}
        />
      )}

    </div>
  );
}
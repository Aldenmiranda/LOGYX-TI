import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import EtiquetaActivoFijo from './EtiquetaActivoFijo';
import { registrarLog } from '../services/loggerService';

export default function AsignacionEquipo({ usuarioLogueado }) {
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [empleadosLista, setEmpleadosLista] = useState([]); // 👥 Catálogo de Empleados

  // 1. Información General
  const [folio, setFolio] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState(new Date().toISOString().split('T')[0]);
  const [tipoMovimiento, setTipoMovimiento] = useState('Asignación Nueva');
  
  // Campos condicionales para Préstamo Temporal
  const [fechaDevolucion, setFechaDevolucion] = useState('');
  const [motivoPrestamo, setMotivoPrestamo] = useState('');

  // 2. Datos del Usuario / Receptor
  const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState('');
  const [colaboradorNombre, setColaboradorNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [puesto, setPuesto] = useState('');
  const [correo, setCorreo] = useState('');

  // 3. Registro de Adquisición y Autorización
  const [proveedor, setProveedor] = useState('');
  const [fechaCompra, setFechaCompra] = useState('');
  const [costo, setCosto] = useState('');
  const [ordenCompra, setOrdenCompra] = useState('');
  const [autorizadoPor, setAutorizadoPor] = useState('');

  // 4. Especificaciones Técnicas
  const [equipoSeleccionadoId, setEquipoSeleccionadoId] = useState('');
  const [equipoObjeto, setEquipoObjeto] = useState(null);
  const [cpu, setCpu] = useState('');
  const [ram, setRam] = useState('');
  const [almacenamiento, setAlmacenamiento] = useState('');
  const [so, setSo] = useState('');
  const [mac, setMac] = useState('');

  // 5. Periféricos Incluidos (Checklist)
  const [perifericos, setPerifericos] = useState({
    cargador: { incluido: 'No', obs: '' },
    mouse: { incluido: 'Sí', obs: '' },
    teclado: { incluido: 'Sí', obs: '' },
    monitor: { incluido: 'No', obs: '' },
    mochila: { incluido: 'No', obs: '' },
    candado: { incluido: 'No', obs: '' },
    docking: { incluido: 'No', obs: '' },
    audifonos: { incluido: 'No', obs: '' },
  });

  // 6. Estado Físico
  const [condicionFisica, setCondicionFisica] = useState('Nuevo / Impecable');
  const [detallesEsteticos, setDetallesEsteticos] = useState('');

  // 8. Firmas
  const [entregadoPor, setEntregadoPor] = useState(usuarioLogueado?.nombre || 'ING. ALDENIS MIRANDA');

  const [actaGenerada, setActaGenerada] = useState(null);
  const [mostrarEtiqueta, setMostrarEtiqueta] = useState(null);
  const [procesando, setProcesando] = useState(false);

  // Cargar Catálogos desde Firestore
  useEffect(() => {
    const unsubEquipos = onSnapshot(collection(db, 'equipos'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.disponible);
      setEquiposDisponibles(docs);
    });

    const unsubEmp = onSnapshot(collection(db, 'empresas'), snap => setEmpresas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubDep = onSnapshot(collection(db, 'departamentos'), snap => setDepartamentos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPue = onSnapshot(collection(db, 'puestos'), snap => setPuestos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // 👥 Cargar solo empleados activos
    const unsubEmpleados = onSnapshot(collection(db, 'empleados'), snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.activo !== false);
      setEmpleadosLista(docs);
    });

    const generarFolio = async () => {
      const snap = await getDocs(collection(db, 'actas'));
      setFolio(String(snap.size + 1).padStart(4, '0'));
    };
    generarFolio();

    return () => { unsubEquipos(); unsubEmp(); unsubDep(); unsubPue(); unsubEmpleados(); };
  }, []);

  // 👤 AUTO-RELLENO AL SELECCIONAR UN EMPLEADO
  const handleSeleccionarEmpleado = (id) => {
    setEmpleadoSeleccionadoId(id);
    const emp = empleadosLista.find(e => e.id === id);
    if (emp) {
      setColaboradorNombre(emp.nombre || '');
      setCorreo(emp.correo || '');
      setEmpresa(emp.empresaNombre || '');
      setDepartamento(emp.deptoNombre || emp.departamentoNombre || '');
      setPuesto(emp.puestoNombre || '');
    } else {
      setEmpleadoSeleccionadoId('');
    }
  };

  // 💻 AUTO-RELLENO AL SELECCIONAR UN EQUIPO
  const handleSeleccionarEquipo = (id) => {
    setEquipoSeleccionadoId(id);
    const eq = equiposDisponibles.find(e => e.id === id);
    if (eq) {
      setEquipoObjeto(eq);
      if (!empresa) setEmpresa(eq.empresaNombre || eq.empresa || '');
      
      setProveedor(eq.proveedor || '');
      setFechaCompra(eq.fechaCompra || '');
      setCosto(eq.costo || eq.montoCompra || eq.precio || '');
      setOrdenCompra(eq.ordenCompra || eq.factura || '');
      setAutorizadoPor(eq.autorizadoPor || eq.autorizacionCompra || '');

      setCpu(eq.cpu || '');
      setRam(eq.ram || '');
      setAlmacenamiento(eq.almacenamiento || '');
      setSo(eq.sistemaOperativo || eq.so || '');
      setMac(eq.macAddress || eq.mac || '');
    } else {
      setEquipoObjeto(null);
      setProveedor('');
      setFechaCompra('');
      setCosto('');
      setOrdenCompra('');
      setAutorizadoPor('');
      setCpu('');
      setRam('');
      setAlmacenamiento('');
      setSo('');
      setMac('');
    }
  };

  const handlePerifericoChange = (campo, key, valor) => {
    setPerifericos(prev => ({
      ...prev,
      [campo]: { ...prev[campo], [key]: valor }
    }));
  };

  const handleEstablecerFechaHoy = () => {
    const hoy = new Date().toISOString().split('T')[0];
    setFechaEntrega(hoy);
  };

  const handleSumarDiasDevolucion = (dias, fechaBase = fechaEntrega) => {
    const base = fechaBase ? new Date(fechaBase) : new Date();
    base.setDate(base.getDate() + dias);
    setFechaDevolucion(base.toISOString().split('T')[0]);
  };

  const handleGenerarAsignacion = async (e) => {
    e.preventDefault();
    if (!equipoSeleccionadoId || !equipoObjeto || !colaboradorNombre) {
      return;
    }

    setProcesando(true);
    try {
      const empObjeto = empresas.find(e => e.nombre === empresa || e.nombreComercial === empresa || e.razonSocial === empresa);
      const logoUrl = empObjeto ? (empObjeto.logoUrl || empObjeto.empresaLogo || '') : (equipoObjeto.empresaLogo || '');

      const datosActa = {
        folio,
        fechaEntrega,
        tipoMovimiento,
        fechaDevolucion: tipoMovimiento === 'Temporal / Préstamo' ? fechaDevolucion : '',
        motivoPrestamo: tipoMovimiento === 'Temporal / Préstamo' ? motivoPrestamo : '',
        colaboradorNombre,
        empresa,
        logoUrl,
        departamento,
        puesto,
        correo,
        proveedor,
        fechaCompra,
        costo,
        ordenCompra,
        autorizadoPor,
        equipoId: equipoObjeto.id,
        codigoEquipo: equipoObjeto.codigo || 'S/C',
        marcaModelo: `${equipoObjeto.marca || ''} ${equipoObjeto.modelo || ''}`.trim(),
        serie: equipoObjeto.serie || 'N/A',
        tipoHardware: equipoObjeto.tipoNombre || equipoObjeto.tipo || 'Equipo Cómputo',
        cpu,
        ram,
        almacenamiento,
        so,
        mac,
        perifericos,
        condicionFisica,
        detallesEsteticos,
        entregadoPor,
        fechaCreacion: serverTimestamp()
      };

      const actaRef = await addDoc(collection(db, 'actas'), datosActa);

      await updateDoc(doc(db, 'equipos', equipoObjeto.id), {
        disponible: false,
        asignadoA: colaboradorNombre.trim(),
        departamento,
        puesto,
        tipoAsignacion: tipoMovimiento,
        fechaDevolucionEstimada: tipoMovimiento === 'Temporal / Préstamo' ? fechaDevolucion : '',
        ultimaActaId: actaRef.id
      });

      // 🛡️ REGISTRO DE AUDITORÍA
      const usuarioLog = entregadoPor || usuarioLogueado?.nombre || usuarioLogueado?.email || 'SISTEMA';
      await registrarLog({
        usuario: usuarioLog,
        accion: 'ASIGNACION',
        modulo: 'ASIGNACIONES',
        detalles: `Asignó el equipo [${equipoObjeto.codigo || 'S/C'}] ${equipoObjeto.marca || ''} ${equipoObjeto.modelo || ''} a ${colaboradorNombre} (${empresa || 'S/E'})`,
        metaData: { equipoId: equipoObjeto.id, custodio: colaboradorNombre, folio }
      });

      setActaGenerada({ id: actaRef.id, ...datosActa });

      setMostrarEtiqueta({
        codigo: equipoObjeto.codigo || 'S/C',
        serie: equipoObjeto.serie || 'N/A',
        marca: equipoObjeto.marca || '',
        modelo: equipoObjeto.modelo || '',
        empresaNombre: empresa || equipoObjeto.empresaNombre || 'LOGIX IT',
        empresaLogo: logoUrl,
        custodioNombre: colaboradorNombre.toUpperCase(),
        departamento: departamento.toUpperCase() || 'GENERAL',
        puesto: puesto.toUpperCase() || 'PERSONAL',
        ubicacion: `ASIGNADO A: ${colaboradorNombre.toUpperCase()}`
      });

    } catch (error) {
      console.error('Error al generar formato:', error);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(1.5);
          cursor: pointer;
          opacity: 1;
          padding: 2px;
        }
        @media print {
          aside, nav, header, button, .no-print {
            display: none !important;
          }
          body, main {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .acta-print-container {
            display: block !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 20px !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #b0c4de !important;
            padding: 6px 8px !important;
            font-size: 11px !important;
          }
        }
      `}</style>

      {/* Formulario */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-white mb-1">📝 Generar Formato de Entrega de Cómputo</h2>
        <p className="text-xs text-slate-400">Completa la información para estructurar el acta oficial de entrega.</p>

        <form onSubmit={handleGenerarAsignacion} className="space-y-6">
          
          {/* 1. Información General */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/50 space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase">1. Información General de la Entrega</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">N° de Folio / Ticket</label>
                <input type="text" value={folio} onChange={e => setFolio(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] text-slate-400 font-semibold">Fecha de Entrega</label>
                  <button
                    type="button"
                    onClick={handleEstablecerFechaHoy}
                    className="text-[10px] font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-2.5 py-1 rounded-md shadow-md shadow-blue-500/20 border border-blue-400/30 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                  >
                    <span>📅</span> HOY
                  </button>
                </div>
                <input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-bold" />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tipo de Movimiento</label>
                <select 
                  value={tipoMovimiento} 
                  onChange={e => {
                    const val = e.target.value;
                    setTipoMovimiento(val);
                    if (val === 'Temporal / Préstamo' && !fechaDevolucion) {
                      handleSumarDiasDevolucion(15);
                    }
                  }} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-bold text-amber-400"
                >
                  <option value="Asignación Nueva" className="text-white">Asignación Nueva</option>
                  <option value="Reemplazo / Renovación" className="text-white">Reemplazo / Renovación</option>
                  <option value="Temporal / Préstamo" className="text-amber-400 font-bold">⏱️ Temporal / Préstamo</option>
                </select>
              </div>
            </div>

            {tipoMovimiento === 'Temporal / Préstamo' && (
              <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3 mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    ⏱️ Configuración de Préstamo Temporal
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] text-amber-300/90 font-bold">Fecha Estimada Devolución *</label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSumarDiasDevolucion(15)}
                          className="text-[9px] font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-2 py-0.5 rounded shadow border border-amber-300/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          📅 +15 Días
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSumarDiasDevolucion(30)}
                          className="text-[9px] font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-2 py-0.5 rounded shadow border border-amber-300/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          🗓️ +1 Mes
                        </button>
                      </div>
                    </div>
                    <input 
                      type="date" 
                      required={tipoMovimiento === 'Temporal / Préstamo'}
                      value={fechaDevolucion} 
                      onChange={e => setFechaDevolucion(e.target.value)} 
                      className="w-full bg-slate-900 border border-amber-800/80 rounded-lg px-3 py-1.5 text-xs text-amber-200 font-bold" 
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-amber-300/90 mb-1">Motivo / Proyecto del Préstamo</label>
                    <input 
                      type="text" 
                      value={motivoPrestamo} 
                      onChange={e => setMotivoPrestamo(e.target.value)} 
                      placeholder="Ej: Viaje de negocios / Proyecto temporal Auditoría" 
                      className="w-full bg-slate-900 border border-amber-800/80 rounded-lg px-3 py-1.5 text-xs text-white" 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. DATOS DEL USUARIO / RECEPTOR */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-blue-400 uppercase">2. Datos del Usuario / Receptor</h3>
              
              <div className="w-full sm:w-auto">
                <select
                  value={empleadoSeleccionadoId}
                  onChange={(e) => handleSeleccionarEmpleado(e.target.value)}
                  className="w-full bg-blue-950/60 border border-blue-500/50 rounded-lg px-3 py-1 text-xs text-blue-300 font-bold cursor-pointer focus:outline-none focus:border-blue-400"
                >
                  <option value="">-- 👤 Auto-rellenar desde Catálogo --</option>
                  {empleadosLista.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} {emp.empresaNombre ? `(${emp.empresaNombre})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nombre Completo *</label>
                <input 
                  type="text" 
                  required 
                  value={colaboradorNombre} 
                  onChange={e => setColaboradorNombre(e.target.value)} 
                  placeholder="Ej: Juan Carlos Alfonso" 
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" 
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Empresa / Razón Social</label>
                <select 
                  value={empresa} 
                  onChange={e => setEmpresa(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  <option value="">-- Seleccionar Empresa --</option>
                  {empresas.map(e => (
                    <option key={e.id} value={e.nombreComercial || e.nombre}>
                      {e.nombreComercial || e.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Departamento / Área</label>
                <select 
                  value={departamento} 
                  onChange={e => setDepartamento(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  <option value="">-- Seleccionar Departamento --</option>
                  {departamentos.map(d => (
                    <option key={d.id} value={d.nombre}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Puesto / Cargo</label>
                <select 
                  value={puesto} 
                  onChange={e => setPuesto(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  <option value="">-- Seleccionar Puesto --</option>
                  {puestos.map(p => (
                    <option key={p.id} value={p.nombre}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={correo} 
                  onChange={e => setCorreo(e.target.value)} 
                  placeholder="usuario@empresa.com" 
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-medium" 
                />
              </div>
            </div>
          </div>

          {/* 3. Seleccionar Activo y Especificaciones Técnicas */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/50 space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase">3. Especificaciones Técnicas y Selección de Activo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Seleccionar Activo *</label>
                <select required value={equipoSeleccionadoId} onChange={e => handleSeleccionarEquipo(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono">
                  <option value="">-- Seleccionar Equipo Disponible --</option>
                  {equiposDisponibles.map(eq => (
                    <option key={eq.id} value={eq.id}>[{eq.codigo}] - {eq.marca} {eq.modelo} (S/N: {eq.serie})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Procesador (CPU)</label>
                <input type="text" value={cpu} onChange={e => setCpu(e.target.value)} placeholder="Ej: INTEL CORE ULTRA 5" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Memoria RAM</label>
                <input type="text" value={ram} onChange={e => setRam(e.target.value)} placeholder="Ej: 16GB" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Almacenamiento (HDD/SSD)</label>
                <input type="text" value={almacenamiento} onChange={e => setAlmacenamiento(e.target.value)} placeholder="Ej: 1TB SSD" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Sistema Operativo / Licencia</label>
                <input type="text" value={so} onChange={e => setSo(e.target.value)} placeholder="Ej: WINDOWS 11 HOME" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Dirección MAC (Eth / Wi-Fi)</label>
                <input type="text" value={mac} onChange={e => setMac(e.target.value)} placeholder="Ej: 40D13391CDC8" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono" />
              </div>
            </div>
          </div>

          {/* 4. Registro de Adquisición */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/50 space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase">4. Registro de Adquisición y Autorización de Compra (Auto-rellenado)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Proveedor</label>
                <input type="text" value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="Ej: AMAZON" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Fecha de Compra</label>
                <input type="date" value={fechaCompra} onChange={e => setFechaCompra(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Precio / Costo ($ / L)</label>
                <input type="text" value={costo} onChange={e => setCosto(e.target.value)} placeholder="Ej: $899.99" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">N° Orden de Compra / Factura</label>
                <input type="text" value={ordenCompra} onChange={e => setOrdenCompra(e.target.value)} placeholder="Ej: 112-9044681" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Autorizado Por (Nombre y Cargo)</label>
                <input type="text" value={autorizadoPor} onChange={e => setAutorizadoPor(e.target.value)} placeholder="Ej: Ing. Diego Larach" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" />
              </div>
            </div>
          </div>

          {/* 5. Periféricos Incluidos */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/50 space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase">5. Periféricos y Accesorios Incluidos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                { id: 'cargador', label: 'Cargador / Adaptador' },
                { id: 'mouse', label: 'Mouse (Ratón)' },
                { id: 'teclado', label: 'Teclado' },
                { id: 'monitor', label: 'Monitor(es) adicional(es)' },
                { id: 'mochila', label: 'Mochila / Maletín' },
                { id: 'candado', label: 'Candado Kensington' },
                { id: 'docking', label: 'Docking Station / Hub USB-C' },
                { id: 'audifonos', label: 'Audífonos / Diadema' },
              ].map(item => (
                <div key={item.id} className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="w-1/3 text-slate-300 font-semibold">{item.label}</span>
                  <select
                    value={perifericos[item.id].incluido}
                    onChange={e => handlePerifericoChange(item.id, 'incluido', e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded text-white px-2 py-1 text-xs"
                  >
                    <option value="Sí">[X] Sí</option>
                    <option value="No">[ ] No</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Marca / S/N / Obs"
                    value={perifericos[item.id].obs}
                    onChange={e => handlePerifericoChange(item.id, 'obs', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 6. Estado Físico */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/50 space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase">6. Estado Físico y Verificación Operativa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Condición Física del Equipo</label>
                <select value={condicionFisica} onChange={e => setCondicionFisica(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white">
                  <option value="Nuevo / Impecable">Nuevo / Impecable</option>
                  <option value="Usado en buen estado">Usado en buen estado</option>
                  <option value="Presenta detalles estéticos">Presenta detalles estéticos</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Detalles Estéticos (si aplica)</label>
                <input type="text" value={detallesEsteticos} onChange={e => setDetallesEsteticos(e.target.value)} placeholder="Ej: Rayones leves" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white" />
              </div>
            </div>
          </div>

          {/* Entregado Por */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Entregado Por (Técnico / TI)</label>
            <input type="text" value={entregadoPor} onChange={e => setEntregadoPor(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-semibold" />
          </div>

          <button
            type="submit"
            disabled={procesando}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {procesando ? 'Generando Documento...' : '📄 Generar Formato de Entrega e Imprimir Etiqueta'}
          </button>
        </form>
      </div>

      {/* COMPONENTE REUTILIZABLE DE LA ETIQUETA QR */}
      {mostrarEtiqueta && (
        <EtiquetaActivoFijo 
          datos={mostrarEtiqueta} 
          onClose={() => setMostrarEtiqueta(null)} 
        />
      )}

      {/* VISTA OFICIAL DEL DOCUMENTO DE ENTREGA (FORMATO DE IMPRESIÓN) */}
      {actaGenerada && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="no-print flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-emerald-400">✓ Formato Oficial Generado</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setMostrarEtiqueta({
                  codigo: actaGenerada.codigoEquipo,
                  serie: actaGenerada.serie,
                  marcaModelo: actaGenerada.marcaModelo,
                  empresaNombre: actaGenerada.empresa || 'LOGIX IT',
                  empresaLogo: actaGenerada.logoUrl || '',
                  custodioNombre: actaGenerada.colaboradorNombre.toUpperCase(),
                  puesto: actaGenerada.puesto.toUpperCase() || 'PERSONAL',
                  departamento: actaGenerada.departamento.toUpperCase() || 'GENERAL'
                })}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
              >
                🏷️ Re-imprimir Etiqueta QR
              </button>
              <button
                onClick={() => window.print()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
              >
                🖨️ Imprimir Formato Acta
              </button>
            </div>
          </div>

          <div className="acta-print-container bg-white text-slate-900 p-8 rounded-xl shadow-2xl border border-slate-200 text-xs space-y-6">
            
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
              {actaGenerada.logoUrl ? (
                <img 
                  src={actaGenerada.logoUrl} 
                  alt="Logo Empresa" 
                  className="h-16 w-auto object-contain max-w-45" 
                />
              ) : (
                <div className="text-left font-bold text-slate-800 text-sm border-2 border-dashed border-slate-300 p-2 rounded">
                  {actaGenerada.empresa || 'LOGOTIPO'}
                </div>
              )}

              <div className="text-right space-y-1">
                <h1 className="text-lg font-black text-[#1d3557] tracking-wide uppercase">
                  FORMATO DE ENTREGA DE EQUIPO DE CÓMPUTO Y HARDWARE
                </h1>
                <p className="text-xs font-semibold text-slate-600">
                  Departamento de Tecnologías de la Información / Soporte Técnico
                </p>
              </div>
            </div>

            {/* 1. INFORMACIÓN GENERAL */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-[#1d3557] uppercase tracking-wider">
                1. INFORMACIÓN GENERAL DE LA ENTREGA
              </h2>
              <table className="w-full border-collapse border border-slate-300">
                <tbody>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold w-1/4 border border-slate-300 p-2">Número de Folio / Ticket:</td>
                    <td className="border border-slate-300 p-2 font-mono font-bold">{actaGenerada.folio}</td>
                    <td className="bg-[#f0f4f8] font-bold w-1/4 border border-slate-300 p-2">Fecha de Entrega:</td>
                    <td className="border border-slate-300 p-2">{actaGenerada.fechaEntrega}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Tipo de Movimiento:</td>
                    <td colSpan="3" className="border border-slate-300 p-2 font-medium">
                      [{actaGenerada.tipoMovimiento === 'Asignación Nueva' ? ' X ' : '   '}] Asignación Nueva &nbsp;&nbsp;&nbsp;&nbsp;
                      [{actaGenerada.tipoMovimiento === 'Reemplazo / Renovación' ? ' X ' : '   '}] Reemplazo / Renovación &nbsp;&nbsp;&nbsp;&nbsp;
                      [{actaGenerada.tipoMovimiento === 'Temporal / Préstamo' ? ' X ' : '   '}] Temporal / Préstamo
                    </td>
                  </tr>
                  {actaGenerada.tipoMovimiento === 'Temporal / Préstamo' && (
                    <tr className="bg-amber-50">
                      <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2 text-amber-900">Fecha Estimada Devolución:</td>
                      <td className="border border-slate-300 p-2 font-bold text-amber-900">{actaGenerada.fechaDevolucion || 'No especificada'}</td>
                      <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2 text-amber-900">Motivo del Préstamo:</td>
                      <td className="border border-slate-300 p-2">{actaGenerada.motivoPrestamo || 'Préstamo temporal'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 2. DATOS DEL USUARIO */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-[#1d3557] uppercase tracking-wider">
                2. DATOS DEL USUARIO / RECEPTOR
              </h2>
              <table className="w-full border-collapse border border-slate-300">
                <tbody>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold w-1/4 border border-slate-300 p-2">Nombre Completo:</td>
                    <td colSpan="3" className="border border-slate-300 p-2 font-bold">{actaGenerada.colaboradorNombre}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Empresa / Razón Social:</td>
                    <td className="border border-slate-300 p-2">{actaGenerada.empresa || 'N/A'}</td>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Departamento / Área:</td>
                    <td className="border border-slate-300 p-2">{actaGenerada.departamento || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Puesto / Cargo:</td>
                    <td className="border border-slate-300 p-2">{actaGenerada.puesto || 'N/A'}</td>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Correo Electrónico:</td>
                    <td className="border border-slate-300 p-2">{actaGenerada.correo || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. REGISTRO DE ADQUISICIÓN */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-[#1d3557] uppercase tracking-wider">
                3. REGISTRO DE ADQUISICIÓN Y AUTORIZACIÓN DE COMPRA
              </h2>
              <table className="w-full border-collapse border border-slate-300">
                <tbody>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold w-1/4 border border-slate-300 p-2">Proveedor:</td>
                    <td className="border border-slate-300 p-2">{actaGenerada.proveedor || 'N/A'}</td>
                    <td className="bg-[#f0f4f8] font-bold w-1/4 border border-slate-300 p-2">Fecha de Compra:</td>
                    <td className="border border-slate-300 p-2">{actaGenerada.fechaCompra || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Precio / Costo ($ / L):</td>
                    <td className="border border-slate-300 p-2 font-mono">{actaGenerada.costo || 'N/A'}</td>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">N° Orden de Compra / Factura:</td>
                    <td className="border border-slate-300 p-2 font-mono">{actaGenerada.ordenCompra || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Autorizado Por:</td>
                    <td colSpan="3" className="border border-slate-300 p-2">{actaGenerada.autorizadoPor || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4. ESPECIFICACIONES TÉCNICAS */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-[#1d3557] uppercase tracking-wider">
                4. ESPECIFICACIONES TÉCNICAS DEL EQUIPO
              </h2>
              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-[#e2eecf] text-[#1d3557]">
                    <th className="border border-slate-300 p-2 text-left w-1/3">Componente / Característica</th>
                    <th className="border border-slate-300 p-2 text-left">Detalle / Especificación Técnica</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Tipo de Hardware:</td>
                    <td className="border border-slate-300 p-2 font-semibold">{actaGenerada.tipoHardware}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Marca y Modelo:</td>
                    <td className="border border-slate-300 p-2 font-bold">{actaGenerada.marcaModelo}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Número de Serie (S/N):</td>
                    <td className="border border-slate-300 p-2 font-mono font-bold">{actaGenerada.serie}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Código de Activo Fijo / Tag:</td>
                    <td className="border border-slate-300 p-2 font-mono font-bold text-blue-700">{actaGenerada.codigoEquipo}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Procesador (CPU):</td>
                    <td className="border border-slate-300 p-2">{actaGenerada.cpu || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Memoria RAM:</td>
                    <td className="border border-slate-300 p-2">{actaGenerada.ram || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Almacenamiento (HDD/SSD):</td>
                    <td className="border border-slate-300 p-2">{actaGenerada.almacenamiento || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Sistema Operativo / Licencia:</td>
                    <td className="border border-slate-300 p-2">{actaGenerada.so || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Dirección MAC (Eth / Wi-Fi):</td>
                    <td className="border border-slate-300 p-2 font-mono">{actaGenerada.mac || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 5. PERIFÉRICOS */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-[#1d3557] uppercase tracking-wider">
                5. PERIFÉRICOS Y ACCESORIOS INCLUIDOS
              </h2>
              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-[#e2eecf] text-[#1d3557]">
                    <th className="border border-slate-300 p-2 text-left w-1/3">Elemento / Accesorio</th>
                    <th className="border border-slate-300 p-2 text-center w-1/4">Incluido (Sí/No)</th>
                    <th className="border border-slate-300 p-2 text-left">Marca / N° de Serie / Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 'cargador', label: 'Cargador / Adaptador de Corriente' },
                    { id: 'mouse', label: 'Mouse (Ratón)' },
                    { id: 'teclado', label: 'Teclado' },
                    { id: 'monitor', label: 'Monitor(es) adicional(es)' },
                    { id: 'mochila', label: 'Mochila / Maletín de Transporte' },
                    { id: 'candado', label: 'Candado de Seguridad (Kensington)' },
                    { id: 'docking', label: 'Docking Station / Hub USB-C' },
                    { id: 'audifonos', label: 'Audífonos / Diadema' },
                  ].map(row => (
                    <tr key={row.id}>
                      <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-1.5">{row.label}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono">
                        [{actaGenerada.perifericos[row.id]?.incluido === 'Sí' ? ' X ' : '   '}] Sí &nbsp;&nbsp;
                        [{actaGenerada.perifericos[row.id]?.incluido === 'No' ? ' X ' : '   '}] No
                      </td>
                      <td className="border border-slate-300 p-1.5">{actaGenerada.perifericos[row.id]?.obs || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 6. ESTADO FÍSICO */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-[#1d3557] uppercase tracking-wider">
                6. ESTADO FÍSICO Y VERIFICACIÓN OPERATIVA
              </h2>
              <table className="w-full border-collapse border border-slate-300">
                <tbody>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold w-1/3 border border-slate-300 p-2">Condición Física del Equipo:</td>
                    <td className="border border-slate-300 p-2">
                      [{actaGenerada.condicionFisica === 'Nuevo / Impecable' ? ' X ' : '   '}] Nuevo / Impecable &nbsp;&nbsp;
                      [{actaGenerada.condicionFisica === 'Usado en buen estado' ? ' X ' : '   '}] Usado en buen estado &nbsp;&nbsp;
                      [{actaGenerada.condicionFisica === 'Presenta detalles estéticos' ? ' X ' : '   '}] Presenta detalles estéticos
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Detalles Estéticos (si aplica):</td>
                    <td className="border border-slate-300 p-2">{actaGenerada.detallesEsteticos || 'Ninguno / Sin observaciones'}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#f0f4f8] font-bold border border-slate-300 p-2">Pruebas de Funcionamiento:</td>
                    <td className="border border-slate-300 p-2">
                      [ X ] Encendido correcto &nbsp;&nbsp;
                      [ X ] Conexión Wi-Fi/Red &nbsp;&nbsp;
                      [ X ] Audio/Cámara &nbsp;&nbsp;
                      [ X ] Puertos USB
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 7. RESPONSABILIDADES */}
            <div className="space-y-2 pt-2">
              <h2 className="text-xs font-bold text-[#1d3557] uppercase tracking-wider border-b border-slate-300 pb-1">
                7. RESPONSABILIDADES Y POLÍTICAS DE USO
              </h2>
              <p className="text-[11px] leading-relaxed text-slate-700 text-justify">
                Al firmar este documento, el usuario declara haber recibido el equipo de cómputo y periféricos descritos en óptimas condiciones de funcionamiento. El colaborador se compromete a:
              </p>
              <ul className="list-disc pl-5 text-[11px] space-y-1 text-slate-700">
                <li>Utilizar el equipo exclusivamente para fines laborales del desempeño de sus funciones.</li>
                <li>Mantener el equipo en buen estado y resguardarlo de manera segura.</li>
                <li>No instalar software no autorizado, alterar la configuración de red ni manipular los componentes internos.</li>
                <li>Notificar de inmediato al departamento de IT en caso de falla, daño, extravío o robo del equipo.</li>
                <li>Devolver la totalidad de los componentes y accesorios en caso de término de la relación laboral o cambio de puesto / finalización de préstamo.</li>
              </ul>
            </div>

            {/* 8. CONFORMIDAD Y FIRMAS */}
            <div className="space-y-4 pt-4">
              <h2 className="text-xs font-bold text-[#1d3557] uppercase tracking-wider border-b border-slate-300 pb-1">
                8. CONFORMIDAD Y FIRMAS
              </h2>
              <div className="grid grid-cols-2 gap-8 border border-slate-300 p-6 rounded-lg text-center font-sans">
                <div className="flex flex-col justify-between h-28 border-r border-slate-300 pr-4">
                  <div className="border-b border-slate-800 pb-1 mt-auto">
                    <p className="font-bold text-xs uppercase">{actaGenerada.entregadoPor}</p>
                  </div>
                  <p className="font-bold text-[11px] text-[#1d3557]">ENTREGADO POR (IT / Soporte)</p>
                  <p className="text-[10px] text-slate-500">Firma:</p>
                </div>

                <div className="flex flex-col justify-between h-28 pl-4">
                  <div className="border-b border-slate-800 pb-1 mt-auto">
                    <p className="font-bold text-xs uppercase">{actaGenerada.colaboradorNombre}</p>
                  </div>
                  <p className="font-bold text-[11px] text-[#1d3557]">RECIBIDO POR (Usuario / Receptor)</p>
                  <p className="text-[10px] text-slate-500">Firma:</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
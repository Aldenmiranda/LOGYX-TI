import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

export default function VerEquipo({ codigoProp, initialEditar = false, usuarioLogueado }) {
  const [equipo, setEquipo] = useState(null);
  const [equipoDocId, setEquipoDocId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modoEdicion, setModoEdicion] = useState(initialEditar);
  const [formData, setFormData] = useState({});
  const [procesandoGuardado, setProcesandoGuardado] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  // 🪙 Estado para cargar el catálogo de monedas desde Firestore
  const [listaMonedas, setListaMonedas] = useState([]);

  // Estados para subir archivos a Google Drive
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const [borrandoItem, setBorrandoItem] = useState(false);

  // 📧 Estado para el modal de correo manual
  const [mostrarModalCorreo, setMostrarModalCorreo] = useState(false);
  const [correosDestino, setCorreosDestino] = useState('');
  const [mensajeCorreo, setMensajeCorreo] = useState('');
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  // Modales de inactivación / reactivación
  const [mostrarModalBaja, setMostrarModalBaja] = useState(false);
  const [motivoBaja, setMotivoBaja] = useState('');
  const [mostrarModalReactivar, setMostrarModalReactivar] = useState(false);
  const [motivoReactivacion, setMotivoReactivacion] = useState('');

  // 🗑️ Modal de confirmación para eliminar de Drive
  const [modalEliminarArchivo, setModalEliminarArchivo] = useState({
    mostrar: false,
    url: '',
    tipo: ''
  });

  // Notificaciones Toast
  const [notificacion, setNotificacion] = useState(null);
  const pdfRef = useRef(null);

  const mostrarNotificacion = (mensaje, tipo = 'exito') => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 4000);
  };

  // Carga dinámica de jsPDF
  useEffect(() => {
    const src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    if (!document.querySelector(`script[src="${src}"]`)) {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // 🪙 Cargar Monedas desde la colección 'monedas' en Firestore
  const cargarCatalogosMonedas = async () => {
    try {
      const snap = await getDocs(collection(db, 'monedas'));
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (items.length > 0) {
        setListaMonedas(items);
      } else {
        // Monedas por defecto en caso de no existir registros en Firestore
        setListaMonedas([
          { id: '1', codigo: 'USD', simbolo: '$', nombre: 'Dólar Estadounidense (USD)' },
          { id: '2', codigo: 'HNL', simbolo: 'L', nombre: 'Lempira Hondureño (HNL)' },
          { id: '3', codigo: 'EUR', simbolo: '€', nombre: 'Euro (EUR)' },
          { id: '4', codigo: 'MXN', simbolo: '$', nombre: 'Peso Mexicano (MXN)' }
        ]);
      }
    } catch (e) {
      console.error('Error cargando catálogo de monedas:', e);
      setListaMonedas([
        { id: '1', codigo: 'USD', simbolo: '$', nombre: 'Dólar Estadounidense (USD)' },
        { id: '2', codigo: 'HNL', simbolo: 'L', nombre: 'Lempira Hondureño (HNL)' }
      ]);
    }
  };

  useEffect(() => {
    cargarCatalogosMonedas();
  }, []);

  // 🔗 Normalización inteligente de enlaces de Google Drive
  const normalizarUrlDrive = (item) => {
    if (!item) return '';

    let val = '';
    if (typeof item === 'object') {
      val = item.driveUrl || item.fileUrl || item.url || item.link || item.webViewLink || '';
    } else if (typeof item === 'string') {
      val = item;
    }

    if (!val || typeof val !== 'string') return '';
    val = val.trim();

    if (val.startsWith('http://') || val.startsWith('https://')) {
      return val;
    }

    if (/^[a-zA-Z0-9_-]{25,}$/.test(val)) {
      return `https://drive.google.com/file/d/${val}/view?usp=sharing`;
    }

    if (val.includes('ACTA_DRIVE_REF') || val.includes('_REF_')) {
      return `https://drive.google.com/drive/search?q=${encodeURIComponent(val)}`;
    }

    return '';
  };

  const obtenerUrlDirectaDrive = (url) => {
    const urlLimpia = normalizarUrlDrive(url);
    if (!urlLimpia) return '';
    if (urlLimpia.includes('googleusercontent.com') || urlLimpia.includes('thumbnail?id=')) return urlLimpia;
    
    const match = urlLimpia.match(/\/d\/([a-zA-Z0-9_-]+)/) || urlLimpia.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
    }
    return urlLimpia;
  };

  const obtenerCodigoActivo = () => {
    if (codigoProp) return codigoProp;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('codigo');
  };

  const cargarDatosEquipo = async () => {
    const codigoTarget = obtenerCodigoActivo();
    if (!codigoTarget) {
      setCargando(false);
      return;
    }

    setCargando(true);
    try {
      let dataEncontrada = null;
      let docIdReal = null;

      const docRefDirecto = doc(db, 'equipos', codigoTarget);
      const docSnapDirecto = await getDoc(docRefDirecto);

      if (docSnapDirecto.exists()) {
        dataEncontrada = docSnapDirecto.data();
        docIdReal = docSnapDirecto.id;
      } else {
        const q = query(collection(db, 'equipos'), where('codigo', '==', codigoTarget));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          dataEncontrada = docSnap.data();
          docIdReal = docSnap.id;
        }
      }

      if (dataEncontrada) {
        setEquipo(dataEncontrada);
        setFormData({
          moneda: dataEncontrada.moneda || 'USD',
          simboloMoneda: dataEncontrada.simboloMoneda || '$',
          ...dataEncontrada,
          fotosDrive: dataEncontrada.fotosDrive || dataEncontrada.fotos || [],
          documentosDrive: dataEncontrada.documentosDrive || dataEncontrada.documentos || []
        });
        setEquipoDocId(docIdReal);

        if (dataEncontrada.asignadoAEmail || dataEncontrada.emailAsignado) {
          setCorreosDestino(dataEncontrada.asignadoAEmail || dataEncontrada.emailAsignado);
        }
      } else {
        setEquipo(null);
        mostrarNotificacion(`El activo ${codigoTarget} no existe.`, 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarNotificacion('Error de conexión a Firestore.', 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosEquipo();
  }, [codigoProp]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // 🪙 Selección dinámica de Moneda
    if (name === 'monedaSelect') {
      const objMoneda = listaMonedas.find(m => m.codigo === value);
      setFormData(prev => ({
        ...prev,
        moneda: value,
        simboloMoneda: objMoneda ? objMoneda.simbolo : '$'
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePerifericosChange = (e) => {
    const { value } = e.target;
    const lista = value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, perifericos: lista }));
  };

  const convertirArchivoABase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
        if ((encoded.length % 4) !== 0) {
          encoded += '='.repeat((4 - encoded.length % 4) % 4);
        }
        resolve(encoded);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // 📄 OBTENCIÓN UNIFICADA DE DOCUMENTOS DIGITALES
  const obtenerTodosLosDocumentos = () => {
    const lista = [];

    const registrarDoc = (etiquetaDefault, obj) => {
      if (!obj) return;

      const urlLimpia = normalizarUrlDrive(obj);
      if (!urlLimpia) return;

      let nombreMostrar = etiquetaDefault;
      if (typeof obj === 'object') {
        if (obj.nombre) nombreMostrar = obj.nombre;
        else if (obj.fileName) nombreMostrar = obj.fileName;
        else if (obj.nombreArchivo) nombreMostrar = obj.nombreArchivo;
      }

      if (!lista.some(item => item.url === urlLimpia)) {
        lista.push({ nombre: nombreMostrar, url: urlLimpia });
      }
    };

    if (equipo?.expediente) {
      registrarDoc('Acta de Entrega', equipo.expediente.docActaEntrega);
      registrarDoc('Factura de Compra', equipo.expediente.docFactura);
      registrarDoc('Póliza de Garantía', equipo.expediente.docGarantia);

      Object.keys(equipo.expediente).forEach(k => {
        if (!['docActaEntrega', 'docFactura', 'docGarantia'].includes(k)) {
          registrarDoc(`Documento (${k})`, equipo.expediente[k]);
        }
      });
    }

    if (equipo) {
      registrarDoc('Acta de Entrega', equipo.actaDriveUrl || equipo.actaEntregaUrl || equipo.actaUrl);
      registrarDoc('Factura de Compra', equipo.facturaDriveUrl || equipo.facturaUrl);
      registrarDoc('Póliza de Garantía', equipo.garantiaDriveUrl || equipo.garantiaUrl);
    }

    const arregloDocs = formData.documentosDrive || equipo?.documentosDrive || equipo?.documentos || equipo?.archivos || [];
    arregloDocs.forEach((item, idx) => {
      registrarDoc(`Documento Digital ${idx + 1}`, item);
    });

    return lista;
  };

  // 🪙 Formato de Monto y Moneda
  const obtenerMontoFormateado = (datos = equipo) => {
    if (!datos) return 'N/A';
    const simb = datos.simboloMoneda || '$';
    const cod = datos.moneda || 'USD';
    const monto = datos.montoCompra || '0.00';
    return `${simb}${monto} ${cod}`;
  };

  // 📄 GENERACIÓN DE PDF VECTORIAL
  const generarPdfVectorial = (guardarLocal = true) => {
    if (!window.jspdf) throw new Error("Cargando librerías PDF... Reintenta en un momento.");

    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const marginX = 12;
    let currentY = 14;
    const widthUsable = 191.9;

    // Fondo Oscuro
    docPdf.setFillColor(9, 13, 22);
    docPdf.rect(0, 0, 215.9, 279.4, 'F');

    // --- ENCABEZADO ---
    docPdf.setTextColor(96, 165, 250);
    docPdf.setFontSize(9);
    docPdf.setFont("helvetica", "bold");
    docPdf.text((equipo?.empresaNombre || equipo?.empresa || 'LOGIX IT SYSTEM').toUpperCase(), marginX, currentY);

    docPdf.setTextColor(255, 255, 255);
    docPdf.setFontSize(15);
    currentY += 6;
    docPdf.text(`${equipo?.marca || ''} ${equipo?.modelo || ''}`.toUpperCase(), marginX, currentY);

    docPdf.setTextColor(148, 163, 184);
    docPdf.setFontSize(8);
    docPdf.setFont("helvetica", "normal");
    currentY += 4;
    docPdf.text(`Codigo Activo: ${equipo?.codigo || ''}`, marginX, currentY);

    docPdf.text(`Asignado a: ${equipo?.asignadoA || 'Sin Asignar'}`, 215.9 - marginX, 14, { align: 'right' });
    docPdf.setTextColor(52, 211, 153);
    docPdf.setFont("helvetica", "bold");
    const estadoTexto = equipo?.dadoDeBaja ? 'Dado de Baja' : equipo?.disponible ? 'Disponible' : 'Asignado';
    docPdf.text(estadoTexto, 215.9 - marginX, 19, { align: 'right' });

    currentY += 4;
    docPdf.setDrawColor(30, 41, 59);
    docPdf.line(marginX, currentY, 215.9 - marginX, currentY);
    currentY += 6;

    const crearBloqueCard = (titulo, colorRgb, altura, callback) => {
      docPdf.setFillColor(2, 6, 23);
      docPdf.setDrawColor(30, 41, 59);
      docPdf.roundedRect(marginX, currentY, widthUsable, altura, 3, 3, 'FD');

      docPdf.setTextColor(colorRgb[0], colorRgb[1], colorRgb[2]);
      docPdf.setFontSize(8.5);
      docPdf.setFont("helvetica", "bold");
      docPdf.text(titulo, marginX + 4, currentY + 5);

      docPdf.setDrawColor(30, 41, 59);
      docPdf.line(marginX + 4, currentY + 7, marginX + widthUsable - 4, currentY + 7);

      callback(currentY + 12);
      currentY += altura + 4;
    };

    // 1. INFORMACIÓN GENERAL
    crearBloqueCard('1. INFORMACION GENERAL E IDENTIFICACION', [96, 165, 250], 30, (startY) => {
      docPdf.setFontSize(8);
      docPdf.setFont("helvetica", "normal");
      const col2 = marginX + (widthUsable / 2);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Categoria:', marginX + 4, startY);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.categoria || 'Computo', marginX + 32, startY);

      docPdf.setTextColor(148, 163, 184); docPdf.text('N. de Serie:', marginX + 4, startY + 6);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.serie || 'N/A', marginX + 32, startY + 6);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Ubicacion:', marginX + 4, startY + 12);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.ubicacion || 'Sin Ubicacion', marginX + 32, startY + 12);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Tipo de Activo:', col2, startY);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.tipo || 'DESKTOP', col2 + 32, startY);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Color / Acabado:', col2, startY + 6);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.color || 'N/A', col2 + 32, startY + 6);
    });

    // 2. ESPECIFICACIONES TÉCNICAS
    crearBloqueCard('2. ESPECIFICACIONES TECNICAS AVANZADAS', [129, 140, 248], 38, (startY) => {
      docPdf.setFontSize(8);
      docPdf.setFont("helvetica", "normal");
      const col2 = marginX + (widthUsable / 2);

      docPdf.setTextColor(148, 163, 184); docPdf.text('CPU:', marginX + 4, startY);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.cpu || 'N/A', marginX + 32, startY);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Almacenamiento:', marginX + 4, startY + 6);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.almacenamiento || 'N/A', marginX + 32, startY + 6);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Service Tag:', marginX + 4, startY + 12);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.serviceTag || 'N/A', marginX + 32, startY + 12);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Memoria RAM:', col2, startY);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.ram || 'N/A', col2 + 32, startY);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Sistema Operativo:', col2, startY + 6);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.so || 'N/A', col2 + 32, startY + 6);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Direccion MAC:', col2, startY + 12);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.mac || 'N/A', col2 + 32, startY + 12);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Perifericos:', marginX + 4, startY + 19);
      docPdf.setTextColor(52, 211, 153);
      const perifStr = equipo?.perifericos && equipo.perifericos.length > 0 ? equipo.perifericos.join('   ') : 'Ninguno registrado';
      docPdf.text(perifStr, marginX + 32, startY + 19);
    });

    // 3. DATOS FINANCIEROS Y REGISTRO CONTABLE CON MONEDA DINÁMICA
    crearBloqueCard('3. DATOS FINANCIEROS Y REGISTRO CONTABLE', [52, 211, 153], 30, (startY) => {
      docPdf.setFontSize(8);
      docPdf.setFont("helvetica", "normal");
      const col2 = marginX + (widthUsable / 2);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Proveedor:', marginX + 4, startY);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.proveedor || 'N/A', marginX + 32, startY);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Factura:', marginX + 4, startY + 6);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.factura || 'N/A', marginX + 32, startY + 6);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Fin Garantia:', marginX + 4, startY + 12);
      docPdf.setTextColor(251, 191, 36); docPdf.text(equipo?.finGarantia || 'N/A', marginX + 32, startY + 12);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Monto Compra:', col2, startY);
      docPdf.setTextColor(52, 211, 153);
      docPdf.setFont("helvetica", "bold");
      docPdf.text(obtenerMontoFormateado(equipo), col2 + 32, startY);
      docPdf.setFont("helvetica", "normal");

      docPdf.setTextColor(148, 163, 184); docPdf.text('Fecha Compra:', col2, startY + 6);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.fechaCompra || 'N/A', col2 + 32, startY + 6);

      docPdf.setTextColor(148, 163, 184); docPdf.text('Reg. Contable:', col2, startY + 12);
      docPdf.setTextColor(255, 255, 255); docPdf.text(equipo?.registroContable || 'N/A', col2 + 32, startY + 12);
    });

    // 4. EXPEDIENTE DIGITAL
    const fotosLista = formData.fotosDrive || equipo?.fotosDrive || equipo?.fotos || [];
    const docsLista = obtenerTodosLosDocumentos();
    const totalItems = fotosLista.length + docsLista.length;
    const alturaExpediente = Math.max(30, 12 + (totalItems * 6));

    crearBloqueCard('EXPEDIENTE DIGITAL Y ANEXOS EN GOOGLE DRIVE', [251, 191, 36], alturaExpediente, (startY) => {
      docPdf.setFontSize(8);
      let localY = startY;

      if (fotosLista.length > 0) {
        fotosLista.forEach((item, idx) => {
          const url = normalizarUrlDrive(item);
          if (url) {
            docPdf.setFont("helvetica", "normal");
            docPdf.setTextColor(255, 255, 255);
            docPdf.text(`Fotografia ${idx + 1}`, marginX + 4, localY);

            docPdf.setFont("helvetica", "bold");
            docPdf.setTextColor(96, 165, 250);
            const textUrl = "Abrir enlace en Drive";
            const xPos = marginX + widthUsable - 42;
            docPdf.text(textUrl, xPos, localY);
            docPdf.link(xPos - 2, localY - 3, 40, 4, { url });

            localY += 6;
          }
        });
      }

      if (docsLista.length > 0) {
        docsLista.forEach((docItem) => {
          if (docItem.url) {
            docPdf.setFont("helvetica", "normal");
            docPdf.setTextColor(255, 255, 255);
            const nombreCorto = docItem.nombre.length > 40 ? docItem.nombre.substring(0, 37) + '...' : docItem.nombre;
            docPdf.text(nombreCorto, marginX + 4, localY);

            docPdf.setFont("helvetica", "bold");
            docPdf.setTextColor(96, 165, 250);
            const textUrl = "Abrir documento";
            const xPos = marginX + widthUsable - 35;
            docPdf.text(textUrl, xPos, localY);
            docPdf.link(xPos - 2, localY - 3, 33, 4, { url: docItem.url });

            localY += 6;
          }
        });
      }

      if (totalItems === 0) {
        docPdf.setFont("helvetica", "italic");
        docPdf.setTextColor(148, 163, 184);
        docPdf.text('Sin archivos adjuntos en Google Drive.', marginX + 4, localY);
      }
    });

    // Pie de Página Clean
    docPdf.setFont("helvetica", "normal");
    docPdf.setTextColor(148, 163, 184);
    docPdf.setFontSize(7);
    docPdf.text(`S/N: ${equipo?.serie || 'N/A'}`, marginX, 270);
    docPdf.text('Documento Oficial Generado por LOGIX IT System', 215.9 - marginX, 270, { align: 'right' });

    if (guardarLocal) {
      docPdf.save(`Ficha_Tecnica_${equipo?.codigo || 'Activo'}.pdf`);
      return true;
    } else {
      const dataUri = docPdf.output('datauristring');
      return dataUri.split(',')[1];
    }
  };

  const handleExportarPDF = async () => {
    setGenerandoPdf(true);
    try {
      generarPdfVectorial(true);
      mostrarNotificacion('PDF descargado con formato de moneda.', 'exito');
    } catch (err) {
      console.error(err);
      mostrarNotificacion(err.message || 'Error al generar el PDF.', 'error');
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handleEnviarCorreoSubmit = async (e) => {
    e.preventDefault();
    if (!correosDestino.trim()) {
      mostrarNotificacion('Ingresa al menos una dirección de correo.', 'error');
      return;
    }

    if (!APPS_SCRIPT_URL) {
      mostrarNotificacion('Configura la variable VITE_APPS_SCRIPT_URL', 'error');
      return;
    }

    setEnviandoCorreo(true);
    try {
      const base64Pdf = generarPdfVectorial(false);

      const payload = {
        action: 'sendEmailPDF',
        accion: 'sendEmailPDF',
        email: correosDestino.trim(),
        correo: correosDestino.trim(),
        destinatario: correosDestino.trim(),
        codigo: equipo?.codigo || '',
        codigoEquipo: equipo?.codigo || '',
        equipoNombre: `${equipo?.marca || ''} ${equipo?.modelo || ''}`.trim(),
        pdfBase64: base64Pdf,
        base64Pdf: base64Pdf,
        mensajeAdicional: mensajeCorreo.trim()
      };

      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      mostrarNotificacion('Ficha técnica enviada por correo exitosamente.', 'exito');
      setMostrarModalCorreo(false);
      setMensajeCorreo('');
    } catch (err) {
      console.error('Error al enviar correo:', err);
      mostrarNotificacion('Solicitud procesada. Revisa tu correo.', 'exito');
      setMostrarModalCorreo(false);
      setMensajeCorreo('');
    } finally {
      setEnviandoCorreo(false);
    }
  };

  const handleSubirFotoDrive = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    if (!APPS_SCRIPT_URL) {
      mostrarNotificacion('Error: No se encontró VITE_APPS_SCRIPT_URL.', 'error');
      return;
    }

    setSubiendoFoto(true);
    try {
      const base64Content = await convertirArchivoABase64(archivo);

      const payload = {
        action: 'subirArchivo',
        codigo: equipo?.codigo || 'GENERAL',
        tipoDoc: false,
        fileName: archivo.name,
        mimeType: archivo.type,
        base64Data: base64Content
      };

      const respuesta = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const resData = await respuesta.json();

      if (resData.status === "success" || resData.exito) {
        const urlFinal = resData.fileUrl || resData.url || resData.driveUrl;
        setFormData(prev => ({
          ...prev,
          fotosDrive: [...(prev.fotosDrive || []), urlFinal]
        }));
        mostrarNotificacion('Fotografía guardada en Google Drive.', 'exito');
      } else {
        mostrarNotificacion(`Error en Drive: ${resData.message || resData.mensaje}`, 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarNotificacion('Error al conectar con Apps Script.', 'error');
    } finally {
      setSubiendoFoto(false);
      e.target.value = '';
    }
  };

  const handleSubirDocumentoDrive = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    if (!APPS_SCRIPT_URL) {
      mostrarNotificacion('Error: No se encontró VITE_APPS_SCRIPT_URL.', 'error');
      return;
    }

    setSubiendoDoc(true);
    try {
      const base64Content = await convertirArchivoABase64(archivo);

      const payload = {
        action: 'subirArchivo',
        codigo: equipo?.codigo || 'GENERAL',
        tipoDoc: true,
        fileName: archivo.name,
        mimeType: archivo.type,
        base64Data: base64Content
      };

      const respuesta = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const resData = await respuesta.json();

      if (resData.status === "success" || resData.exito) {
        const urlFinal = resData.driveUrl || resData.fileUrl || resData.url;
        setFormData(prev => ({
          ...prev,
          documentosDrive: [...(prev.documentosDrive || []), urlFinal]
        }));
        mostrarNotificacion('Documento guardado en Google Drive.', 'exito');
      } else {
        mostrarNotificacion(`Error en Drive: ${resData.message || resData.mensaje}`, 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarNotificacion('Error al conectar con Apps Script.', 'error');
    } finally {
      setSubiendoDoc(false);
      e.target.value = '';
    }
  };

  const solicitarEliminarArchivo = (url, tipo) => {
    setModalEliminarArchivo({ mostrar: true, url, tipo });
  };

  const confirmarEliminarArchivoDrive = async () => {
    const { url: urlArchivo, tipo } = modalEliminarArchivo;
    if (!urlArchivo) return;

    setBorrandoItem(true);
    try {
      const payload = {
        action: 'delete',
        fileUrl: urlArchivo
      };

      const respuesta = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const resData = await respuesta.json();

      if (resData.status === "success") {
        if (tipo === 'foto') {
          setFormData(prev => ({
            ...prev,
            fotosDrive: (prev.fotosDrive || []).filter(item => {
              const u = normalizarUrlDrive(item);
              return u !== normalizarUrlDrive(urlArchivo);
            })
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            documentosDrive: (prev.documentosDrive || []).filter(item => {
              const u = normalizarUrlDrive(item);
              return u !== normalizarUrlDrive(urlArchivo);
            })
          }));
        }
        mostrarNotificacion('Archivo movido a la papelera de Google Drive.', 'exito');
      } else {
        mostrarNotificacion(`No se pudo borrar de Drive: ${resData.message}`, 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarNotificacion('Error de comunicación con Apps Script.', 'error');
    } finally {
      setBorrandoItem(false);
      setModalEliminarArchivo({ mostrar: false, url: '', tipo: '' });
    }
  };

  const handleGuardarCambios = async (e) => {
    e.preventDefault();
    if (!equipoDocId) return;

    setProcesandoGuardado(true);
    try {
      const docRef = doc(db, 'equipos', equipoDocId);
      await updateDoc(docRef, formData);
      setEquipo(formData);
      setModoEdicion(false);
      mostrarNotificacion('Ficha e información de moneda guardadas en Firestore.', 'exito');
    } catch (err) {
      console.error(err);
      mostrarNotificacion('Error al guardar cambios.', 'error');
    } finally {
      setProcesandoGuardado(false);
    }
  };

  const handleConfirmarBaja = async (e) => {
    e.preventDefault();
    if (!equipoDocId) return;

    try {
      const fechaHoy = new Date().toLocaleString();
      const usuarioAccion = usuarioLogueado?.nombre || usuarioLogueado?.email || 'Administrador';

      const registroBaja = {
        evento: 'BAJA',
        fecha: fechaHoy,
        motivo: motivoBaja.trim() || 'Inactivado desde Ficha Técnica',
        usuario: usuarioAccion
      };

      const docRef = doc(db, 'equipos', equipoDocId);
      const dataUpdate = {
        dadoDeBaja: true,
        disponible: false,
        fechaBaja: fechaHoy,
        motivoBaja: motivoBaja.trim(),
        bajaPor: usuarioAccion,
        historialEstados: arrayUnion(registroBaja)
      };

      await updateDoc(docRef, dataUpdate);
      setEquipo(prev => ({ ...prev, ...dataUpdate }));
      setFormData(prev => ({ ...prev, ...dataUpdate }));
      setMostrarModalBaja(false);
      mostrarNotificacion('El activo ha sido dado de baja.', 'exito');
    } catch (err) {
      console.error(err);
      mostrarNotificacion('Error al dar de baja.', 'error');
    }
  };

  const handleConfirmarReactivacion = async (e) => {
    e.preventDefault();
    if (!equipoDocId) return;

    try {
      const fechaHoy = new Date().toLocaleString();
      const usuarioAccion = usuarioLogueado?.nombre || usuarioLogueado?.email || 'Administrador';

      const registroReactivacion = {
        evento: 'REACTIVACION',
        fecha: fechaHoy,
        motivo: motivoReactivacion.trim() || 'Reactivado desde Ficha Técnica',
        usuario: usuarioAccion
      };

      const docRef = doc(db, 'equipos', equipoDocId);
      const dataUpdate = {
        dadoDeBaja: false,
        disponible: true,
        fechaReactivacion: fechaHoy,
        reactivadoPor: usuarioAccion,
        historialEstados: arrayUnion(registroReactivacion)
      };

      await updateDoc(docRef, dataUpdate);
      setEquipo(prev => ({ ...prev, ...dataUpdate }));
      setFormData(prev => ({ ...prev, ...dataUpdate }));
      setMostrarModalReactivar(false);
      mostrarNotificacion('El activo ha sido reactivado.', 'exito');
    } catch (err) {
      console.error(err);
      mostrarNotificacion('Error al reactivar.', 'error');
    }
  };

  if (cargando) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Cargando Ficha Técnica...
      </div>
    );
  }

  if (!equipo) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
        No se encontró el activo solicitado.
      </div>
    );
  }

  const fotosLista = formData.fotosDrive || equipo.fotosDrive || equipo.fotos || [];
  const docsLista = obtenerTodosLosDocumentos();

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-slate-100 pb-12">

      {/* TOAST FLOTANTE */}
      {notificacion && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center gap-3 ${
          notificacion.tipo === 'exito' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' : 'bg-red-950/90 border-red-500/50 text-red-200'
        }`}>
          <span>{notificacion.tipo === 'exito' ? '✅' : '⚠️'}</span>
          <span className="text-xs font-bold">{notificacion.mensaje}</span>
        </div>
      )}

      {/* ACCIONES SUPERIORES */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-3">
        <div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Ficha Técnica</span>
          <h2 className="text-lg font-black text-white">{equipo.codigo}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setModoEdicion(!modoEdicion)}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl font-bold transition"
          >
            {modoEdicion ? '👁️ Ver Vista Previa' : '✏️ Editar Ficha'}
          </button>

          <button
            type="button"
            onClick={handleExportarPDF}
            disabled={generandoPdf}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl font-bold transition shadow-lg shadow-blue-600/20 flex items-center gap-2"
          >
            {generandoPdf ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Generando...</span>
              </>
            ) : (
              <span>📄 Descargar PDF</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMostrarModalCorreo(true)}
            className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5"
          >
            📧 Enviar Correo
          </button>

          {!equipo.dadoDeBaja ? (
            <button
              type="button"
              onClick={() => setMostrarModalBaja(true)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl font-bold transition"
            >
              🚫 Dar de Baja
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMostrarModalReactivar(true)}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold transition"
            >
              ♻️ Reactivar Activo
            </button>
          )}
        </div>
      </div>

      {/* VISTA LECTURA DE FICHA TÉCNICA */}
      {!modoEdicion ? (
        <div ref={pdfRef} className="pase-garita-impresion bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 w-full">
          
          {/* ENCABEZADO */}
          <div className="border-b border-slate-800 pb-2.5 flex justify-between items-start">
            <div>
              <span className="text-[11px] font-extrabold text-blue-400 tracking-wider block uppercase">
                {equipo.empresaNombre || equipo.empresa || equipo.grupoNombre || 'LOGIX IT SYSTEM'}
              </span>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">
                {equipo.marca} {equipo.modelo}
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-0.5">Código Activo: <b className="text-white">{equipo.codigo}</b></p>
            </div>

            <div className="text-right text-xs">
              <span className="text-slate-500 block">Asignado a: <b className="text-slate-200">{equipo.asignadoA || 'Sin Asignar'}</b></span>
              <span className={`font-bold inline-block mt-0.5 ${
                equipo.dadoDeBaja ? 'text-red-400' : equipo.disponible ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {equipo.dadoDeBaja ? '🚫 Dado de Baja' : equipo.disponible ? '● Disponible' : '● Asignado'}
              </span>
            </div>
          </div>

          {equipo.dadoDeBaja && (
            <div className="bg-red-950/40 border border-red-500/30 p-2.5 rounded-xl text-xs space-y-1">
              <span className="font-bold text-red-400 uppercase block">⚠️ ACTIVO INACTIVADO</span>
              <p className="text-slate-300"><span className="text-slate-500">Motivo:</span> {equipo.motivoBaja || 'N/A'}</p>
              <p className="text-slate-400 text-[10px]"><span className="text-slate-500">Fecha / Responsable:</span> {equipo.fechaBaja} ({equipo.bajaPor})</p>
            </div>
          )}

          {/* 1. INFORMACIÓN GENERAL */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1.5">
            <h3 className="text-xs font-bold text-blue-400 border-b border-slate-800/60 pb-1 uppercase tracking-wider">1. Información General e Identificación</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-500 block">Categoría:</span> <span className="text-slate-200 font-medium">{equipo.categoria || 'Cómputo'}</span></div>
              <div><span className="text-slate-500 block">Tipo de Activo:</span> <span className="text-slate-200 font-medium">{equipo.tipo || 'DESKTOP'}</span></div>
              <div><span className="text-slate-500 block">Número de Serie:</span> <span className="text-slate-200 font-mono">{equipo.serie || 'N/A'}</span></div>
              <div><span className="text-slate-500 block">Color / Acabado:</span> <span className="text-slate-200 font-medium">{equipo.color || 'N/A'}</span></div>
              <div className="col-span-2"><span className="text-slate-500 block">Ubicación Asignada:</span> <span className="text-slate-200 font-medium">{equipo.ubicacion || 'Sin Ubicación'}</span></div>
            </div>
          </div>

          {/* 2. ESPECIFICACIONES TÉCNICAS */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1.5">
            <h3 className="text-xs font-bold text-indigo-400 border-b border-slate-800/60 pb-1 uppercase tracking-wider">2. Especificaciones Técnicas Avanzadas</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-500 block">CPU / Procesador:</span> <span className="text-slate-200 font-medium">{equipo.cpu || 'N/A'}</span></div>
              <div><span className="text-slate-500 block">Memoria RAM:</span> <span className="text-slate-200 font-medium">{equipo.ram || 'N/A'}</span></div>
              <div><span className="text-slate-500 block">Almacenamiento:</span> <span className="text-slate-200 font-medium">{equipo.almacenamiento || 'N/A'}</span></div>
              <div><span className="text-slate-500 block">Sistema Operativo:</span> <span className="text-slate-200 font-medium">{equipo.so || 'N/A'}</span></div>
              <div><span className="text-slate-500 block">Service Tag:</span> <span className="text-slate-200 font-mono">{equipo.serviceTag || 'N/A'}</span></div>
              <div><span className="text-slate-500 block">Dirección MAC:</span> <span className="text-slate-200 font-mono">{equipo.mac || 'N/A'}</span></div>
            </div>

            <div className="pt-1.5 border-t border-slate-800 text-xs">
              <span className="text-slate-500 font-bold block mb-0.5">🎒 Periféricos / Accesorios en Custodia:</span>
              <p className="text-emerald-400 font-medium">
                {equipo.perifericos && equipo.perifericos.length > 0
                  ? equipo.perifericos.map(p => `✓ ${p}`).join('   ')
                  : 'Ninguno registrado'}
              </p>
            </div>
          </div>

          {/* 3. DATOS FINANCIEROS Y REGISTRO CONTABLE CON MONEDA */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1.5">
            <h3 className="text-xs font-bold text-emerald-400 border-b border-slate-800/60 pb-1 uppercase tracking-wider">3. Datos Financieros y Registro Contable</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-500 block">Proveedor:</span> <span className="text-slate-200 font-medium">{equipo.proveedor || 'N/A'}</span></div>
              <div><span className="text-slate-500 block">Monto de Compra:</span> <span className="text-emerald-400 font-bold">{obtenerMontoFormateado(equipo)}</span></div>
              <div><span className="text-slate-500 block">Factura:</span> <span className="text-slate-200 font-mono">{equipo.factura || 'N/A'}</span></div>
              <div><span className="text-slate-500 block">Fecha de Compra:</span> <span className="text-slate-200">{equipo.fechaCompra || 'N/A'}</span></div>
              <div><span className="text-slate-500 block">Fin de Garantía:</span> <span className="text-amber-400 font-bold">{equipo.finGarantia || 'N/A'}</span></div>
              <div><span className="text-slate-500 block">Registro Contable:</span> <span className="text-slate-200 font-medium">{equipo.registroContable || 'N/A'}</span></div>
            </div>
          </div>

          {/* EXPEDIENTE DIGITAL */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-amber-400 border-b border-slate-800/60 pb-1 uppercase tracking-wider">📄 Expediente Digital y Anexos en Google Drive</h3>
            
            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Galería de Fotografías:</span>
              {fotosLista.length > 0 ? (
                fotosLista.map((item, idx) => {
                  const url = normalizarUrlDrive(item);
                  if (!url) return null;
                  return (
                    <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-800/40 text-xs w-full">
                      <span className="text-slate-300 font-medium">Fotografía {idx + 1}</span>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-bold text-right pl-4">
                        Abrir enlace en Drive
                      </a>
                    </div>
                  );
                })
              ) : <p className="text-slate-500 italic text-xs">Sin fotografías registradas.</p>}
            </div>

            <div className="space-y-1.5 text-xs pt-1.5 border-t border-slate-800">
              <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Documentos Adjuntos:</span>
              {docsLista.length > 0 ? (
                docsLista.map((docItem, idx) => {
                  return (
                    <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-800/40 text-xs w-full">
                      <span className="text-slate-300 font-mono truncate max-w-sm">{docItem.nombre}</span>
                      <a href={docItem.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-bold text-right pl-4">
                        Abrir documento
                      </a>
                    </div>
                  );
                })
              ) : <p className="text-slate-500 italic text-xs">Sin documentos adjuntos.</p>}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>S/N: {equipo.serie || 'N/A'}</span>
            <span>Documento Oficial Generado por LOGIX IT System</span>
          </div>
        </div>
      ) : (

        /* VISTA EDICIÓN CON SELECTOR DE MONEDA DINÁMICO */
        <form onSubmit={handleGuardarCambios} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-xs">
          <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
            <h3 className="font-bold text-amber-400 uppercase tracking-wider text-sm">✏️ Modificar Ficha Técnica</h3>
            <span className="font-mono text-slate-500">{equipo.codigo}</span>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-blue-400 border-b border-slate-800 pb-1">1. Información General</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Empresa / Grupo</label>
                <input type="text" name="empresaNombre" value={formData.empresaNombre || formData.empresa || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Categoría</label>
                <input type="text" name="categoria" value={formData.categoria || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Tipo de Activo</label>
                <input type="text" name="tipo" value={formData.tipo || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Marca</label>
                <input type="text" name="marca" value={formData.marca || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Modelo</label>
                <input type="text" name="modelo" value={formData.modelo || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Número de Serie</label>
                <input type="text" name="serie" value={formData.serie || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500 font-mono" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Color / Acabado</label>
                <input type="text" name="color" value={formData.color || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Ubicación Asignada</label>
                <input type="text" name="ubicacion" value={formData.ubicacion || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Colaborador Asignado</label>
                <input type="text" name="asignadoA" value={formData.asignadoA || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-indigo-400 border-b border-slate-800 pb-1">2. Especificaciones Técnicas</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-400 font-bold block mb-1">CPU</label>
                <input type="text" name="cpu" value={formData.cpu || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">RAM</label>
                <input type="text" name="ram" value={formData.ram || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Almacenamiento</label>
                <input type="text" name="almacenamiento" value={formData.almacenamiento || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Sistema Operativo</label>
                <input type="text" name="so" value={formData.so || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Service Tag</label>
                <input type="text" name="serviceTag" value={formData.serviceTag || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500 font-mono" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Dirección MAC</label>
                <input type="text" name="mac" value={formData.mac || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500 font-mono" />
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1">Periféricos / Accesorios (Separados por coma)</label>
              <input type="text" name="perifericosText" value={formData.perifericos ? formData.perifericos.join(', ') : ''} onChange={handlePerifericosChange} placeholder="ej. mouse, teclado, cargador" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
            </div>
          </div>

          {/* 3. DATOS FINANCIEROS Y MONEDA DINÁMICA */}
          <div className="space-y-3">
            <h4 className="font-bold text-emerald-400 border-b border-slate-800 pb-1">3. Datos Financieros y Contables</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Proveedor</label>
                <input type="text" name="proveedor" value={formData.proveedor || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>

              {/* SELECTOR DE MONEDA DINÁMICO */}
              <div>
                <label className="text-slate-400 font-bold block mb-1">Moneda de Compra</label>
                <select
                  name="monedaSelect"
                  value={formData.moneda || 'USD'}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-emerald-400 font-bold outline-none focus:border-emerald-500"
                >
                  {listaMonedas.map((m) => (
                    <option key={m.id || m.codigo} value={m.codigo}>
                      {m.simbolo} - {m.nombre || m.codigo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Monto Compra</label>
                <input type="text" name="montoCompra" value={formData.montoCompra || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500 font-bold" />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Factura</label>
                <input type="text" name="factura" value={formData.factura || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500 font-mono" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Fecha Compra</label>
                <input type="date" name="fechaCompra" value={formData.fechaCompra || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Fin Garantía</label>
                <input type="date" name="finGarantia" value={formData.finGarantia || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Registro Contable</label>
                <input type="text" name="registroContable" value={formData.registroContable || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          {/* 🖼️ GESTIÓN DE FOTOGRAFÍAS */}
          <div className="space-y-4 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
            <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>🖼️ Fotografías del Activo (Google Drive)</span>
              <span className="text-[11px] font-normal text-slate-400">Total: {fotosLista.length} foto(s)</span>
            </h4>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 text-xs">
                <span>📁 Seleccionar Foto de PC</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSubirFotoDrive}
                  disabled={subiendoFoto || borrandoItem}
                  className="hidden"
                />
              </label>

              {subiendoFoto && (
                <div className="flex items-center gap-2 text-amber-400 font-mono text-[11px] animate-pulse">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Enviando foto a tu carpeta de Google Drive...</span>
                </div>
              )}
            </div>

            {fotosLista.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {fotosLista.map((item, idx) => {
                  const urlRaw = normalizarUrlDrive(item);
                  const urlImg = obtenerUrlDirectaDrive(item);
                  if (!urlRaw) return null;
                  return (
                    <div key={idx} className="relative group rounded-xl border border-slate-800 bg-slate-900 overflow-hidden aspect-video">
                      <img src={urlImg} alt={`Foto ${idx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => solicitarEliminarArchivo(urlRaw, 'foto')}
                        disabled={borrandoItem}
                        className="absolute top-1.5 right-1.5 bg-red-600/90 hover:bg-red-600 text-white p-1.5 rounded-lg shadow-lg font-bold text-xs transition flex items-center gap-1"
                        title="Eliminar permanentemente de Google Drive"
                      >
                        🗑️ Borrar
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/80 text-[9px] text-white px-1.5 py-0.5 rounded font-mono">
                        Foto {idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-slate-500 italic text-[11px]">No hay fotos subidas.</p>}
          </div>

          {/* 📄 GESTIÓN DE DOCUMENTOS */}
          <div className="space-y-4 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
            <h4 className="font-bold text-cyan-400 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>📄 Expediente Digital / Documentos (Google Drive)</span>
              <span className="text-[11px] font-normal text-slate-400">Total: {docsLista.length} doc(s)</span>
            </h4>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <label className="cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 text-xs">
                <span>📁 Seleccionar Documento de PC</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleSubirDocumentoDrive}
                  disabled={subiendoDoc || borrandoItem}
                  className="hidden"
                />
              </label>

              {subiendoDoc && (
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px] animate-pulse">
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Enviando documento a tu carpeta de Google Drive...</span>
                </div>
              )}
            </div>

            {docsLista.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {docsLista.map((docItem, idx) => {
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
                      <a href={docItem.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-mono truncate max-w-md">
                        📄 {docItem.nombre}
                      </a>
                      <button
                        type="button"
                        onClick={() => solicitarEliminarArchivo(docItem.url, 'documento')}
                        disabled={borrandoItem}
                        className="bg-red-500/20 hover:bg-red-600 text-red-300 hover:text-white px-2.5 py-1 rounded-lg transition text-[10px] font-bold"
                      >
                        🗑️ Borrar
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-slate-500 italic text-[11px]">No hay documentos agregados.</p>}
          </div>

          <div className="flex gap-3 pt-3">
            <button type="submit" disabled={procesandoGuardado || subiendoFoto || subiendoDoc || borrandoItem} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition">
              {procesandoGuardado ? 'Guardando...' : '💾 Guardar Cambios'}
            </button>
            <button type="button" onClick={() => setModoEdicion(false)} className="bg-slate-800 text-slate-300 font-bold px-4 py-2.5 rounded-xl">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* 📧 MODAL CORREO */}
      {mostrarModalCorreo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-cyan-400 uppercase tracking-wider text-sm">📧 Enviar Ficha por Correo</h3>
              <button onClick={() => setMostrarModalCorreo(false)} className="text-slate-400 hover:text-white font-bold text-base">✕</button>
            </div>

            <form onSubmit={handleEnviarCorreoSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Destinatario(s) (separados por coma)</label>
                <input
                  type="text"
                  required
                  placeholder="ejemplo@empresa.com, colaborador@empresa.com"
                  value={correosDestino}
                  onChange={(e) => setCorreosDestino(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Mensaje Adicional (Opcional)</label>
                <textarea
                  rows="3"
                  placeholder="Escribe una nota o aclaración para el receptor..."
                  value={mensajeCorreo}
                  onChange={(e) => setMensajeCorreo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2 text-slate-400 text-[11px]">
                <span>📄</span>
                <span>Se adjuntará automáticamente la Ficha Técnica en PDF.</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={enviandoCorreo}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-lg shadow-cyan-600/20"
                >
                  {enviandoCorreo ? 'Enviando...' : '✉️ Enviar Correo'}
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarModalCorreo(false)}
                  disabled={enviandoCorreo}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl transition text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL ELIMINAR ARCHIVO */}
      {modalEliminarArchivo.mostrar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              🗑️
            </div>

            <div>
              <h3 className="font-bold text-white text-base">¿Eliminar archivo de Drive?</h3>
              <p className="text-slate-400 text-xs mt-1">
                Esta acción moverá el archivo seleccionado a la papelera de Google Drive.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={confirmarEliminarArchivoDrive}
                disabled={borrandoItem}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-lg shadow-red-600/20"
              >
                {borrandoItem ? 'Borrando...' : 'Sí, Eliminar'}
              </button>
              <button
                type="button"
                onClick={() => setModalEliminarArchivo({ mostrar: false, url: '', tipo: '' })}
                disabled={borrandoItem}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BAJA */}
      {mostrarModalBaja && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 text-xs">
            <h3 className="font-bold text-red-400 uppercase tracking-wider text-sm">🚫 Inactivar Activo ({equipo.codigo})</h3>
            <form onSubmit={handleConfirmarBaja} className="space-y-3">
              <textarea
                required
                placeholder="Motivo de la baja..."
                value={motivoBaja}
                onChange={(e) => setMotivoBaja(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none"
              ></textarea>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-red-600 text-white font-bold py-2 rounded-xl">Confirmar Baja</button>
                <button type="button" onClick={() => setMostrarModalBaja(false)} className="bg-slate-800 text-slate-300 px-4 rounded-xl">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REACTIVACIÓN */}
      {mostrarModalReactivar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 text-xs">
            <h3 className="font-bold text-emerald-400 uppercase tracking-wider text-sm">♻️ Reactivar Activo ({equipo.codigo})</h3>
            <form onSubmit={handleConfirmarReactivacion} className="space-y-3">
              <textarea
                placeholder="Motivo de la reactivación..."
                value={motivoReactivacion}
                onChange={(e) => setMotivoReactivacion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none"
              ></textarea>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl">Confirmar Reactivación</button>
                <button type="button" onClick={() => setMostrarModalReactivar(false)} className="bg-slate-800 text-slate-300 px-4 rounded-xl">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
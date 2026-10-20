import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Registra un evento de auditoría en Firestore.
 * @param {Object} params
 * @param {string} params.usuario - Nombre o correo del usuario que realiza la acción
 * @param {string} params.accion - 'CREAR' | 'EDITAR' | 'ELIMINAR' | 'ASIGNACION' | 'ESTADO' | 'CONSULTA'
 * @param {string} params.modulo - 'EMPRESAS' | 'EMPLEADOS' | 'EQUIPOS' | 'ASIGNACIONES' | 'CATALOGOS' | 'AUDITORIA'
 * @param {string} params.detalles - Descripción clara de la acción realizada
 * @param {Object} [params.metaData] - Datos opcionales relevantes
 */
export const registrarLog = async ({ usuario, accion, modulo, detalles, metaData = {} }) => {
  try {
    await addDoc(collection(db, 'logsAuditoria'), {
      usuario: usuario || 'SISTEMA / ANONIMO',
      accion,
      modulo,
      detalles,
      metaData,
      fecha: serverTimestamp()
    });
  } catch (error) {
    console.error('Error al registrar log de auditoría:', error);
  }
};
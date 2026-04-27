/**
 * DataManager.js - Gestor Central de Datos
 * 
 * Este es el CORAZÓN del sistema. Todos los módulos (Agenda, Chatbot, Clientes, 
 * Empleados, Finanzas) usan este manager para leer/escribir datos en Firestore.
 * 
 * Ventajas:
 * - Datos siempre sincronizados entre módulos
 * - Una única fuente de verdad
 * - Fácil de mantener y escalar
 * - El Chatbot puede acceder a TODO
 */

import { auth, db } from './firebase-config.js';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  serverTimestamp,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

class DataManager {
  constructor() {
    this.userId = null;
    
    // CACHÉ LOCAL (para que sea rápido)
    this.cache = {
      empleados: [],
      clientes: [],
      servicios: [],
      citas: [],
      finanzas: []
    };
    
    // LISTENERS (para sincronización en tiempo real)
    this.listeners = {
      empleados: null,
      clientes: null,
      servicios: null,
      citas: null,
      finanzas: null
    };
    
    // OBSERVADORES (módulos que quieren ser notificados de cambios)
    this.observadores = new Map();
    
    // ÚLTIMA ACTUALIZACIÓN (para evitar re-renders innecesarios)
    this.lastUpdate = {};
  }

  /**
   * Inicializar con el usuario autenticado + configurar listeners
   */
  async init(user) {
    if (!user) throw new Error('Usuario no autenticado');
    this.userId = user.uid;
    console.log('✅ DataManager inicializado para usuario:', this.userId);
    
    // Configurar listeners en tiempo real
    await this.configurarListeners();
  }

  /**
   * Configurar listeners en tiempo real para cada colección
   * Se actualizan automáticamente cuando hay cambios en Firestore
   */
  async configurarListeners() {
    try {
      // Listener para EMPLEADOS
      this.listeners.empleados = onSnapshot(
        collection(db, 'users', this.userId, 'empleados'),
        (snapshot) => {
          this.cache.empleados = [];
          snapshot.forEach(doc => {
            this.cache.empleados.push({ id: doc.id, ...doc.data() });
          });
          this.notificarObservadores('empleados');
          console.log('🔄 Empleados actualizados en caché:', this.cache.empleados.length);
        },
        (error) => {
          console.error('❌ Error en listener de empleados:', error);
        }
      );

      // Listener para CLIENTES
      this.listeners.clientes = onSnapshot(
        collection(db, 'users', this.userId, 'clientes'),
        (snapshot) => {
          this.cache.clientes = [];
          snapshot.forEach(doc => {
            this.cache.clientes.push({ id: doc.id, ...doc.data() });
          });
          this.notificarObservadores('clientes');
          console.log('🔄 Clientes actualizados en caché:', this.cache.clientes.length);
        },
        (error) => {
          console.error('❌ Error en listener de clientes:', error);
        }
      );

      // Listener para SERVICIOS
      this.listeners.servicios = onSnapshot(
        collection(db, 'users', this.userId, 'servicios'),
        (snapshot) => {
          this.cache.servicios = [];
          snapshot.forEach(doc => {
            this.cache.servicios.push({ id: doc.id, ...doc.data() });
          });
          this.notificarObservadores('servicios');
          console.log('🔄 Servicios actualizados en caché:', this.cache.servicios.length);
        },
        (error) => {
          console.error('❌ Error en listener de servicios:', error);
        }
      );

      // Listener para CITAS
      this.listeners.citas = onSnapshot(
        query(
          collection(db, 'users', this.userId, 'citas'),
          orderBy('fecha', 'asc')
        ),
        (snapshot) => {
          this.cache.citas = [];
          snapshot.forEach(doc => {
            this.cache.citas.push({ id: doc.id, ...doc.data() });
          });
          this.notificarObservadores('citas');
          console.log('🔄 Citas actualizadas en caché:', this.cache.citas.length);
        },
        (error) => {
          console.error('❌ Error en listener de citas:', error);
        }
      );

      // Listener para FINANZAS
      this.listeners.finanzas = onSnapshot(
        collection(db, 'users', this.userId, 'finanzas'),
        (snapshot) => {
          this.cache.finanzas = [];
          snapshot.forEach(doc => {
            this.cache.finanzas.push({ id: doc.id, ...doc.data() });
          });
          this.notificarObservadores('finanzas');
          console.log('🔄 Finanzas actualizadas en caché:', this.cache.finanzas.length);
        },
        (error) => {
          console.error('❌ Error en listener de finanzas:', error);
        }
      );

      console.log('✅ Listeners configurados - cambios en tiempo real activados');
    } catch (error) {
      console.error('❌ Error configurando listeners:', error);
    }
  }

  /**
   * Suscribirse a cambios de una colección
   * Los módulos usan esto para re-renderizar cuando hay cambios
   */
  suscribirse(tipoColeccion, callback) {
    if (!this.observadores.has(tipoColeccion)) {
      this.observadores.set(tipoColeccion, []);
    }
    this.observadores.get(tipoColeccion).push(callback);
    
    // Retornar función para desuscribirse
    return () => {
      const callbacks = this.observadores.get(tipoColeccion);
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    };
  }

  /**
   * Notificar a todos los observadores cuando hay cambios
   */
  notificarObservadores(tipoColeccion) {
    if (this.observadores.has(tipoColeccion)) {
      const callbacks = this.observadores.get(tipoColeccion);
      callbacks.forEach(callback => {
        try {
          callback(this.cache[tipoColeccion]);
        } catch (error) {
          console.error('Error en observador:', error);
        }
      });
    }
  }

  /**
   * Detener todos los listeners (cuando el usuario cierra sesión)
   */
  detenerListeners() {
    Object.values(this.listeners).forEach(unsub => {
      if (unsub) unsub();
    });
    console.log('✅ Listeners detenidos');
  }

  // ==================== EMPLEADOS ====================

  /**
   * Obtener todos los empleados (desde CACHÉ - ultra rápido)
   * Los listeners mantienen el caché sincronizado
   */
  async obtenerEmpleados() {
    try {
      // Si el caché está vacío, hacer una consulta inicial
      if (this.cache.empleados.length === 0) {
        const snapshot = await getDocs(
          collection(db, 'users', this.userId, 'empleados')
        );
        this.cache.empleados = [];
        snapshot.forEach(doc => {
          this.cache.empleados.push({ id: doc.id, ...doc.data() });
        });
      }
      return this.cache.empleados;
    } catch (error) {
      console.error('❌ Error obteniendo empleados:', error);
      return [];
    }
  }

  /**
   * Crear nuevo empleado
   */
  async crearEmpleado(datos) {
    try {
      const docRef = await addDoc(
        collection(db, 'users', this.userId, 'empleados'),
        {
          ...datos,
          createdAt: serverTimestamp(),
          estado: 'activo'
        }
      );
      console.log('✅ Empleado creado:', docRef.id);
      return { id: docRef.id, ...datos };
    } catch (error) {
      console.error('❌ Error creando empleado:', error);
      throw error;
    }
  }

  /**
   * Actualizar empleado
   */
  async actualizarEmpleado(empleadoId, datos) {
    try {
      await updateDoc(
        doc(db, 'users', this.userId, 'empleados', empleadoId),
        datos
      );
      console.log('✅ Empleado actualizado:', empleadoId);
      return { id: empleadoId, ...datos };
    } catch (error) {
      console.error('❌ Error actualizando empleado:', error);
      throw error;
    }
  }

  /**
   * Obtener empleado por ID
   */
  async obtenerEmpleado(empleadoId) {
    try {
      const snap = await getDoc(doc(db, 'users', this.userId, 'empleados', empleadoId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    } catch (error) {
      console.error('❌ Error obteniendo empleado:', error);
      return null;
    }
  }

  /**
   * Eliminar empleado
   */
  async eliminarEmpleado(empleadoId) {
    try {
      await deleteDoc(
        doc(db, 'users', this.userId, 'empleados', empleadoId)
      );
      console.log('✅ Empleado eliminado:', empleadoId);
    } catch (error) {
      console.error('❌ Error eliminando empleado:', error);
      throw error;
    }
  }

  // ==================== CLIENTES ====================

  /**
   * Obtener todos los clientes (desde CACHÉ)
   */
  async obtenerClientes() {
    try {
      if (this.cache.clientes.length === 0) {
        const snapshot = await getDocs(
          collection(db, 'users', this.userId, 'clientes')
        );
        this.cache.clientes = [];
        snapshot.forEach(doc => {
          this.cache.clientes.push({ id: doc.id, ...doc.data() });
        });
      }
      return this.cache.clientes;
    } catch (error) {
      console.error('❌ Error obteniendo clientes:', error);
      return [];
    }
  }

  /**
   * Crear nuevo cliente
   */
  async crearCliente(datos) {
    try {
      const docRef = await addDoc(
        collection(db, 'users', this.userId, 'clientes'),
        {
          ...datos,
          createdAt: serverTimestamp(),
          totalGastado: 0,
          historialCitas: []
        }
      );
      console.log('✅ Cliente creado:', docRef.id);
      return { id: docRef.id, ...datos };
    } catch (error) {
      console.error('❌ Error creando cliente:', error);
      throw error;
    }
  }

  /**
   * Actualizar cliente
   */
  async actualizarCliente(clienteId, datos) {
    try {
      await updateDoc(
        doc(db, 'users', this.userId, 'clientes', clienteId),
        datos
      );
      console.log('✅ Cliente actualizado:', clienteId);
      return { id: clienteId, ...datos };
    } catch (error) {
      console.error('❌ Error actualizando cliente:', error);
      throw error;
    }
  }

  /**
   * Buscar cliente por nombre
   */
  async buscarCliente(nombre) {
    try {
      const clientes = await this.obtenerClientes();
      return clientes.filter(c => 
        c.nombre.toLowerCase().includes(nombre.toLowerCase())
      );
    } catch (error) {
      console.error('❌ Error buscando cliente:', error);
      return [];
    }
  }

  /**
   * Eliminar cliente
   */
  async eliminarCliente(clienteId) {
    try {
      await deleteDoc(
        doc(db, 'users', this.userId, 'clientes', clienteId)
      );
      console.log('✅ Cliente eliminado:', clienteId);
    } catch (error) {
      console.error('❌ Error eliminando cliente:', error);
      throw error;
    }
  }

  // ==================== SERVICIOS ====================

  /**
   * Obtener todos los servicios disponibles (desde CACHÉ)
   */
  async obtenerServicios() {
    try {
      if (this.cache.servicios.length === 0) {
        const snapshot = await getDocs(
          collection(db, 'users', this.userId, 'servicios')
        );
        this.cache.servicios = [];
        snapshot.forEach(doc => {
          this.cache.servicios.push({ id: doc.id, ...doc.data() });
        });
      }
      return this.cache.servicios;
    } catch (error) {
      console.error('❌ Error obteniendo servicios:', error);
      return [];
    }
  }

  /**
   * Crear nuevo servicio
   */
  async crearServicio(datos) {
    try {
      const docRef = await addDoc(
        collection(db, 'users', this.userId, 'servicios'),
        {
          ...datos,
          createdAt: serverTimestamp()
        }
      );
      console.log('✅ Servicio creado:', docRef.id);
      return { id: docRef.id, ...datos };
    } catch (error) {
      console.error('❌ Error creando servicio:', error);
      throw error;
    }
  }

  // ==================== CITAS (El nexo central) ====================

  /**
   * Crear una cita (integra cliente, empleado, servicio, finanzas)
   */
  async crearCita(datos) {
    try {
      const docRef = await addDoc(
        collection(db, 'users', this.userId, 'citas'),
        {
          cliente: datos.clienteId, // Referencia al cliente
          empleado: datos.empleadoId, // Referencia al empleado
          servicio: datos.servicioId, // Referencia al servicio
          fecha: datos.fecha,
          hora: datos.hora,
          duracion: datos.duracion || 30,
          precio: datos.precio,
          estado: 'confirmada', // confirmada, completada, cancelada
          notas: datos.notas || '',
          createdAt: serverTimestamp()
        }
      );
      
      console.log('✅ Cita creada:', docRef.id);
      
      // Actualizar historial del cliente
      const cliente = await this.obtenerCliente(datos.clienteId);
      if (cliente) {
        const historial = cliente.historialCitas || [];
        historial.push(docRef.id);
        await this.actualizarCliente(datos.clienteId, {
          historialCitas: historial
        });
      }
      
      return { id: docRef.id, ...datos };
    } catch (error) {
      console.error('❌ Error creando cita:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las citas (desde CACHÉ)
   */
  async obtenerCitas() {
    try {
      if (this.cache.citas.length === 0) {
        const snapshot = await getDocs(
          query(
            collection(db, 'users', this.userId, 'citas'),
            orderBy('fecha', 'asc')
          )
        );
        this.cache.citas = [];
        snapshot.forEach(doc => {
          this.cache.citas.push({ id: doc.id, ...doc.data() });
        });
      }
      return this.cache.citas;
    } catch (error) {
      console.error('❌ Error obteniendo citas:', error);
      return [];
    }
  }

  /**
   * Obtener citas del empleado en una fecha
   */
  async obtenerCitasEmpleado(empleadoId, fecha) {
    try {
      const citas = await this.obtenerCitas();
      return citas.filter(c => 
        c.empleado === empleadoId && 
        c.fecha === fecha &&
        c.estado !== 'cancelada'
      );
    } catch (error) {
      console.error('❌ Error obteniendo citas del empleado:', error);
      return [];
    }
  }

  /**
   * Obtener citas del cliente
   */
  async obtenerCitasCliente(clienteId) {
    try {
      const citas = await this.obtenerCitas();
      return citas.filter(c => c.cliente === clienteId);
    } catch (error) {
      console.error('❌ Error obteniendo citas del cliente:', error);
      return [];
    }
  }

  /**
   * Actualizar cita
   */
  async actualizarCita(citaId, datos) {
    try {
      await updateDoc(
        doc(db, 'users', this.userId, 'citas', citaId),
        datos
      );
      console.log('✅ Cita actualizada:', citaId);
      return { id: citaId, ...datos };
    } catch (error) {
      console.error('❌ Error actualizando cita:', error);
      throw error;
    }
  }

  /**
   * Completar cita (marca como completada + crea ingreso en finanzas)
   */
  async completarCita(citaId) {
    try {
      // Obtener datos de la cita
      const cita = await this.obtenerCita(citaId);
      if (!cita) throw new Error('Cita no encontrada');

      // Actualizar cita a completada
      await this.actualizarCita(citaId, { estado: 'completada' });

      // Crear ingreso en finanzas automáticamente
      await this.crearIngreso({
        cita: citaId,
        cliente: cita.cliente,
        empleado: cita.empleado,
        monto: cita.precio,
        tipo: 'cita',
        descripcion: `Pago por cita completada`
      });

      // Actualizar total gastado del cliente
      const cliente = await this.obtenerCliente(cita.cliente);
      if (cliente) {
        const nuevoTotal = (cliente.totalGastado || 0) + cita.precio;
        await this.actualizarCliente(cita.cliente, {
          totalGastado: nuevoTotal
        });
      }

      console.log('✅ Cita completada + Ingreso registrado');
      return true;
    } catch (error) {
      console.error('❌ Error completando cita:', error);
      throw error;
    }
  }

  /**
   * Cancelar cita
   */
  async cancelarCita(citaId) {
    try {
      await this.actualizarCita(citaId, { estado: 'cancelada' });
      console.log('✅ Cita cancelada:', citaId);
      return true;
    } catch (error) {
      console.error('❌ Error cancelando cita:', error);
      throw error;
    }
  }

  /**
   * Obtener cita por ID
   */
  async obtenerCita(citaId) {
    try {
      const snap = await getDoc(doc(db, 'users', this.userId, 'citas', citaId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    } catch (error) {
      console.error('❌ Error obteniendo cita:', error);
      return null;
    }
  }

  // ==================== FINANZAS ====================

  /**
   * Crear ingreso (se llama automáticamente cuando se completa cita)
   */
  async crearIngreso(datos) {
    try {
      const docRef = await addDoc(
        collection(db, 'users', this.userId, 'finanzas'),
        {
          ...datos,
          tipoMovimiento: 'ingreso',
          fecha: datos.fecha || new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp()
        }
      );
      console.log('✅ Ingreso registrado:', docRef.id);
      return { id: docRef.id, ...datos };
    } catch (error) {
      console.error('❌ Error creando ingreso:', error);
      throw error;
    }
  }

  /**
   * Obtener ingresos del día
   */
  async obtenerIngresosDia(fecha) {
    try {
      const finanzas = await this.obtenerFinanzas();
      return finanzas.filter(f => 
        f.tipoMovimiento === 'ingreso' && 
        f.fecha === fecha
      );
    } catch (error) {
      console.error('❌ Error obteniendo ingresos:', error);
      return [];
    }
  }

  /**
   * Obtener todas las transacciones financieras (desde CACHÉ)
   */
  async obtenerFinanzas() {
    try {
      if (this.cache.finanzas.length === 0) {
        const snapshot = await getDocs(
          collection(db, 'users', this.userId, 'finanzas')
        );
        this.cache.finanzas = [];
        snapshot.forEach(doc => {
          this.cache.finanzas.push({ id: doc.id, ...doc.data() });
        });
      }
      return this.cache.finanzas;
    } catch (error) {
      console.error('❌ Error obteniendo finanzas:', error);
      return [];
    }
  }

  /**
   * Obtener total gastado por cliente
   */
  async obtenerTotalGastadoCliente(clienteId) {
    try {
      const cliente = await this.obtenerCliente(clienteId);
      return cliente?.totalGastado || 0;
    } catch (error) {
      console.error('❌ Error obteniendo total:', error);
      return 0;
    }
  }

  // ==================== CLIENTE (Singular - helper) ====================

  async obtenerCliente(clienteId) {
    try {
      const snap = await getDoc(doc(db, 'users', this.userId, 'clientes', clienteId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    } catch (error) {
      console.error('❌ Error obteniendo cliente:', error);
      return null;
    }
  }

  // ==================== RESUMEN GENERAL ====================

  /**
   * Obtener resumen del día para Chatbot/Dashboard
   */
  async obtenerResumenDia(fecha) {
    try {
      const citas = await this.obtenerCitas();
      const citasHoy = citas.filter(c => c.fecha === fecha);
      const citasCompletadas = citasHoy.filter(c => c.estado === 'completada');
      
      const ingresos = await this.obtenerIngresosDia(fecha);
      const totalIngresos = ingresos.reduce((sum, ing) => sum + (ing.monto || 0), 0);

      return {
        fecha,
        citasTotal: citasHoy.length,
        citasCompletadas: citasCompletadas.length,
        citasPendientes: citasHoy.filter(c => c.estado === 'confirmada').length,
        totalIngresos,
        empleadosTrabajando: [...new Set(citasHoy.map(c => c.empleado))].length
      };
    } catch (error) {
      console.error('❌ Error obteniendo resumen:', error);
      return null;
    }
  }
}

// Exportar instancia singleton
export const dataManager = new DataManager();


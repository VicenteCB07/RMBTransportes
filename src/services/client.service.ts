/**
 * Servicio para gestión de Clientes
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Cliente,
  ClienteFormInput,
  FiltrosCliente,
  EstadisticasCliente,
  DireccionCliente,
  ObraCliente,
  ObraFormInput,
  ContactoObra,
} from '../types/client.types';

const COLLECTION = 'clientes';

// Obtener todos los clientes
export async function obtenerClientes(filtros?: FiltrosCliente): Promise<Cliente[]> {
  try {
    // Obtener todos sin ordenar para evitar necesidad de índices
    const snapshot = await getDocs(collection(db, COLLECTION));
    let clientes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Cliente[];

    // Ordenar en memoria por nombre
    clientes.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    // Filtrar por activo en memoria
    if (filtros?.activo !== undefined) {
      clientes = clientes.filter(c => c.activo === filtros.activo);
    }

    // Filtros adicionales en memoria
    if (filtros?.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      clientes = clientes.filter(c =>
        c.nombre.toLowerCase().includes(busqueda) ||
        c.nombreComercial?.toLowerCase().includes(busqueda) ||
        c.rfc?.toLowerCase().includes(busqueda) ||
        c.contactoPrincipal?.toLowerCase().includes(busqueda)
      );
    }

    if (filtros?.estado) {
      clientes = clientes.filter(c => c.direccion.estado === filtros.estado);
    }

    return clientes;
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    throw error;
  }
}

// Obtener un cliente por ID
export async function obtenerCliente(id: string): Promise<Cliente | null> {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate(),
      updatedAt: docSnap.data().updatedAt?.toDate(),
    } as Cliente;
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    throw error;
  }
}

// Crear cliente
export async function crearCliente(input: ClienteFormInput): Promise<Cliente> {
  try {
    const ahora = Timestamp.now();

    const estadisticasIniciales: EstadisticasCliente = {
      totalViajes: 0,
      viajesUltimoMes: 0,
      ingresoTotal: 0,
      ingresoUltimoMes: 0,
      promedioViajeMensual: 0,
      destinosFrecuentes: [],
      calificacionPago: 'bueno',
    };

    // Procesar obras si existen
    const obras: ObraCliente[] = (input.obras || []).map((obra, index) => ({
      id: obra.id || `obra-${Date.now()}-${index}`,
      nombre: obra.nombre,
      alias: obra.alias || undefined,
      tipo: obra.tipo,
      direccion: {
        calle: obra.direccion.calle || '',
        numeroExterior: obra.direccion.numeroExterior || undefined,
        numeroInterior: obra.direccion.numeroInterior || undefined,
        colonia: obra.direccion.colonia || '',
        municipio: obra.direccion.municipio || '',
        estado: obra.direccion.estado || '',
        codigoPostal: obra.direccion.codigoPostal || '',
        pais: obra.direccion.pais || 'México',
      },
      contactos: obra.contactos.map((c, cIndex) => ({
        id: c.id || `contacto-${Date.now()}-${cIndex}`,
        nombre: c.nombre,
        puesto: c.puesto || undefined,
        telefono: c.telefono || undefined,
        celular: c.celular || undefined,
        email: c.email || undefined,
        horarioDisponible: c.horarioDisponible || undefined,
        esPrincipal: c.esPrincipal,
      })),
      condicionesAcceso: obra.condicionesAcceso || undefined,
      activa: true,
      notas: obra.notas || undefined,
      createdAt: ahora.toDate(),
      updatedAt: ahora.toDate(),
    }));

    const clienteData = {
      nombre: input.nombre,
      nombreComercial: input.nombreComercial || null,
      rfc: input.rfc || null,
      contactoPrincipal: input.contactoPrincipal || null,
      telefono: input.telefono || null,
      email: input.email || null,
      direccion: {
        calle: input.direccion.calle || '',
        numeroExterior: input.direccion.numeroExterior || null,
        numeroInterior: input.direccion.numeroInterior || null,
        colonia: input.direccion.colonia || '',
        municipio: input.direccion.municipio || '',
        estado: input.direccion.estado || '',
        codigoPostal: input.direccion.codigoPostal || '',
        pais: input.direccion.pais || 'México',
        coordenadas: input.direccion.coordenadas || null,
        instruccionesAcceso: input.direccion.instruccionesAcceso || null,
        horarioRecepcion: input.direccion.horarioRecepcion || null,
        restriccionesAcceso: input.direccion.restriccionesAcceso || [],
      },
      obras: obras,
      requiereFactura: input.requiereFactura,
      diasCredito: input.diasCredito,
      limiteCredito: input.limiteCredito || null,
      tipoServicioFrecuente: [],
      tarifasEspeciales: [],
      estadisticas: estadisticasIniciales,
      activo: true,
      notas: input.notas || null,
      createdAt: ahora,
      updatedAt: ahora,
    };

    const docRef = await addDoc(collection(db, COLLECTION), clienteData);

    return {
      id: docRef.id,
      ...clienteData,
      createdAt: ahora.toDate(),
      updatedAt: ahora.toDate(),
    } as Cliente;
  } catch (error) {
    console.error('Error al crear cliente:', error);
    throw error;
  }
}

// Actualizar cliente
export async function actualizarCliente(
  id: string,
  input: Partial<ClienteFormInput>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    const ahora = Timestamp.now();
    const updateData: Record<string, unknown> = {
      updatedAt: ahora,
    };

    if (input.nombre !== undefined) updateData.nombre = input.nombre;
    if (input.nombreComercial !== undefined) updateData.nombreComercial = input.nombreComercial;
    if (input.rfc !== undefined) updateData.rfc = input.rfc;
    if (input.contactoPrincipal !== undefined) updateData.contactoPrincipal = input.contactoPrincipal;
    if (input.telefono !== undefined) updateData.telefono = input.telefono;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.direccion !== undefined) updateData.direccion = input.direccion;
    if (input.requiereFactura !== undefined) updateData.requiereFactura = input.requiereFactura;
    if (input.diasCredito !== undefined) updateData.diasCredito = input.diasCredito;
    if (input.limiteCredito !== undefined) updateData.limiteCredito = input.limiteCredito;
    if (input.notas !== undefined) updateData.notas = input.notas;

    // Procesar obras si existen
    if (input.obras !== undefined) {
      updateData.obras = (input.obras || []).map((obra, index) => ({
        id: obra.id || `obra-${Date.now()}-${index}`,
        nombre: obra.nombre,
        alias: obra.alias || null,
        tipo: obra.tipo,
        direccion: {
          calle: obra.direccion?.calle || '',
          numeroExterior: obra.direccion?.numeroExterior || null,
          numeroInterior: obra.direccion?.numeroInterior || null,
          colonia: obra.direccion?.colonia || '',
          municipio: obra.direccion?.municipio || '',
          estado: obra.direccion?.estado || '',
          codigoPostal: obra.direccion?.codigoPostal || '',
          pais: obra.direccion?.pais || 'México',
        },
        contactos: (obra.contactos || []).map((c, cIndex) => ({
          id: c.id || `contacto-${Date.now()}-${cIndex}`,
          nombre: c.nombre,
          puesto: c.puesto || null,
          telefono: c.telefono || null,
          celular: c.celular || null,
          email: c.email || null,
          horarioDisponible: c.horarioDisponible || null,
          esPrincipal: c.esPrincipal || false,
        })),
        condicionesAcceso: obra.condicionesAcceso || null,
        activa: obra.activa !== undefined ? obra.activa : true,
        notas: obra.notas || null,
        createdAt: obra.createdAt || ahora.toDate(),
        updatedAt: ahora.toDate(),
      }));
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    throw error;
  }
}

// Desactivar cliente (soft delete)
export async function desactivarCliente(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      activo: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al desactivar cliente:', error);
    throw error;
  }
}

// Reactivar cliente
export async function reactivarCliente(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      activo: true,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al reactivar cliente:', error);
    throw error;
  }
}

// Eliminar cliente permanentemente
export async function eliminarCliente(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    throw error;
  }
}

// Buscar clientes (para autocompletado)
export async function buscarClientes(
  termino: string,
  limite: number = 10
): Promise<Pick<Cliente, 'id' | 'nombre' | 'nombreComercial'>[]> {
  try {
    const clientes = await obtenerClientes({ activo: true });
    const terminoLower = termino.toLowerCase();

    return clientes
      .filter(c =>
        c.nombre.toLowerCase().includes(terminoLower) ||
        c.nombreComercial?.toLowerCase().includes(terminoLower)
      )
      .slice(0, limite)
      .map(c => ({
        id: c.id,
        nombre: c.nombre,
        nombreComercial: c.nombreComercial,
      }));
  } catch (error) {
    console.error('Error al buscar clientes:', error);
    throw error;
  }
}

// Actualizar estadísticas del cliente (llamado después de cada viaje)
export async function actualizarEstadisticasCliente(
  clienteId: string,
  viaje: { ingreso: number; destino: string }
): Promise<void> {
  try {
    const cliente = await obtenerCliente(clienteId);
    if (!cliente) return;

    const estadisticas = cliente.estadisticas;
    estadisticas.totalViajes += 1;
    estadisticas.viajesUltimoMes += 1;
    estadisticas.ingresoTotal += viaje.ingreso;
    estadisticas.ingresoUltimoMes += viaje.ingreso;
    estadisticas.promedioViajeMensual = estadisticas.ingresoUltimoMes / estadisticas.viajesUltimoMes;
    estadisticas.ultimoServicio = new Date();

    // Actualizar destinos frecuentes
    if (!estadisticas.destinosFrecuentes.includes(viaje.destino)) {
      estadisticas.destinosFrecuentes = [
        viaje.destino,
        ...estadisticas.destinosFrecuentes.slice(0, 4),
      ];
    }

    await updateDoc(doc(db, COLLECTION, clienteId), {
      estadisticas,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al actualizar estadísticas:', error);
    throw error;
  }
}

// Obtener clientes para select/dropdown
export async function obtenerClientesSelect(): Promise<Array<{ value: string; label: string }>> {
  try {
    const clientes = await obtenerClientes({ activo: true });
    return clientes.map(c => ({
      value: c.id,
      label: c.nombreComercial || c.nombre,
    }));
  } catch (error) {
    console.error('Error al obtener clientes para select:', error);
    throw error;
  }
}

// Importar clientes desde datos del Excel
export async function importarClientesDesdeExcel(
  clientes: Array<{ nombre: string; destino?: string }>
): Promise<{ importados: number; duplicados: number; errores: string[] }> {
  const resultado = { importados: 0, duplicados: 0, errores: [] as string[] };

  try {
    // Obtener clientes existentes para evitar duplicados
    const existentes = await obtenerClientes();
    const nombresExistentes = new Set(existentes.map(c => c.nombre.toLowerCase()));

    for (const clienteData of clientes) {
      try {
        if (nombresExistentes.has(clienteData.nombre.toLowerCase())) {
          resultado.duplicados++;
          continue;
        }

        await crearCliente({
          nombre: clienteData.nombre,
          direccion: {
            calle: '',
            colonia: '',
            municipio: clienteData.destino || '',
            estado: '',
            codigoPostal: '',
            pais: 'México',
          },
          requiereFactura: false,
          diasCredito: 0,
        });

        resultado.importados++;
        nombresExistentes.add(clienteData.nombre.toLowerCase());
      } catch (err) {
        resultado.errores.push(`Error con ${clienteData.nombre}: ${err}`);
      }
    }

    return resultado;
  } catch (error) {
    console.error('Error en importación:', error);
    throw error;
  }
}

// =====================
// GESTIÓN DE OBRAS
// =====================

// Agregar obra a un cliente
export async function agregarObra(
  clienteId: string,
  obra: ObraFormInput
): Promise<ObraCliente> {
  try {
    const cliente = await obtenerCliente(clienteId);
    if (!cliente) throw new Error('Cliente no encontrado');

    const ahora = new Date();
    const nuevaObra: ObraCliente = {
      id: `obra-${Date.now()}`,
      nombre: obra.nombre,
      alias: obra.alias,
      tipo: obra.tipo,
      direccion: {
        calle: obra.direccion.calle || '',
        numeroExterior: obra.direccion.numeroExterior,
        colonia: obra.direccion.colonia || '',
        municipio: obra.direccion.municipio || '',
        estado: obra.direccion.estado || '',
        codigoPostal: obra.direccion.codigoPostal || '',
        pais: obra.direccion.pais || 'México',
      },
      contactos: obra.contactos.map((c, i) => ({
        id: c.id || `contacto-${Date.now()}-${i}`,
        nombre: c.nombre,
        puesto: c.puesto,
        telefono: c.telefono,
        celular: c.celular,
        email: c.email,
        horarioDisponible: c.horarioDisponible,
        esPrincipal: c.esPrincipal,
      })),
      condicionesAcceso: obra.condicionesAcceso as ObraCliente['condicionesAcceso'],
      activa: true,
      notas: obra.notas,
      createdAt: ahora,
      updatedAt: ahora,
    };

    const obrasActualizadas = [...(cliente.obras || []), nuevaObra];

    await updateDoc(doc(db, COLLECTION, clienteId), {
      obras: obrasActualizadas,
      updatedAt: Timestamp.now(),
    });

    return nuevaObra;
  } catch (error) {
    console.error('Error al agregar obra:', error);
    throw error;
  }
}

// Actualizar obra de un cliente
export async function actualizarObra(
  clienteId: string,
  obraId: string,
  datos: Partial<ObraFormInput>
): Promise<void> {
  try {
    const cliente = await obtenerCliente(clienteId);
    if (!cliente) throw new Error('Cliente no encontrado');

    const obras = cliente.obras || [];
    const indice = obras.findIndex(o => o.id === obraId);
    if (indice === -1) throw new Error('Obra no encontrada');

    obras[indice] = {
      ...obras[indice],
      ...datos,
      direccion: datos.direccion ? { ...obras[indice].direccion, ...datos.direccion } : obras[indice].direccion,
      contactos: datos.contactos || obras[indice].contactos,
      updatedAt: new Date(),
    } as ObraCliente;

    await updateDoc(doc(db, COLLECTION, clienteId), {
      obras,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al actualizar obra:', error);
    throw error;
  }
}

// Eliminar obra de un cliente
export async function eliminarObra(clienteId: string, obraId: string): Promise<void> {
  try {
    const cliente = await obtenerCliente(clienteId);
    if (!cliente) throw new Error('Cliente no encontrado');

    const obrasActualizadas = (cliente.obras || []).filter(o => o.id !== obraId);

    await updateDoc(doc(db, COLLECTION, clienteId), {
      obras: obrasActualizadas,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al eliminar obra:', error);
    throw error;
  }
}

// Obtener obras de un cliente para select
export async function obtenerObrasSelect(
  clienteId: string
): Promise<Array<{ value: string; label: string; direccion: string }>> {
  try {
    const cliente = await obtenerCliente(clienteId);
    if (!cliente) return [];

    return (cliente.obras || [])
      .filter(o => o.activa)
      .map(o => ({
        value: o.id,
        label: o.nombre,
        direccion: `${o.direccion.calle} ${o.direccion.numeroExterior || ''}, ${o.direccion.colonia}, ${o.direccion.municipio}`,
      }));
  } catch (error) {
    console.error('Error al obtener obras:', error);
    return [];
  }
}

// Obtener clientes con sus obras para select (formato agrupado)
export async function obtenerClientesConObrasSelect(): Promise<
  Array<{
    clienteId: string;
    clienteNombre: string;
    obras: Array<{ value: string; label: string; direccion: string }>;
  }>
> {
  try {
    const clientes = await obtenerClientes({ activo: true });

    return clientes.map(c => ({
      clienteId: c.id,
      clienteNombre: c.nombreComercial || c.nombre,
      obras: (c.obras || [])
        .filter(o => o.activa)
        .map(o => ({
          value: o.id,
          label: o.nombre,
          direccion: `${o.direccion.calle} ${o.direccion.numeroExterior || ''}, ${o.direccion.colonia}`.trim(),
        })),
    }));
  } catch (error) {
    console.error('Error al obtener clientes con obras:', error);
    return [];
  }
}

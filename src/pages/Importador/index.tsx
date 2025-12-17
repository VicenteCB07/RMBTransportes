/**
 * Módulo de Importación de Datos
 * Importación masiva desde Excel para migración inicial
 */

import { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Database,
  Users,
  Truck,
  Building2,
  CreditCard,
  Radio,
  X,
  ArrowRight,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { importarClientesDesdeExcel } from '../../services/client.service';
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
import type { TipoVehiculo, RolUsuario } from '../../types';

type ModuloImportacion = 'clientes' | 'vehiculos' | 'operadores' | 'bitacora' | 'casetas' | 'telemetria';

interface ResultadoImportacion {
  modulo: ModuloImportacion;
  total: number;
  importados: number;
  duplicados: number;
  errores: string[];
  status: 'completado' | 'error' | 'procesando';
}

const MODULOS: {
  id: ModuloImportacion;
  nombre: string;
  descripcion: string;
  icon: any;
  columnas: string;
}[] = [
    {
      id: 'clientes',
      nombre: 'Clientes',
      descripcion: 'Importar catálogo de clientes',
      icon: Building2,
      columnas: 'Cliente, Destino (opcional)',
    },
    {
      id: 'vehiculos',
      nombre: 'Vehículos',
      descripcion: 'Importar catálogo de tractocamiones y remolques',
      icon: Truck,
      columnas: 'Número Interno, Tipo de Vehículo, Marca, Modelo, Año, Número de Serie, Placa, Kilometraje',
    },
    {
      id: 'operadores',
      nombre: 'Operadores',
      descripcion: 'Importar catálogo de operadores',
      icon: Users,
      columnas: 'Operadores, Activo, Sueldo dia',
    },
    {
      id: 'bitacora',
      nombre: 'Bitácora de Viajes',
      descripcion: 'Importar historial de viajes',
      icon: Database,
      columnas: 'Folio, Fecha, HR_Inicio, Tracto, Operador, Cliente, Destino, ...',
    },
    {
      id: 'casetas',
      nombre: 'Casetas',
      descripcion: 'Importar historial de cruces de peaje',
      icon: CreditCard,
      columnas: 'No.Economico, Fecha, Hora, Caseta, Importe',
    },
    {
      id: 'telemetria',
      nombre: 'Telemetría GPS',
      descripcion: 'Importar recorridos GPS',
      icon: Radio,
      columnas: 'Fecha, Hora, Alias, Odometro, Evento',
    },
  ];

export default function Importador() {
  const [moduloSeleccionado, setModuloSeleccionado] = useState<ModuloImportacion | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [hojaSeleccionada, setHojaSeleccionada] = useState<string>('');
  const [hojas, setHojas] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [columnas, setColumnas] = useState<string[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoImportacion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleArchivoSeleccionado(file: File) {
    setArchivo(file);
    setPreview([]);
    setColumnas([]);
    setHojaSeleccionada('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      setHojas(workbook.SheetNames);

      // Auto-seleccionar hoja según módulo
      if (moduloSeleccionado) {
        const hojaAutodetectada = autodetectarHoja(workbook.SheetNames, moduloSeleccionado);
        if (hojaAutodetectada) {
          handleHojaSeleccionada(workbook, hojaAutodetectada);
        }
      }
    } catch (error) {
      console.error('Error al leer archivo:', error);
    }
  }

  function autodetectarHoja(hojas: string[], modulo: ModuloImportacion): string | null {
    const mapeo: Record<ModuloImportacion, string[]> = {
      clientes: ['Bitacora', 'Clientes', 'catalogos'],
      vehiculos: ['Catalogos', 'Tractos', 'Vehiculos'],
      operadores: ['Catalogos', 'Operadores'],
      bitacora: ['Bitacora', 'Viajes'],
      casetas: ['Casetas', 'Peajes'],
      telemetria: ['Recorridos', 'GPS', 'Telemetria'],
    };

    const posibles = mapeo[modulo];
    for (const posible of posibles) {
      const encontrada = hojas.find(h => h.toLowerCase().includes(posible.toLowerCase()));
      if (encontrada) return encontrada;
    }
    return hojas[0] || null;
  }

  async function handleHojaSeleccionada(workbook: XLSX.WorkBook | null, nombreHoja: string) {
    setHojaSeleccionada(nombreHoja);

    if (!archivo) return;

    let wb = workbook;
    if (!wb) {
      const data = await archivo.arrayBuffer();
      wb = XLSX.read(data, { type: 'array' });
    }

    const sheet = wb.Sheets[nombreHoja];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Encontrar fila de encabezados
    let headerRow = 0;
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.length > 3 && row.some(cell =>
        typeof cell === 'string' && cell.length > 2
      )) {
        headerRow = i;
        break;
      }
    }

    const headers = (jsonData[headerRow] || []).map((h, i) =>
      h ? String(h).trim() : `Columna ${i + 1}`
    );
    setColumnas(headers);

    // Preview de datos
    const dataRows = jsonData.slice(headerRow + 1, headerRow + 11);
    const previewData = dataRows.map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    }).filter(row => Object.values(row).some(v => v !== undefined && v !== ''));

    setPreview(previewData);
  }

  async function handleImportar() {
    if (!archivo || !hojaSeleccionada || !moduloSeleccionado) return;

    setImportando(true);
    const resultado: ResultadoImportacion = {
      modulo: moduloSeleccionado,
      total: 0,
      importados: 0,
      duplicados: 0,
      errores: [],
      status: 'procesando',
    };

    try {
      const data = await archivo.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[hojaSeleccionada];
      const registros = XLSX.utils.sheet_to_json(sheet);

      resultado.total = registros.length;

      switch (moduloSeleccionado) {
        case 'clientes':
          // Extraer clientes únicos de la bitácora
          const clientesUnicos = [...new Set(registros.map((r: any) =>
            r.Cliente || r.cliente || r.CLIENTE
          ).filter(Boolean))];

          const clientesData = clientesUnicos.map(nombre => ({
            nombre: String(nombre),
          }));

          const resultadoClientes = await importarClientesDesdeExcel(clientesData);
          resultado.importados = resultadoClientes.importados;
          resultado.duplicados = resultadoClientes.duplicados;
          resultado.errores = resultadoClientes.errores;
          break;

        case 'vehiculos':
          // Importar vehículos desde Excel
          const vehiculosCollection = collection(db, 'vehiculos');

          // Mapeo de tipos de vehículo del Excel al enum TipoVehiculo
          const mapearTipoVehiculo = (tipo: string): TipoVehiculo | null => {
            const tipoLower = tipo?.toLowerCase().trim() || '';
            if (tipoLower.includes('tractocamion') || tipoLower.includes('tractocamión') || tipoLower.includes('tracto')) {
              return 'tractocamion';
            }
            if (tipoLower.includes('lowboy') || tipoLower.includes('remolque')) {
              // Lowboy y remolque se mapean a plataforma_rolloff
              return 'plataforma_rolloff';
            }
            if (tipoLower.includes('plataforma') || tipoLower.includes('roll-off') || tipoLower.includes('rolloff')) {
              return 'plataforma_rolloff';
            }
            if (tipoLower.includes('torton') || tipoLower.includes('tortón')) {
              return 'torton';
            }
            if (tipoLower.includes('rabon') || tipoLower.includes('rabón')) {
              return 'rabon';
            }
            return null;
          };

          for (const registro of registros as any[]) {
            try {
              // Obtener valores con múltiples nombres de columna posibles
              const numeroInterno = registro['Número Interno'] || registro['NumeroInterno'] || registro['No. Interno'] || registro['Tractos'] || '';
              const tipoTexto = registro['Tipo de Vehículo'] || registro['TipoVehiculo'] || registro['Tipo'] || '';
              const marca = registro['Marca'] || '';
              const modelo = registro['Modelo'] || '';
              const anio = registro['Año'] || registro['Anio'] || registro['Year'] || new Date().getFullYear();
              const vin = registro['Número de Serie'] || registro['NumeroSerie'] || registro['VIN'] || registro['Serie'] || '';
              const placa = registro['Placa'] || registro['Placas'] || '';
              const kilometraje = registro['Kilometraje'] || registro['Km'] || registro['Odometro'] || 0;

              // Validar campos requeridos
              if (!numeroInterno || !placa) {
                resultado.errores.push(`Fila sin número interno o placa: ${JSON.stringify(registro).substring(0, 50)}`);
                continue;
              }

              // Mapear tipo de vehículo
              const tipoVehiculo = mapearTipoVehiculo(tipoTexto);
              if (!tipoVehiculo) {
                resultado.errores.push(`Tipo de vehículo no reconocido para ${numeroInterno}: "${tipoTexto}"`);
                continue;
              }

              // Verificar si ya existe por placa
              const existeQuery = query(vehiculosCollection, where('placa', '==', placa.toString().trim()));
              const existeSnap = await getDocs(existeQuery);

              if (!existeSnap.empty) {
                resultado.duplicados++;
                continue;
              }

              // Crear documento del vehículo
              await addDoc(vehiculosCollection, {
                numeroInterno: numeroInterno.toString().trim(),
                placa: placa.toString().trim(),
                vin: vin.toString().trim(),
                tipo: tipoVehiculo,
                marca: marca.toString().trim(),
                modelo: modelo.toString().trim(),
                anio: parseInt(anio) || new Date().getFullYear(),
                estado: 'disponible',
                capacidadCarga: 0,
                kilometraje: parseFloat(kilometraje) || 0,
                fechaRegistro: serverTimestamp(),
                documentos: [],
              });

              resultado.importados++;
            } catch (error) {
              resultado.errores.push(`Error en registro: ${String(error)}`);
            }
          }
          break;

        case 'operadores':
          // Importar operadores desde Excel
          // Columnas esperadas: Operadores (nombre), Activo, Sueldo dia
          // O: Nombre, Teléfono, CURP, No. Licencia, Tipo de Licencia, Fecha de Vencimiento, Rol

          // Mapeo de roles del Excel al enum RolUsuario
          const mapearRol = (rol: string): RolUsuario => {
            const rolLower = rol?.toLowerCase().trim() || '';
            if (rolLower.includes('admin')) return 'admin';
            if (rolLower.includes('dispatch') || rolLower.includes('despach')) return 'dispatcher';
            if (rolLower.includes('manager') || rolLower.includes('gerente')) return 'manager';
            if (rolLower.includes('maniobrista')) return 'maniobrista';
            if (rolLower.includes('seguridad')) return 'seguridad';
            return 'operador'; // Por defecto
          };

          // Generar email y contraseña temporal
          const generarEmail = (nombre: string, index: number): string => {
            const nombreLimpio = nombre
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
              .replace(/[^a-z0-9]/g, '') // Solo alfanuméricos
              .substring(0, 20);
            return `${nombreLimpio}${index}@rmb.com.mx`;
          };

          const generarPassword = (): string => {
            return 'Rmb' + Math.random().toString(36).substring(2, 10) + '!';
          };

          let indexOperador = 1;
          for (const registro of registros as any[]) {
            try {
              // Obtener valores con múltiples nombres de columna posibles
              const nombre = registro['Operadores'] || registro['Nombre'] || registro['NOMBRE'] || '';
              const telefono = registro['Teléfono'] || registro['Telefono'] || registro['Tel'] || '';
              const curp = registro['CURP'] || registro['Curp'] || '';
              const noLicencia = registro['No. Licencia'] || registro['NoLicencia'] || registro['Licencia'] || '';
              const tipoLicencia = registro['Tipo de Licencia'] || registro['TipoLicencia'] || '';
              const fechaVencimientoRaw = registro['Fecha de Vencimiento'] || registro['FechaVencimiento'] || registro['Vencimiento'] || null;
              const rolTexto = registro['Rol'] || registro['ROL'] || 'operador';
              const activo = registro['Activo'] !== false && registro['Activo'] !== 'No' && registro['Activo'] !== 0;
              const sueldoDia = registro['Sueldo dia'] || registro['SueldoDia'] || registro['Sueldo'] || 0;

              // Validar nombre requerido
              if (!nombre || String(nombre).trim() === '') {
                continue; // Saltar filas vacías
              }

              const nombreCompleto = String(nombre).trim();
              const partesNombre = nombreCompleto.split(' ');
              const primerNombre = partesNombre[0] || nombreCompleto;
              const apellidos = partesNombre.slice(1).join(' ') || 'Sin Apellido';

              // Verificar si ya existe por CURP o por nombre similar
              if (curp) {
                const existeCurpQuery = query(collection(db, 'usuarios'), where('curp', '==', curp.toString().trim()));
                const existeCurpSnap = await getDocs(existeCurpQuery);
                if (!existeCurpSnap.empty) {
                  resultado.duplicados++;
                  continue;
                }
              }

              // Mapear rol
              const rol = mapearRol(rolTexto);

              // Generar credenciales
              const email = generarEmail(nombreCompleto, indexOperador);
              const password = generarPassword();

              // Procesar fecha de vencimiento de licencia
              let fechaVencimiento: Date | null = null;
              if (fechaVencimientoRaw) {
                if (fechaVencimientoRaw instanceof Date) {
                  fechaVencimiento = fechaVencimientoRaw;
                } else if (typeof fechaVencimientoRaw === 'number') {
                  // Fecha de Excel (número de días desde 1900)
                  fechaVencimiento = new Date((fechaVencimientoRaw - 25569) * 86400 * 1000);
                } else if (typeof fechaVencimientoRaw === 'string') {
                  fechaVencimiento = new Date(fechaVencimientoRaw);
                }
              }

              try {
                // Crear usuario en Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);

                // Crear documento en Firestore
                await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
                  email: email,
                  nombre: primerNombre,
                  apellidos: apellidos,
                  telefono: telefono ? String(telefono).trim() : null,
                  rol: rol,
                  activo: activo,
                  fechaCreacion: serverTimestamp(),
                  curp: curp ? String(curp).trim() : null,
                  licencia: noLicencia ? String(noLicencia).trim() : null,
                  tipoLicencia: tipoLicencia ? String(tipoLicencia).trim() : null,
                  fechaVencimientoLicencia: fechaVencimiento,
                  sueldoDia: parseFloat(sueldoDia) || 0,
                  importado: true, // Marcar como importado
                  passwordTemporal: password, // Guardar para referencia (el admin puede verlo)
                });

                resultado.importados++;
                indexOperador++;
              } catch (authError: any) {
                if (authError.code === 'auth/email-already-in-use') {
                  resultado.duplicados++;
                } else {
                  resultado.errores.push(`Error al crear ${nombreCompleto}: ${authError.message}`);
                }
              }
            } catch (error) {
              resultado.errores.push(`Error en registro: ${String(error)}`);
            }
          }
          break;

        case 'bitacora':
          resultado.importados = 0;
          resultado.errores = ['Importación de bitácora: próximamente'];
          break;

        case 'casetas':
          resultado.importados = 0;
          resultado.errores = ['Usar el módulo de Casetas para importar'];
          break;

        case 'telemetria':
          resultado.importados = 0;
          resultado.errores = ['Usar el módulo de Telemetría para importar'];
          break;
      }

      resultado.status = resultado.errores.length > 0 && resultado.importados === 0
        ? 'error'
        : 'completado';
    } catch (error) {
      resultado.status = 'error';
      resultado.errores = [String(error)];
    }

    setResultados([resultado, ...resultados]);
    setImportando(false);
  }

  function resetear() {
    setModuloSeleccionado(null);
    setArchivo(null);
    setHojas([]);
    setHojaSeleccionada('');
    setPreview([]);
    setColumnas([]);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importador de Datos</h1>
          <p className="text-gray-600">Migración de datos desde archivos Excel</p>
        </div>
      </div>

      {/* Paso 1: Seleccionar módulo */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm">1</span>
          Selecciona el tipo de datos a importar
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {MODULOS.map((modulo) => {
            const Icon = modulo.icon;
            return (
              <button
                key={modulo.id}
                onClick={() => {
                  setModuloSeleccionado(modulo.id);
                  setArchivo(null);
                  setPreview([]);
                }}
                className={`p-4 rounded-xl border-2 text-center transition-all ${moduloSeleccionado === modulo.id
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <Icon className={`w-8 h-8 mx-auto mb-2 ${moduloSeleccionado === modulo.id ? 'text-black' : 'text-gray-400'
                  }`} />
                <p className="font-medium text-sm">{modulo.nombre}</p>
              </button>
            );
          })}
        </div>

        {moduloSeleccionado && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Columnas esperadas: </span>
              {MODULOS.find(m => m.id === moduloSeleccionado)?.columnas}
            </p>
          </div>
        )}
      </div>

      {/* Paso 2: Cargar archivo */}
      {moduloSeleccionado && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm">2</span>
            Carga el archivo Excel
          </h2>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${archivo
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleArchivoSeleccionado(file);
              }}
              className="hidden"
            />

            {archivo ? (
              <div className="space-y-2">
                <FileSpreadsheet className="w-12 h-12 text-green-600 mx-auto" />
                <p className="font-medium">{archivo.name}</p>
                <p className="text-sm text-gray-500">
                  {(archivo.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="font-medium">Arrastra o haz clic para seleccionar</p>
                <p className="text-sm text-gray-500">
                  Archivos Excel (.xlsx, .xls, .xlsm)
                </p>
              </div>
            )}
          </div>

          {/* Selector de hoja */}
          {hojas.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecciona la hoja
              </label>
              <div className="flex flex-wrap gap-2">
                {hojas.map((hoja) => (
                  <button
                    key={hoja}
                    onClick={() => handleHojaSeleccionada(null, hoja)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${hojaSeleccionada === hoja
                        ? 'bg-black text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                  >
                    {hoja}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paso 3: Preview y confirmar */}
      {preview.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm">3</span>
            Vista previa de datos
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {columnas.slice(0, 8).map((col, i) => (
                    <th key={i} className="p-2 text-left font-medium text-gray-600 truncate max-w-[150px]">
                      {col}
                    </th>
                  ))}
                  {columnas.length > 8 && (
                    <th className="p-2 text-left font-medium text-gray-400">
                      +{columnas.length - 8} más
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {columnas.slice(0, 8).map((col, j) => (
                      <td key={j} className="p-2 truncate max-w-[150px]">
                        {row[col] !== undefined ? String(row[col]).substring(0, 30) : '-'}
                      </td>
                    ))}
                    {columnas.length > 8 && (
                      <td className="p-2 text-gray-400">...</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Mostrando {preview.length} de los primeros registros
          </p>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={resetear}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleImportar}
              disabled={importando}
              className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {importando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Importar Datos
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Resultados de importaciones */}
      {resultados.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Resultados de Importación</h2>

          <div className="space-y-4">
            {resultados.map((resultado, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${resultado.status === 'completado'
                    ? 'bg-green-50 border-green-200'
                    : resultado.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {resultado.status === 'completado' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : resultado.status === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <RefreshCw className="w-5 h-5 text-amber-600 animate-spin" />
                    )}
                    <div>
                      <p className="font-medium capitalize">
                        {MODULOS.find(m => m.id === resultado.modulo)?.nombre}
                      </p>
                      <p className="text-sm text-gray-600">
                        {resultado.importados} importados, {resultado.duplicados} duplicados
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${resultado.status === 'completado'
                      ? 'bg-green-100 text-green-700'
                      : resultado.status === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                    {resultado.status}
                  </span>
                </div>

                {resultado.errores.length > 0 && (
                  <div className="mt-3 text-sm text-red-600">
                    <p className="font-medium">Errores:</p>
                    <ul className="list-disc list-inside">
                      {resultado.errores.slice(0, 5).map((error, j) => (
                        <li key={j}>{error}</li>
                      ))}
                      {resultado.errores.length > 5 && (
                        <li>...y {resultado.errores.length - 5} más</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div className="bg-gray-50 rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Instrucciones de Importación</h3>

        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium mb-2">Para archivos del sistema actual:</h4>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-0.5 text-gray-400" />
                Usa el archivo "Archivo de control - RTR.xlsm"
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-0.5 text-gray-400" />
                Las hojas se detectan automáticamente
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-0.5 text-gray-400" />
                Los duplicados se omiten automáticamente
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Módulos especializados:</h4>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 mt-0.5 text-gray-400" />
                Casetas: Usa el módulo Casetas para importar TAG
              </li>
              <li className="flex items-start gap-2">
                <Radio className="w-4 h-4 mt-0.5 text-gray-400" />
                Telemetría: Usa el módulo Telemetría para GPS
              </li>
              <li className="flex items-start gap-2">
                <Truck className="w-4 h-4 mt-0.5 text-gray-400" />
                Vehículos: Importa desde Excel o registra en Flota
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

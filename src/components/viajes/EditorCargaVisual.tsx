/**
 * Editor Visual de Carga
 * Permite al dispatcher visualizar y acomodar equipos en la plataforma
 * Por defecto los equipos solo se mueven en eje X (suben rodando)
 * Opciones para desbloquear eje Y y rotación para casos especiales
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Check,
  Move,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Info,
  Lock,
  Unlock,
  RotateCw,
  ArrowLeftRight,
  ArrowUpDown,
  Maximize2,
} from 'lucide-react';
import type { EquipoCargaViaje } from '../../types/trip.types';

interface PlataformaConfig {
  largo: number;      // metros
  ancho: number;      // metros
  capacidadTon: number;
  nombre: string;
}

interface EquipoConPosicion extends EquipoCargaViaje {
  posicionX: number;  // posición en metros desde el inicio de la plataforma
  posicionY: number;  // posición en metros desde el borde de la plataforma
  rotado: boolean;    // si está rotado 90 grados
}

interface EditorCargaVisualProps {
  plataforma: PlataformaConfig;
  equipos: EquipoCargaViaje[];
  onAcomodoCambiado?: (equipos: EquipoConPosicion[]) => void;
  readOnly?: boolean;
}

// Constantes de visualización
const PIXELS_POR_METRO = 80; // Escala base - aumentada para mejor visualización
const PADDING = 60;
const ESPACIO_MINIMO = 0.1; // metros entre equipos

export default function EditorCargaVisual({
  plataforma,
  equipos,
  onAcomodoCambiado,
  readOnly = false,
}: EditorCargaVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [equiposConPosicion, setEquiposConPosicion] = useState<EquipoConPosicion[]>([]);
  const [equipoArrastrado, setEquipoArrastrado] = useState<string | null>(null);
  const [offsetArrastre, setOffsetArrastre] = useState({ x: 0, y: 0 });

  // Opciones de movimiento
  const [permitirEjeY, setPermitirEjeY] = useState(false);
  const [permitirRotacion, setPermitirRotacion] = useState(false);

  // Calcular zoom óptimo para que quepa en pantalla
  function calcularZoomOptimo(): number {
    const anchoDisponible = 1400; // px disponibles para el canvas
    return Math.min(1, anchoDisponible / ((plataforma.largo * PIXELS_POR_METRO) + (PADDING * 2) + 50));
  }

  const [zoom, setZoom] = useState(() => calcularZoomOptimo());

  // Recalcular zoom cuando cambie la plataforma
  useEffect(() => {
    setZoom(calcularZoomOptimo());
  }, [plataforma.largo]);

  // Calcular altura de plataforma basada en el ancho real
  const ALTURA_PLATAFORMA = plataforma.ancho * PIXELS_POR_METRO * zoom;

  // Calcular dimensiones del canvas
  const anchoCanvas = (plataforma.largo * PIXELS_POR_METRO * zoom) + (PADDING * 2) + 50; // extra para regla
  const altoCanvas = ALTURA_PLATAFORMA + (PADDING * 2) + 40; // extra para etiquetas

  // Obtener dimensiones efectivas de un equipo (considerando rotación)
  function getDimensionesEfectivas(equipo: EquipoConPosicion) {
    if (equipo.rotado) {
      return {
        largo: equipo.dimensiones.ancho,
        ancho: equipo.dimensiones.largo,
      };
    }
    return {
      largo: equipo.dimensiones.largo,
      ancho: equipo.dimensiones.ancho,
    };
  }

  // Inicializar posiciones de equipos (acomodo inicial secuencial)
  useEffect(() => {
    let posicionActual = ESPACIO_MINIMO;
    const equiposIniciales: EquipoConPosicion[] = equipos.map((equipo) => {
      const equipoConPos: EquipoConPosicion = {
        ...equipo,
        posicionX: posicionActual,
        posicionY: (plataforma.ancho - equipo.dimensiones.ancho) / 2, // Centrado en Y
        rotado: false,
      };
      posicionActual += equipo.dimensiones.largo + ESPACIO_MINIMO;
      return equipoConPos;
    });
    setEquiposConPosicion(equiposIniciales);
  }, [equipos, plataforma.ancho]);

  // Calcular métricas
  const pesoTotal = equiposConPosicion.reduce((sum, e) => sum + e.peso, 0) / 1000; // kg a ton

  // Calcular largo ocupado considerando rotación
  const largoOcupado = equiposConPosicion.length > 0
    ? Math.max(...equiposConPosicion.map(e => {
        const dims = getDimensionesEfectivas(e);
        return e.posicionX + dims.largo;
      }))
    : 0;

  // Calcular ancho máximo ocupado - considerando superposición en eje X
  // Para cada punto X, calcular la suma de anchos de equipos que lo ocupan
  function calcularAnchoMaximoOcupado(): number {
    if (equiposConPosicion.length === 0) return 0;

    // Para encontrar el ancho máximo ocupado, verificamos en cada "corte" vertical
    // qué equipos se superponen y sumamos sus anchos si están en diferentes posiciones Y
    let maxAncho = 0;

    // Obtener todos los puntos X de inicio y fin de equipos
    const puntosX: number[] = [];
    equiposConPosicion.forEach(e => {
      const dims = getDimensionesEfectivas(e);
      puntosX.push(e.posicionX);
      puntosX.push(e.posicionX + dims.largo);
    });
    // Ordenar y eliminar duplicados
    const puntosUnicos = [...new Set(puntosX)].sort((a, b) => a - b);

    // Para cada par de puntos consecutivos, verificar qué equipos están presentes
    for (let i = 0; i < puntosUnicos.length - 1; i++) {
      const puntoMedio = (puntosUnicos[i] + puntosUnicos[i + 1]) / 2;

      // Encontrar equipos que ocupan este punto X
      const equiposEnPunto = equiposConPosicion.filter(e => {
        const dims = getDimensionesEfectivas(e);
        return e.posicionX <= puntoMedio && (e.posicionX + dims.largo) > puntoMedio;
      });

      if (equiposEnPunto.length > 0) {
        // Calcular el rango Y ocupado (desde el mínimo Y hasta el máximo Y+ancho)
        let minY = Infinity;
        let maxY = 0;
        equiposEnPunto.forEach(e => {
          const dims = getDimensionesEfectivas(e);
          minY = Math.min(minY, e.posicionY);
          maxY = Math.max(maxY, e.posicionY + dims.ancho);
        });
        const anchoEnPunto = maxY - minY;
        maxAncho = Math.max(maxAncho, anchoEnPunto);
      }
    }

    return maxAncho;
  }

  const anchoOcupado = calcularAnchoMaximoOcupado();

  // Detectar colisiones/superposiciones entre equipos
  function detectarColisiones(): { equipo1: string; equipo2: string }[] {
    const colisiones: { equipo1: string; equipo2: string }[] = [];

    for (let i = 0; i < equiposConPosicion.length; i++) {
      for (let j = i + 1; j < equiposConPosicion.length; j++) {
        const e1 = equiposConPosicion[i];
        const e2 = equiposConPosicion[j];
        const dims1 = getDimensionesEfectivas(e1);
        const dims2 = getDimensionesEfectivas(e2);

        // Verificar superposición en X
        const superposicionX = e1.posicionX < (e2.posicionX + dims2.largo) &&
                               (e1.posicionX + dims1.largo) > e2.posicionX;

        // Verificar superposición en Y
        const superposicionY = e1.posicionY < (e2.posicionY + dims2.ancho) &&
                               (e1.posicionY + dims1.ancho) > e2.posicionY;

        if (superposicionX && superposicionY) {
          colisiones.push({ equipo1: e1.id, equipo2: e2.id });
        }
      }
    }

    return colisiones;
  }

  const colisiones = detectarColisiones();
  const hayColision = colisiones.length > 0;

  // Validaciones
  const excedePeso = pesoTotal > plataforma.capacidadTon;
  const excedeLargo = largoOcupado > plataforma.largo;
  const excedeAncho = anchoOcupado > plataforma.ancho;
  const hayError = excedePeso || excedeLargo || excedeAncho;

  // Calcular centro de gravedad (simplificado, en 2D)
  const centroGravedadX = equiposConPosicion.length > 0
    ? equiposConPosicion.reduce((sum, e) => {
        const dims = getDimensionesEfectivas(e);
        const centroEquipo = e.posicionX + (dims.largo / 2);
        const pesoEquipo = e.peso / 1000;
        return sum + (centroEquipo * pesoEquipo);
      }, 0) / pesoTotal
    : plataforma.largo / 2;

  const centroGravedadY = equiposConPosicion.length > 0
    ? equiposConPosicion.reduce((sum, e) => {
        const dims = getDimensionesEfectivas(e);
        const centroEquipo = e.posicionY + (dims.ancho / 2);
        const pesoEquipo = e.peso / 1000;
        return sum + (centroEquipo * pesoEquipo);
      }, 0) / pesoTotal
    : plataforma.ancho / 2;

  const centroPlataformaX = plataforma.largo / 2;
  const centroPlataformaY = plataforma.ancho / 2;
  const desbalanceX = Math.abs(centroGravedadX - centroPlataformaX);
  const desbalanceY = Math.abs(centroGravedadY - centroPlataformaY);
  const porcentajeDesbalanceX = (desbalanceX / centroPlataformaX) * 100;
  const porcentajeDesbalanceY = (desbalanceY / centroPlataformaY) * 100;
  const balanceado = porcentajeDesbalanceX < 20 && porcentajeDesbalanceY < 20;

  // Handlers de arrastre
  const handleMouseDown = useCallback((e: React.MouseEvent, equipoId: string) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    const equipo = equiposConPosicion.find(eq => eq.id === equipoId);
    if (!equipo) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left - PADDING;
    const mouseY = e.clientY - rect.top - PADDING;
    const posicionMetrosX = mouseX / (PIXELS_POR_METRO * zoom);
    const posicionMetrosY = mouseY / (PIXELS_POR_METRO * zoom);
    const offsetX = posicionMetrosX - equipo.posicionX;
    const offsetY = posicionMetrosY - equipo.posicionY;

    setEquipoArrastrado(equipoId);
    setOffsetArrastre({ x: offsetX, y: offsetY });
  }, [equiposConPosicion, readOnly, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!equipoArrastrado || readOnly) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left - PADDING;
    const mouseY = e.clientY - rect.top - PADDING;
    const posicionMetrosX = mouseX / (PIXELS_POR_METRO * zoom) - offsetArrastre.x;
    const posicionMetrosY = mouseY / (PIXELS_POR_METRO * zoom) - offsetArrastre.y;

    const equipo = equiposConPosicion.find(eq => eq.id === equipoArrastrado);
    if (!equipo) return;

    const dims = getDimensionesEfectivas(equipo);

    // Limitar al rango de la plataforma en X
    const posicionMinimaX = 0;
    const posicionMaximaX = plataforma.largo - dims.largo;
    const nuevaPosicionX = Math.max(posicionMinimaX, Math.min(posicionMaximaX, posicionMetrosX));

    // Limitar al rango de la plataforma en Y (solo si está habilitado)
    let nuevaPosicionY = equipo.posicionY;
    if (permitirEjeY) {
      const posicionMinimaY = 0;
      const posicionMaximaY = plataforma.ancho - dims.ancho;
      nuevaPosicionY = Math.max(posicionMinimaY, Math.min(posicionMaximaY, posicionMetrosY));
    }

    setEquiposConPosicion(prev => prev.map(eq => {
      if (eq.id === equipoArrastrado) {
        return {
          ...eq,
          posicionX: nuevaPosicionX,
          posicionY: nuevaPosicionY,
        };
      }
      return eq;
    }));
  }, [equipoArrastrado, offsetArrastre, plataforma.largo, plataforma.ancho, readOnly, zoom, equiposConPosicion, permitirEjeY]);

  const handleMouseUp = useCallback(() => {
    if (equipoArrastrado && onAcomodoCambiado) {
      onAcomodoCambiado(equiposConPosicion);
    }
    setEquipoArrastrado(null);
    setOffsetArrastre({ x: 0, y: 0 });
  }, [equipoArrastrado, equiposConPosicion, onAcomodoCambiado]);

  // Rotar un equipo 90 grados
  function rotarEquipo(equipoId: string) {
    if (!permitirRotacion || readOnly) return;

    setEquiposConPosicion(prev => prev.map(eq => {
      if (eq.id === equipoId) {
        const nuevoRotado = !eq.rotado;
        // Ajustar posición para que no se salga de la plataforma al rotar
        const nuevoLargo = nuevoRotado ? eq.dimensiones.ancho : eq.dimensiones.largo;
        const nuevoAncho = nuevoRotado ? eq.dimensiones.largo : eq.dimensiones.ancho;

        let nuevaPosX = eq.posicionX;
        let nuevaPosY = eq.posicionY;

        // Ajustar X si se sale
        if (nuevaPosX + nuevoLargo > plataforma.largo) {
          nuevaPosX = Math.max(0, plataforma.largo - nuevoLargo);
        }
        // Ajustar Y si se sale
        if (nuevaPosY + nuevoAncho > plataforma.ancho) {
          nuevaPosY = Math.max(0, plataforma.ancho - nuevoAncho);
        }

        return {
          ...eq,
          rotado: nuevoRotado,
          posicionX: nuevaPosX,
          posicionY: nuevaPosY,
        };
      }
      return eq;
    }));

    if (onAcomodoCambiado) {
      onAcomodoCambiado(equiposConPosicion);
    }
  }

  // Auto-acomodar equipos secuencialmente
  function autoAcomodar() {
    let posicionActual = ESPACIO_MINIMO;
    const equiposOrdenados = [...equiposConPosicion].sort((a, b) => b.peso - a.peso);

    const nuevosEquipos = equiposOrdenados.map((equipo) => {
      const dims = getDimensionesEfectivas(equipo);
      const equipoActualizado: EquipoConPosicion = {
        ...equipo,
        posicionX: posicionActual,
        posicionY: (plataforma.ancho - dims.ancho) / 2, // Centrar en Y
        rotado: false, // Resetear rotación
      };
      posicionActual += equipo.dimensiones.largo + ESPACIO_MINIMO;
      return equipoActualizado;
    });

    setEquiposConPosicion(nuevosEquipos);
    if (onAcomodoCambiado) {
      onAcomodoCambiado(nuevosEquipos);
    }
  }

  // Colores por marca para distinguir equipos
  const coloresMarca: Record<string, string> = {
    'Genie': '#1e40af',
    'JLG': '#b91c1c',
    'Skyjack': '#ca8a04',
    'Haulotte': '#15803d',
    'Snorkel': '#7c3aed',
    'default': '#6b7280',
  };

  function getColorEquipo(marca: string): string {
    return coloresMarca[marca] || coloresMarca.default;
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Move size={18} />
            Editor de Acomodo de Carga
          </h3>
          <p className="text-sm text-gray-500">
            {plataforma.nombre} - {plataforma.largo}m x {plataforma.ancho}m - {plataforma.capacidadTon} ton
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Controles de zoom */}
          <div className="flex items-center gap-1 border rounded-lg px-2 py-1">
            <button
              onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
              className="p-1 rounded hover:bg-gray-100"
              title="Reducir"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-sm text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(2, z + 0.1))}
              className="p-1 rounded hover:bg-gray-100"
              title="Ampliar"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoom(calcularZoomOptimo())}
              className="p-1 rounded hover:bg-gray-100 ml-1 border-l pl-2"
              title="Ajustar a pantalla"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          {!readOnly && (
            <button
              onClick={autoAcomodar}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1.5"
              title="Auto-acomodar equipos"
            >
              <RotateCcw size={14} />
              Auto-acomodar
            </button>
          )}
        </div>
      </div>

      {/* Opciones de movimiento */}
      {!readOnly && (
        <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600 font-medium">Opciones:</span>

          {/* Toggle Eje Y */}
          <button
            onClick={() => setPermitirEjeY(!permitirEjeY)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              permitirEjeY
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            {permitirEjeY ? <Unlock size={14} /> : <Lock size={14} />}
            <ArrowUpDown size={14} />
            Mover en Eje Y
          </button>

          {/* Toggle Rotación */}
          <button
            onClick={() => setPermitirRotacion(!permitirRotacion)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              permitirRotacion
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            {permitirRotacion ? <Unlock size={14} /> : <Lock size={14} />}
            <RotateCw size={14} />
            Permitir Rotación
          </button>

          {(permitirEjeY || permitirRotacion) && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle size={12} />
              Modo avanzado: verificar acomodo físicamente
            </span>
          )}
        </div>
      )}

      {/* Indicadores de estado */}
      <div className="flex flex-wrap gap-3">
        {/* Peso */}
        <div className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${
          excedePeso ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {excedePeso ? <AlertTriangle size={14} /> : <Check size={14} />}
          Peso: {pesoTotal.toFixed(1)} / {plataforma.capacidadTon} ton
        </div>

        {/* Largo */}
        <div className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${
          excedeLargo ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {excedeLargo ? <AlertTriangle size={14} /> : <Check size={14} />}
          Largo: {largoOcupado.toFixed(2)} / {plataforma.largo} m
        </div>

        {/* Ancho */}
        <div className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${
          excedeAncho ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {excedeAncho ? <AlertTriangle size={14} /> : <Check size={14} />}
          Ancho: {anchoOcupado.toFixed(2)} / {plataforma.ancho} m
        </div>

        {/* Balance */}
        <div className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${
          balanceado ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
        }`}>
          <Info size={14} />
          Balance: {balanceado ? 'OK' : `X:${porcentajeDesbalanceX.toFixed(0)}% Y:${porcentajeDesbalanceY.toFixed(0)}%`}
        </div>

      </div>

      {/* Canvas de visualización */}
      <div
        ref={containerRef}
        className="overflow-auto border rounded-lg bg-gray-50"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width={anchoCanvas}
          height={altoCanvas}
          className="select-none"
        >
          {/* Fondo de plataforma */}
          <rect
            x={PADDING}
            y={PADDING}
            width={plataforma.largo * PIXELS_POR_METRO * zoom}
            height={ALTURA_PLATAFORMA}
            fill="#e5e7eb"
            stroke="#9ca3af"
            strokeWidth={2}
            rx={4}
          />

          {/* Cuadrícula de metros - Vertical (largo) - cada 0.5m */}
          {Array.from({ length: Math.ceil(plataforma.largo * 2) + 1 }).map((_, i) => {
            const metros = i / 2;
            const esMetroCompleto = i % 2 === 0;
            return (
              <g key={`v-${i}`}>
                <line
                  x1={PADDING + (metros * PIXELS_POR_METRO * zoom)}
                  y1={PADDING}
                  x2={PADDING + (metros * PIXELS_POR_METRO * zoom)}
                  y2={PADDING + ALTURA_PLATAFORMA}
                  stroke={esMetroCompleto ? "#9ca3af" : "#e5e7eb"}
                  strokeWidth={esMetroCompleto ? 1 : 0.5}
                />
                {esMetroCompleto && (
                  <text
                    x={PADDING + (metros * PIXELS_POR_METRO * zoom)}
                    y={PADDING + ALTURA_PLATAFORMA + 18}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight="500"
                    fill="#374151"
                  >
                    {metros}m
                  </text>
                )}
              </g>
            );
          })}

          {/* Cuadrícula de metros - Horizontal (ancho) - cada 0.5m */}
          {Array.from({ length: Math.ceil(plataforma.ancho * 2) + 1 }).map((_, i) => {
            const metros = i / 2;
            const esMetroCompleto = i % 2 === 0;
            return (
              <g key={`h-${i}`}>
                <line
                  x1={PADDING}
                  y1={PADDING + (metros * PIXELS_POR_METRO * zoom)}
                  x2={PADDING + (plataforma.largo * PIXELS_POR_METRO * zoom)}
                  y2={PADDING + (metros * PIXELS_POR_METRO * zoom)}
                  stroke={esMetroCompleto ? "#9ca3af" : "#e5e7eb"}
                  strokeWidth={esMetroCompleto ? 1 : 0.5}
                  strokeDasharray={esMetroCompleto ? "none" : "2,2"}
                />
                {esMetroCompleto && (
                  <text
                    x={PADDING - 10}
                    y={PADDING + (metros * PIXELS_POR_METRO * zoom) + 4}
                    textAnchor="end"
                    fontSize={11}
                    fontWeight="500"
                    fill="#374151"
                  >
                    {metros}m
                  </text>
                )}
              </g>
            );
          })}

          {/* Regla de referencia de 1 metro */}
          <g>
            <rect
              x={PADDING + (plataforma.largo * PIXELS_POR_METRO * zoom) + 15}
              y={PADDING}
              width={20}
              height={1 * PIXELS_POR_METRO * zoom}
              fill="#3b82f6"
              rx={2}
            />
            <text
              x={PADDING + (plataforma.largo * PIXELS_POR_METRO * zoom) + 25}
              y={PADDING + (0.5 * PIXELS_POR_METRO * zoom) + 4}
              textAnchor="middle"
              fontSize={10}
              fontWeight="bold"
              fill="white"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' } as React.CSSProperties}
            >
              1m
            </text>
          </g>

          {/* Indicador de centro de plataforma */}
          <line
            x1={PADDING + (centroPlataformaX * PIXELS_POR_METRO * zoom)}
            y1={PADDING - 5}
            x2={PADDING + (centroPlataformaX * PIXELS_POR_METRO * zoom)}
            y2={PADDING + ALTURA_PLATAFORMA + 5}
            stroke="#9ca3af"
            strokeWidth={1}
            strokeDasharray="4,2"
          />
          <line
            x1={PADDING - 5}
            y1={PADDING + (centroPlataformaY * PIXELS_POR_METRO * zoom)}
            x2={PADDING + (plataforma.largo * PIXELS_POR_METRO * zoom) + 5}
            y2={PADDING + (centroPlataformaY * PIXELS_POR_METRO * zoom)}
            stroke="#9ca3af"
            strokeWidth={1}
            strokeDasharray="4,2"
          />

          {/* Indicador de centro de gravedad */}
          {equiposConPosicion.length > 0 && (
            <g>
              {/* Línea vertical CG */}
              <line
                x1={PADDING + (centroGravedadX * PIXELS_POR_METRO * zoom)}
                y1={PADDING - 10}
                x2={PADDING + (centroGravedadX * PIXELS_POR_METRO * zoom)}
                y2={PADDING + ALTURA_PLATAFORMA + 10}
                stroke={balanceado ? "#22c55e" : "#f59e0b"}
                strokeWidth={2}
              />
              {/* Línea horizontal CG */}
              <line
                x1={PADDING - 10}
                y1={PADDING + (centroGravedadY * PIXELS_POR_METRO * zoom)}
                x2={PADDING + (plataforma.largo * PIXELS_POR_METRO * zoom) + 10}
                y2={PADDING + (centroGravedadY * PIXELS_POR_METRO * zoom)}
                stroke={balanceado ? "#22c55e" : "#f59e0b"}
                strokeWidth={2}
              />
              {/* Punto CG */}
              <circle
                cx={PADDING + (centroGravedadX * PIXELS_POR_METRO * zoom)}
                cy={PADDING + (centroGravedadY * PIXELS_POR_METRO * zoom)}
                r={8}
                fill={balanceado ? "#22c55e" : "#f59e0b"}
                stroke="white"
                strokeWidth={2}
              />
              <text
                x={PADDING + (centroGravedadX * PIXELS_POR_METRO * zoom)}
                y={PADDING - 20}
                textAnchor="middle"
                fontSize={10}
                fill={balanceado ? "#22c55e" : "#f59e0b"}
                fontWeight="bold"
              >
                CG
              </text>
            </g>
          )}

          {/* Equipos */}
          {equiposConPosicion.map((equipo) => {
            const dims = getDimensionesEfectivas(equipo);
            const x = PADDING + (equipo.posicionX * PIXELS_POR_METRO * zoom);
            const y = PADDING + (equipo.posicionY * PIXELS_POR_METRO * zoom);
            const ancho = dims.largo * PIXELS_POR_METRO * zoom;
            const alto = dims.ancho * PIXELS_POR_METRO * zoom;
            const color = getColorEquipo(equipo.marca);
            const estaArrastrado = equipoArrastrado === equipo.id;
            const tieneColision = colisiones.some(c => c.equipo1 === equipo.id || c.equipo2 === equipo.id);

            return (
              <g
                key={equipo.id}
                onMouseDown={(e) => handleMouseDown(e, equipo.id)}
                onDoubleClick={() => rotarEquipo(equipo.id)}
                style={{ cursor: readOnly ? 'default' : 'grab' }}
              >
                {/* Sombra */}
                <rect
                  x={x + 2}
                  y={y + 2}
                  width={ancho}
                  height={alto}
                  fill="rgba(0,0,0,0.15)"
                  rx={4}
                />

                {/* Equipo */}
                <rect
                  x={x}
                  y={y}
                  width={ancho}
                  height={alto}
                  fill={tieneColision ? "#ef4444" : color}
                  stroke={estaArrastrado ? "#fbbf24" : tieneColision ? "#b91c1c" : equipo.rotado ? "#8b5cf6" : "#374151"}
                  strokeWidth={estaArrastrado ? 3 : tieneColision ? 3 : equipo.rotado ? 2 : 1}
                  rx={4}
                  opacity={estaArrastrado ? 0.8 : tieneColision ? 0.9 : 1}
                />

                {/* Indicador de rotación */}
                {equipo.rotado && (
                  <g>
                    <circle
                      cx={x + ancho - 10}
                      cy={y + 10}
                      r={8}
                      fill="#8b5cf6"
                    />
                    <RotateCw
                      x={x + ancho - 16}
                      y={y + 4}
                      size={12}
                      color="white"
                    />
                  </g>
                )}

                {/* Etiqueta del equipo */}
                <text
                  x={x + ancho / 2}
                  y={y + alto / 2 - 8}
                  textAnchor="middle"
                  fontSize={Math.min(10, alto / 5)}
                  fill="white"
                  fontWeight="bold"
                >
                  {equipo.marca}
                </text>
                <text
                  x={x + ancho / 2}
                  y={y + alto / 2 + 4}
                  textAnchor="middle"
                  fontSize={Math.min(9, alto / 6)}
                  fill="white"
                >
                  {equipo.modelo}
                </text>
                <text
                  x={x + ancho / 2}
                  y={y + alto / 2 + 16}
                  textAnchor="middle"
                  fontSize={Math.min(8, alto / 7)}
                  fill="rgba(255,255,255,0.8)"
                >
                  {dims.largo.toFixed(1)}m × {dims.ancho.toFixed(1)}m
                </text>

                {/* Indicador de peso debajo */}
                <text
                  x={x + ancho / 2}
                  y={y + alto + 12}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#6b7280"
                >
                  {(equipo.peso / 1000).toFixed(1)} ton
                </text>
              </g>
            );
          })}

          {/* Zona de exceso (si excede el largo) */}
          {largoOcupado > plataforma.largo && (
            <rect
              x={PADDING + (plataforma.largo * PIXELS_POR_METRO * zoom)}
              y={PADDING}
              width={(largoOcupado - plataforma.largo) * PIXELS_POR_METRO * zoom}
              height={ALTURA_PLATAFORMA}
              fill="rgba(239, 68, 68, 0.2)"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="4,4"
            />
          )}
        </svg>
      </div>

      {/* Leyenda y notas */}
      <div className="flex items-start justify-between text-xs text-gray-500 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-400" /> Centro plataforma
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500" /> Centro de gravedad
          </span>
          {permitirRotacion && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-purple-500" /> Equipo rotado
            </span>
          )}
        </div>
        {!readOnly && (
          <p className="text-right">
            {permitirEjeY ? 'Arrastra en X e Y' : 'Arrastra horizontalmente'}
            {permitirRotacion && ' | Doble clic para rotar'}
          </p>
        )}
      </div>

      {/* Alerta si hay errores */}
      {hayError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium flex items-center gap-2">
            <AlertTriangle size={16} />
            La configuración actual excede los límites de la plataforma
          </p>
          <ul className="mt-1 text-sm text-red-600 ml-6 list-disc">
            {excedePeso && <li>Peso total excede la capacidad ({pesoTotal.toFixed(1)} &gt; {plataforma.capacidadTon} ton)</li>}
            {excedeLargo && <li>Largo total excede la plataforma ({largoOcupado.toFixed(2)} &gt; {plataforma.largo} m)</li>}
            {excedeAncho && <li>Ancho ocupado excede la plataforma ({anchoOcupado.toFixed(2)} &gt; {plataforma.ancho} m)</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

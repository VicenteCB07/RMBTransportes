# Plan de Implementacion - RMB Transportes

> **Instrucciones**: Edita este archivo para agregar issues, funciones pendientes o tareas.
> Claude lo lee al inicio de cada sesion y trabaja en los items marcados.

---

## Sesion Actual
<!-- Agrega aqui las tareas para la sesion actual -->

- [ ]

---

## Issues Pendientes (Alta Prioridad)

- [ ] Si una unidad solo tiene un operador, al seleccionar la unidad debera seleccionarse automaticamente la unica opcion de operador disponible
- [x] Velocidad promedio para calculos: Factor 1.5x sobre Mapbox (~25-30 km/h efectivos)
- [x] Generar plan de trabajo del dia por operador y por unidad (PDF sin costos/con costos)
- [ ] Crear usuarios reales.
- [ ] Activamos el modulo de mantenimiento? vamos a organizarnos primero sobre el que y como queremos que funcione.
- [ ] El folio de las OS vamos a quitar la unidad. "TRCXX" 

---

## Funciones por Implementar

### Modulo Viajes
- [ ] Geocodificacion de direcciones (Mapbox)
- [ ] Calculo automatico de casetas por ruta
- [ ] Exportar viaje a PDF

### Modulo Tractocamiones
- [x] Campos de capacidad de carga para Roll-Off (largo, ancho, toneladas)

### Modulo Equipos (Maquinaria)
- [x] Catalogo de 107 modelos de maquinaria
- [x] Selector de equipos en OS
- [ ] Validar si equipo cabe en plataforma (largo x ancho)

### Dashboard
- [ ] KPIs principales (viajes del dia, km recorridos, utilidad)
- [ ] Graficas de rendimiento

### Integraciones
- [ ] GPS Mastrack - telemetria en tiempo real
- [ ] Casetas TAG - registro automatico

---

## Mejoras de UX

- [x] Timeline de viaje con tiempos de espera y partida editables
- [x] Fecha compromiso inicia con fecha de hoy (formato dd/mm/aa)
- [x] Timeline clickeable (5 pasos: inicio, llegada, espera, partida, fin)
- [ ] Autocompletado de direcciones

---

## Bugs Conocidos

<!-- Agrega bugs que encuentres aqui -->

- [ ]

---

## Deuda Tecnica

- [ ] Scripts seed no usan servicio real (por import.meta.env)
- [ ] Falta validacion de campos requeridos en formularios
- [ ] No hay tests automatizados
- [ ] Bundle size muy grande (9MB) - implementar code splitting

---

## Completado Recientemente

### 21 Dic 2025
- [x] Plan de Trabajo PDF para operadores (sin costos)
- [x] Plan de Trabajo PDF para administracion (con costos, ingresos, utilidad)
- [x] Botones de exportar PDF en pagina Rutas
- [x] Panel de optimizacion oculto por defecto en Planificador
- [x] Filtros de status funcionando en Viajes
- [x] Viajes completados/en curso bloqueados para edicion en Planificador
- [x] Iconos de tipo servicio en Planificador
- [x] Modal de reagendamiento para Flete en falso

### 18 Dic 2025
- [x] Catalogo de equipos: 107 modelos (GENIE, JLG, ZOOMLION, etc.)
- [x] Selector de maquinaria en Ordenes de Servicio
- [x] Campos plataformaCarga en Tractocamiones (Roll-Off)
- [x] Timeline de viaje: tiempos de espera y partida editables
- [x] Fecha compromiso: valor inicial = hoy, formato dd/mm/aa
- [x] Timeline clickeable: 5 clicks para avanzar el viaje
  - Click 1: Iniciar viaje (programado -> en_curso)
  - Click 2: Registrar llegada (en_curso -> en_destino)
  - Click 3: Iniciar espera (guarda timestamp)
  - Click 4: Registrar partida (calcula tiempo espera automaticamente)
  - Click 5: Completar viaje (en_destino -> completado)
- [x] Obtener distancia desde OS: geocodificacion + Mapbox Directions
- [x] ETA con factor 1.5x y tiempo servicio 40 min default
- [x] Campo "Regresa a Base" en OS: checkbox manual para indicar regreso intermedio
- [x] Calculo de ruta considera regresos intermedios a base

### 17 Dic 2025
- [x] Modulo Viajes completo
- [x] Modulo Planificador con carga de trabajo
- [x] Correccion bugs: fechaCompromiso, tracto ID, contactos array

---

## Notas

<!-- Espacio para notas de desarrollo -->



/**
 * Componente para generar reportes de costos en PDF
 * Usa @react-pdf/renderer
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { Costo, CategoriaGasto, ResumenCostos } from '../../types/cost.types'
import { CATEGORIAS_GASTO } from '../../types/cost.types'
import { formatCurrency } from '../../services/currency.service'

// Registrar fuentes (opcional - usa las del sistema)
// Font.register({ family: 'Helvetica', src: '...' })

// Estilos del PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #BB0034',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#3D3D3D',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    padding: 8,
  },
  table: {
    display: 'flex',
    width: 'auto',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    minHeight: 30,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#1a1a1a',
  },
  tableHeaderText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableCell: {
    padding: 6,
  },
  colFecha: { width: '12%' },
  colCategoria: { width: '18%' },
  colDescripcion: { width: '30%' },
  colMonto: { width: '15%', textAlign: 'right' },
  colEstado: { width: '12%' },
  colVehiculo: { width: '13%' },
  summaryCard: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    marginBottom: 8,
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#BB0034',
    paddingTop: 8,
    marginTop: 8,
  },
  totalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#666',
    fontSize: 8,
  },
  badge: {
    padding: '2 6',
    borderRadius: 4,
    fontSize: 8,
  },
  badgePagado: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  badgePendiente: {
    backgroundColor: '#fef9c3',
    color: '#854d0e',
  },
})

interface CostReportPDFProps {
  costos: Costo[]
  resumen: ResumenCostos[]
  fechaInicio?: Date
  fechaFin?: Date
  titulo?: string
}

export default function CostReportPDF({
  costos,
  resumen,
  fechaInicio,
  fechaFin,
  titulo = 'Reporte de Costos',
}: CostReportPDFProps) {
  const totalGeneral = resumen.reduce((acc, r) => acc + r.totalMXN, 0)

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>RMB Transportes</Text>
          <Text style={styles.subtitle}>{titulo}</Text>
          {fechaInicio && fechaFin && (
            <Text style={styles.subtitle}>
              Período: {formatDate(fechaInicio)} - {formatDate(fechaFin)}
            </Text>
          )}
          <Text style={styles.subtitle}>
            Generado: {formatDate(new Date())}
          </Text>
        </View>

        {/* Resumen por Categoría */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen por Categoría</Text>
          <View style={styles.summaryCard}>
            {resumen.map((item) => (
              <View key={item.categoria} style={styles.summaryRow}>
                <Text>{CATEGORIAS_GASTO[item.categoria].label}</Text>
                <Text>
                  {item.cantidad} registro(s) - {formatCurrency(item.totalMXN)}
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalText}>TOTAL GENERAL</Text>
              <Text style={styles.totalText}>{formatCurrency(totalGeneral)}</Text>
            </View>
          </View>
        </View>

        {/* Tabla de Costos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle de Costos ({costos.length})</Text>
          <View style={styles.table}>
            {/* Header de tabla */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={[styles.tableCell, styles.colFecha]}>
                <Text style={styles.tableHeaderText}>Fecha</Text>
              </View>
              <View style={[styles.tableCell, styles.colCategoria]}>
                <Text style={styles.tableHeaderText}>Categoría</Text>
              </View>
              <View style={[styles.tableCell, styles.colDescripcion]}>
                <Text style={styles.tableHeaderText}>Descripción</Text>
              </View>
              <View style={[styles.tableCell, styles.colMonto]}>
                <Text style={styles.tableHeaderText}>Monto MXN</Text>
              </View>
              <View style={[styles.tableCell, styles.colEstado]}>
                <Text style={styles.tableHeaderText}>Estado</Text>
              </View>
              <View style={[styles.tableCell, styles.colVehiculo]}>
                <Text style={styles.tableHeaderText}>Vehículo</Text>
              </View>
            </View>

            {/* Filas de datos */}
            {costos.slice(0, 50).map((costo) => (
              <View key={costo.id} style={styles.tableRow}>
                <View style={[styles.tableCell, styles.colFecha]}>
                  <Text>{formatDate(costo.fecha)}</Text>
                </View>
                <View style={[styles.tableCell, styles.colCategoria]}>
                  <Text>{CATEGORIAS_GASTO[costo.categoria].label}</Text>
                </View>
                <View style={[styles.tableCell, styles.colDescripcion]}>
                  <Text>{costo.descripcion.substring(0, 40)}</Text>
                </View>
                <View style={[styles.tableCell, styles.colMonto]}>
                  <Text>{formatCurrency(costo.montoMXN)}</Text>
                </View>
                <View style={[styles.tableCell, styles.colEstado]}>
                  <Text
                    style={[
                      styles.badge,
                      costo.estado === 'pagado'
                        ? styles.badgePagado
                        : styles.badgePendiente,
                    ]}
                  >
                    {costo.estado.toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.tableCell, styles.colVehiculo]}>
                  <Text>{costo.vehiculoId || '-'}</Text>
                </View>
              </View>
            ))}
          </View>

          {costos.length > 50 && (
            <Text style={{ marginTop: 10, color: '#666', fontSize: 9 }}>
              * Se muestran los primeros 50 registros de {costos.length} totales
            </Text>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          RMB Transportes - Sistema de Gestión | {new Date().getFullYear()}
        </Text>
      </Page>
    </Document>
  )
}

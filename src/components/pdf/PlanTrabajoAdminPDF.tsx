/**
 * PDF Plan de Trabajo para Administracion
 * Version con costos e ingresos completos
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { PlanTrabajoData } from '../../services/plantrabajo.service';
import { formatearFechaPDF, formatearMonedaPDF } from '../../services/plantrabajo.service';

const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 12,
    borderBottom: '2 solid #BB0034',
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: '#3D3D3D',
  },
  adminBadge: {
    fontSize: 8,
    backgroundColor: '#BB0034',
    color: '#fff',
    padding: '2 6',
    borderRadius: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 12,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 6,
    borderRadius: 4,
  },
  infoLabel: {
    fontSize: 7,
    color: '#666',
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  infoExtra: {
    fontSize: 7,
    color: '#666',
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  table: {
    marginTop: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    padding: 4,
  },
  tableHeaderText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #eee',
    padding: 4,
    minHeight: 24,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  colNum: { width: '5%' },
  colHora: { width: '8%' },
  colTipo: { width: '10%' },
  colCliente: { width: '17%' },
  colDireccion: { width: '20%' },
  colIngreso: { width: '10%', textAlign: 'right' },
  colCosto: { width: '10%', textAlign: 'right' },
  colUtilidad: { width: '10%', textAlign: 'right' },
  colMargen: { width: '10%', textAlign: 'right' },
  cellText: {
    fontSize: 8,
  },
  cellBold: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  positivo: {
    color: '#2e7d32',
  },
  negativo: {
    color: '#c62828',
  },
  resumenFinanciero: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  resumenCard: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
  },
  resumenIngresos: {
    backgroundColor: '#e8f5e9',
    borderLeft: '3 solid #2e7d32',
  },
  resumenCostos: {
    backgroundColor: '#ffebee',
    borderLeft: '3 solid #c62828',
  },
  resumenUtilidad: {
    backgroundColor: '#e3f2fd',
    borderLeft: '3 solid #1565c0',
  },
  resumenMargen: {
    backgroundColor: '#fff8e1',
    borderLeft: '3 solid #f57c00',
  },
  resumenLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  resumenValor: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  paradaDetalle: {
    marginBottom: 8,
    border: '1 solid #e0e0e0',
    borderRadius: 4,
    padding: 8,
  },
  paradaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderBottom: '1 solid #eee',
    paddingBottom: 4,
  },
  paradaInfo: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  paradaNumero: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#BB0034',
  },
  paradaTipo: {
    fontSize: 8,
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '2 4',
    borderRadius: 2,
  },
  paradaHora: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: '3 6',
    borderRadius: 3,
  },
  paradaCliente: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  paradaDireccion: {
    fontSize: 8,
    color: '#444',
    marginBottom: 4,
  },
  paradaFinanzas: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    padding: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 3,
  },
  finanzaItem: {
    flex: 1,
  },
  finanzaLabel: {
    fontSize: 7,
    color: '#666',
  },
  finanzaValor: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 25,
    right: 25,
    textAlign: 'center',
    color: '#999',
    fontSize: 7,
    borderTop: '1 solid #eee',
    paddingTop: 6,
  },
});

interface Props {
  data: PlanTrabajoData;
}

export default function PlanTrabajoAdminPDF({ data }: Props) {
  const resumen = data.resumenFinanciero || { ingresoTotal: 0, costoTotal: 0, utilidadTotal: 0, margenPromedio: 0 };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Plan de Trabajo - Administracion</Text>
          <Text style={styles.subtitle}>{formatearFechaPDF(data.fecha)}</Text>
          <Text style={styles.adminBadge}>CONFIDENCIAL - USO INTERNO</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>UNIDAD</Text>
              <Text style={styles.infoValue}>{data.unidad.numeroEconomico}</Text>
              <Text style={styles.infoExtra}>{data.unidad.marca} - {data.unidad.tipoUnidad}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>OPERADOR</Text>
              <Text style={styles.infoValue}>{data.operador.nombre}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>JORNADA</Text>
              <Text style={styles.infoValue}>{data.horaInicio} - {data.horaFin}</Text>
              <Text style={styles.infoExtra}>{Math.round(data.kmTotales)} km totales</Text>
            </View>
          </View>
        </View>

        <View style={styles.resumenFinanciero}>
          <View style={[styles.resumenCard, styles.resumenIngresos]}>
            <Text style={styles.resumenLabel}>INGRESOS TOTALES</Text>
            <Text style={[styles.resumenValor, styles.positivo]}>{formatearMonedaPDF(resumen.ingresoTotal)}</Text>
          </View>
          <View style={[styles.resumenCard, styles.resumenCostos]}>
            <Text style={styles.resumenLabel}>COSTOS TOTALES</Text>
            <Text style={[styles.resumenValor, styles.negativo]}>{formatearMonedaPDF(resumen.costoTotal)}</Text>
          </View>
          <View style={[styles.resumenCard, styles.resumenUtilidad]}>
            <Text style={styles.resumenLabel}>UTILIDAD</Text>
            <Text style={[styles.resumenValor, resumen.utilidadTotal >= 0 ? styles.positivo : styles.negativo]}>
              {formatearMonedaPDF(resumen.utilidadTotal)}
            </Text>
          </View>
          <View style={[styles.resumenCard, styles.resumenMargen]}>
            <Text style={styles.resumenLabel}>MARGEN</Text>
            <Text style={styles.resumenValor}>{resumen.margenPromedio}%</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle por Servicio ({data.paradas.length})</Text>
          {data.paradas.map((parada, idx) => (
            <View key={parada.folio} style={styles.paradaDetalle}>
              <View style={styles.paradaHeader}>
                <View style={styles.paradaInfo}>
                  <Text style={styles.paradaNumero}>#{parada.orden}</Text>
                  <Text style={styles.paradaTipo}>{parada.tipoServicio}</Text>
                  <Text style={{ fontSize: 8, color: '#666' }}>{parada.folio}</Text>
                </View>
                <Text style={styles.paradaHora}>{parada.horaEstimadaLlegada}</Text>
              </View>
              <Text style={styles.paradaCliente}>{parada.cliente}</Text>
              <Text style={styles.paradaDireccion}>
                {parada.direccion}
                {parada.municipio ? ', ' + parada.municipio : ''}
                {parada.estado ? ', ' + parada.estado : ''}
              </Text>
              <View style={styles.paradaFinanzas}>
                <View style={styles.finanzaItem}>
                  <Text style={styles.finanzaLabel}>Flete</Text>
                  <Text style={[styles.finanzaValor, styles.positivo]}>
                    {formatearMonedaPDF(parada.ingresos?.flete || 0)}
                  </Text>
                </View>
                <View style={styles.finanzaItem}>
                  <Text style={styles.finanzaLabel}>Sueldo</Text>
                  <Text style={styles.finanzaValor}>{formatearMonedaPDF(parada.costos?.sueldo || 0)}</Text>
                </View>
                <View style={styles.finanzaItem}>
                  <Text style={styles.finanzaLabel}>Combustible</Text>
                  <Text style={styles.finanzaValor}>{formatearMonedaPDF(parada.costos?.combustible || 0)}</Text>
                </View>
                <View style={styles.finanzaItem}>
                  <Text style={styles.finanzaLabel}>Casetas</Text>
                  <Text style={styles.finanzaValor}>{formatearMonedaPDF(parada.costos?.casetas || 0)}</Text>
                </View>
                <View style={styles.finanzaItem}>
                  <Text style={styles.finanzaLabel}>Otros</Text>
                  <Text style={styles.finanzaValor}>{formatearMonedaPDF(parada.costos?.otros || 0)}</Text>
                </View>
                <View style={styles.finanzaItem}>
                  <Text style={styles.finanzaLabel}>Utilidad</Text>
                  <Text style={[styles.finanzaValor, (parada.utilidad || 0) >= 0 ? styles.positivo : styles.negativo]}>
                    {formatearMonedaPDF(parada.utilidad || 0)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          RMB Transportes | Reporte Administrativo generado el {new Date().toLocaleDateString('es-MX')} | CONFIDENCIAL
        </Text>
      </Page>
    </Document>
  );
}

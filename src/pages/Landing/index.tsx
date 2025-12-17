import { Link } from 'react-router-dom'
import {
  Truck,
  Shield,
  Clock,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'

const servicios = [
  {
    icon: Truck,
    titulo: 'Transporte de Maquinaria',
    descripcion:
      'Especializados en el transporte seguro de maquinaria pesada y equipos industriales.',
  },
  {
    icon: Shield,
    titulo: 'Seguridad Garantizada',
    descripcion:
      'Flota moderna con seguimiento GPS y protocolos de seguridad certificados.',
  },
  {
    icon: Clock,
    titulo: 'Puntualidad',
    descripcion:
      'Cumplimos con los tiempos de entrega acordados para optimizar tu operación.',
  },
  {
    icon: MapPin,
    titulo: 'Cobertura Nacional',
    descripcion:
      'Llegamos a todo el territorio nacional con rutas optimizadas.',
  },
]

const beneficios = [
  'Flota de vehículos especializados',
  'Personal capacitado y certificado',
  'Seguimiento en tiempo real',
  'Seguro de carga incluido',
  'Atención personalizada 24/7',
  'Tarifas competitivas',
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header / Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#BB0034] rounded-lg flex items-center justify-center">
                <Truck size={24} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                <span className="text-[#BB0034]">RMB</span> Transportes
              </span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a
                href="#servicios"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Servicios
              </a>
              <a
                href="#nosotros"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Nosotros
              </a>
              <a
                href="#contacto"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Contacto
              </a>
            </nav>

            {/* CTA Button */}
            <Link
              to="/login"
              className="px-4 py-2 bg-[#BB0034] text-white rounded-lg hover:bg-[#8A0027] transition-colors font-medium"
            >
              Acceso Panel
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 bg-gradient-to-br from-[#1a1a1a] via-[#3D3D3D] to-[#1a1a1a] min-h-[90vh] flex items-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 top-20 w-96 h-96 bg-[#BB0034]/10 rounded-full blur-3xl" />
          <div className="absolute -left-20 bottom-20 w-72 h-72 bg-[#BB0034]/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#BB0034]/20 rounded-full mb-6">
                <span className="w-2 h-2 bg-[#BB0034] rounded-full animate-pulse" />
                <span className="text-[#BB0034] text-sm font-medium">
                  Transporte Especializado
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Movemos tu{' '}
                <span className="text-[#BB0034]">maquinaria</span> con
                profesionalismo
              </h1>

              <p className="text-lg text-gray-300 mb-8 max-w-xl">
                Somos especialistas en transporte de maquinaria pesada y equipos
                industriales. Más de 10 años de experiencia nos respaldan.
              </p>

              <div className="flex flex-wrap gap-4">
                <a
                  href="#contacto"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#BB0034] text-white rounded-lg hover:bg-[#8A0027] transition-colors font-medium"
                >
                  Solicitar Cotización
                  <ArrowRight size={20} />
                </a>
                <a
                  href="#servicios"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-gray-600 text-white rounded-lg hover:bg-white/10 transition-colors font-medium"
                >
                  Ver Servicios
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-12 pt-12 border-t border-gray-700">
                <div>
                  <p className="text-3xl font-bold text-[#BB0034]">10+</p>
                  <p className="text-gray-400 text-sm">Años de experiencia</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-[#BB0034]">500+</p>
                  <p className="text-gray-400 text-sm">Proyectos completados</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-[#BB0034]">98%</p>
                  <p className="text-gray-400 text-sm">Clientes satisfechos</p>
                </div>
              </div>
            </div>

            {/* Hero Image placeholder */}
            <div className="hidden lg:block relative">
              <div className="aspect-square bg-gradient-to-br from-[#3D3D3D] to-[#1a1a1a] rounded-3xl p-8 flex items-center justify-center border border-gray-700">
                <Truck size={200} className="text-[#BB0034]/30" />
              </div>
              {/* Floating card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1a1a1a]">
                      Entrega Segura
                    </p>
                    <p className="text-sm text-gray-500">100% garantizada</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Red accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#BB0034]" />
      </section>

      {/* Servicios Section */}
      <section id="servicios" className="py-20 bg-[#E8E8E8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#BB0034] font-medium">Nuestros Servicios</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mt-2">
              Soluciones de transporte
            </h2>
            <p className="text-[#3D3D3D] mt-4 max-w-2xl mx-auto">
              Ofrecemos servicios especializados de transporte adaptados a las
              necesidades de cada cliente.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {servicios.map((servicio, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow group"
              >
                <div className="w-14 h-14 bg-[#BB0034]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#BB0034] transition-colors">
                  <servicio.icon
                    size={28}
                    className="text-[#BB0034] group-hover:text-white transition-colors"
                  />
                </div>
                <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">
                  {servicio.titulo}
                </h3>
                <p className="text-[#3D3D3D] text-sm">{servicio.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nosotros Section */}
      <section id="nosotros" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[#BB0034] font-medium">Sobre Nosotros</span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mt-2 mb-6">
                Más de una década moviendo el país
              </h2>
              <p className="text-[#3D3D3D] mb-6">
                RMB Transportes nació de la necesidad de ofrecer un servicio de
                transporte especializado para maquinaria pesada, trabajando de
                la mano con RMB Maquinaria para brindar soluciones integrales a
                nuestros clientes.
              </p>
              <p className="text-[#3D3D3D] mb-8">
                Contamos con una flota moderna y un equipo altamente capacitado
                para garantizar que tu maquinaria llegue a su destino en
                perfectas condiciones y en el tiempo acordado.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {beneficios.map((beneficio, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <ChevronRight size={16} className="text-[#BB0034]" />
                    <span className="text-[#3D3D3D] text-sm">{beneficio}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#C4C4C4] rounded-2xl aspect-video flex items-center justify-center">
              <div className="text-center">
                <Truck size={80} className="text-[#3D3D3D] mx-auto mb-4" />
                <p className="text-[#3D3D3D] font-medium">
                  Imagen de la empresa
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Necesitas transportar maquinaria?
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Contáctanos y recibe una cotización personalizada sin compromiso.
          </p>
          <a
            href="#contacto"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#BB0034] text-white rounded-lg hover:bg-[#8A0027] transition-colors font-medium text-lg"
          >
            Solicitar Cotización
            <ArrowRight size={20} />
          </a>
        </div>
      </section>

      {/* Contacto Section */}
      <section id="contacto" className="py-20 bg-[#E8E8E8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <span className="text-[#BB0034] font-medium">Contacto</span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mt-2 mb-6">
                Estamos para ayudarte
              </h2>
              <p className="text-[#3D3D3D] mb-8">
                Completa el formulario y nos pondremos en contacto contigo a la
                brevedad posible.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#BB0034]/10 rounded-lg flex items-center justify-center">
                    <Phone size={24} className="text-[#BB0034]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#1a1a1a]">Teléfono</p>
                    <p className="text-[#3D3D3D]">+52 (XXX) XXX-XXXX</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#BB0034]/10 rounded-lg flex items-center justify-center">
                    <Mail size={24} className="text-[#BB0034]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#1a1a1a]">Correo</p>
                    <p className="text-[#3D3D3D]">contacto@rmb.com.mx</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#BB0034]/10 rounded-lg flex items-center justify-center">
                    <MapPin size={24} className="text-[#BB0034]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#1a1a1a]">Ubicación</p>
                    <p className="text-[#3D3D3D]">Ciudad de México, México</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none transition-all"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none transition-all"
                      placeholder="Tu teléfono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-2">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none transition-all"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-2">
                    Mensaje
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none transition-all resize-none"
                    placeholder="Describe tu necesidad de transporte..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[#1a1a1a] hover:bg-[#3D3D3D] text-white font-medium rounded-lg transition-colors"
                >
                  Enviar Mensaje
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#BB0034] rounded-lg flex items-center justify-center">
                <Truck size={24} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                <span className="text-[#BB0034]">RMB</span> Transportes
              </span>
            </div>

            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} RMB Transportes. Todos los derechos
              reservados.
            </p>
          </div>

          {/* Red accent line */}
          <div className="h-1 bg-[#BB0034] mt-8 rounded-full" />
        </div>
      </footer>
    </div>
  )
}

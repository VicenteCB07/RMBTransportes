/**
 * Componente de búsqueda de direcciones con autocompletado
 * Usa Mapbox Geocoding API
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, MapPin, X, Loader2 } from 'lucide-react'
import { geocode, type GeocodingResult } from '../../services/mapbox.service'
import type { Coordenadas } from '../../types/route.types'
import { cn } from '../../utils/cn'

interface AddressSearchProps {
  value?: string
  placeholder?: string
  onSelect: (result: {
    placeName: string
    coordinates: Coordenadas
    fullResult: GeocodingResult
  }) => void
  proximity?: Coordenadas  // Para priorizar resultados cercanos
  className?: string
  disabled?: boolean
}

export default function AddressSearch({
  value = '',
  placeholder = 'Buscar dirección...',
  onSelect,
  proximity,
  className,
  disabled = false,
}: AddressSearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Actualizar query cuando cambia value externo
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Buscar direcciones con debounce
  const searchAddresses = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 3) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const geocodeResults = await geocode(searchQuery, {
          country: 'mx',
          types: ['address', 'poi', 'place', 'locality'],
          proximity,
          limit: 5,
        })
        setResults(geocodeResults)
        setIsOpen(geocodeResults.length > 0)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('Error en búsqueda:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    },
    [proximity]
  )

  // Manejar cambio de input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)

    // Debounce de 300ms
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(newQuery)
    }, 300)
  }

  // Manejar selección
  const handleSelect = (result: GeocodingResult) => {
    setQuery(result.placeName)
    setIsOpen(false)
    setResults([])
    onSelect({
      placeName: result.placeName,
      coordinates: result.coordinates,
      fullResult: result,
    })
  }

  // Manejar teclas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  // Limpiar búsqueda
  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('relative', className)}>
      {/* Input de búsqueda */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg',
            'focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none',
            'disabled:bg-gray-100 disabled:cursor-not-allowed'
          )}
        />
        {isLoading ? (
          <Loader2
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
          />
        ) : query ? (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {results.map((result, index) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className={cn(
                'w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-b-0',
                index === selectedIndex && 'bg-gray-50'
              )}
            >
              <MapPin size={18} className="text-[#BB0034] flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-[#1a1a1a] truncate">
                  {result.text}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {result.placeName}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Mensaje de no resultados */}
      {isOpen && !isLoading && query.length >= 3 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
          No se encontraron resultados
        </div>
      )}
    </div>
  )
}

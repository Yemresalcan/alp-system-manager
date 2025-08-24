// Performance optimizasyon utilities

import { useCallback, useMemo } from 'react'

// Debounce hook - arama gibi işlemler için
export function useDebounce<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const timeoutId = setTimeout(() => callback(...args), delay)
      return () => clearTimeout(timeoutId)
    },
    [callback, delay]
  )

  return debouncedCallback
}

// Memoized search filter
export function useFilteredData<T>(
  data: T[],
  searchTerm: string,
  filterFn: (item: T, search: string) => boolean
) {
  return useMemo(() => {
    if (!searchTerm.trim()) return data
    return data.filter(item => filterFn(item, searchTerm.toLowerCase()))
  }, [data, searchTerm, filterFn])
}

// Pagination hook
export function usePagination<T>(data: T[], itemsPerPage: number = 10) {
  return useMemo(() => {
    const totalPages = Math.ceil(data.length / itemsPerPage)
    const paginate = (pageNumber: number) => {
      const startIndex = (pageNumber - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      return data.slice(startIndex, endIndex)
    }

    return { totalPages, paginate }
  }, [data, itemsPerPage])
}

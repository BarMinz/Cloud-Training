import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api/client'

const PhasesContext = createContext({
  phases: [],
  loading: true,
  refresh: async () => {},
})

export function PhasesProvider({ children }) {
  const [phases, setPhases] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/phases/')
      setPhases(Array.isArray(data) ? data : [])
    } catch {
      setPhases([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <PhasesContext.Provider value={{ phases, loading, refresh }}>
      {children}
    </PhasesContext.Provider>
  )
}

export function usePhases() {
  return useContext(PhasesContext)
}

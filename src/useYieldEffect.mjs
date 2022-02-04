import { useEffect } from 'react'
import useYield from './useYield.mjs'

//wrapper that runs in the same way as useAbortableGenerator
export default function useYieldEffect (initialState, stateChanger, deps) {
  const [state, run] = useYield(initialState)

  useEffect(() => {
    const abortController = run(stateChanger)
    return () => abortController?.abort()
  }, deps)

  return state
}
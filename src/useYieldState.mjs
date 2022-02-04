import { useCallback, useEffect } from 'react'
import useYield from './useYield'

// wrapper that runs in the same way as useAbortableGenerator
export default function useYieldState (stateChanger, deps, initialState) {
  const [state, run] = useYield(initialState)

  // this is the only place when we need to disable a rule, bc this is basically a
  // useEffect wrapper: stateChanger is evaluated on external deps change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedStateChanger = useCallback(stateChanger, deps)

  useEffect(() => {
    const abortController = run(memoizedStateChanger)
    return () => abortController?.abort()
  }, [run, memoizedStateChanger])

  return state
}

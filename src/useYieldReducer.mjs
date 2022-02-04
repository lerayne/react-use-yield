import { useCallback, useEffect, useRef, useState } from 'react'
import useYield from './useYield'

function copy (val) {
  if (val === null) return null
  if (['boolean', 'string', 'number', 'undefined'].includes(typeof val)) return val
  if (typeof val === 'object') {
    if (val instanceof Array) return [...val]
    if (val instanceof Object) return { ...val }
  }
  throw new Error('useYieldReducer can\'t use this type of action: ' + (typeof val))
}

export default function useYieldReducer (stateChanger, deps, initialState) {
  const [state, run] = useYield(initialState)
  const [dispatchCount, setDispatchCount] = useState(0)
  const action = useRef(null)

  // this is the only place when we need to disable a rule, bc this is basically a
  // useEffect wrapper: stateChanger is evaluated on external deps change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedStateChanger = useCallback(stateChanger, deps)

  const dispatch = useCallback(newAction => {
    action.current = newAction
    setDispatchCount(c => c + 1)
  }, [])

  useEffect(() => {
    const abortController = run(memoizedStateChanger, { action: copy(action.current) })
    // soft reset of the action
    action.current = null
    return () => abortController?.abort()
  }, [run, memoizedStateChanger, dispatchCount])

  return [state, dispatch]
}

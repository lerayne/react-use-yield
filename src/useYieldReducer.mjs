// react is a peer dep
/* eslint-disable import/no-unresolved */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
/* eslint-enable import/no-unresolved */

import useYield from './useYield'

function copy (val) {
  if (val === null) return null
  if (['boolean', 'string', 'number', 'undefined'].includes(typeof val)) return val
  if (typeof val === 'object') {
    if (val instanceof Array) return [...val]
    if (val instanceof Object) return { ...val }
  }
  throw new Error(`useYieldReducer can't use this type of action: ${typeof val}`)
}

export default function useYieldReducer (stateChanger, deps, initialState) {
  const [state, run] = useYield(initialState)
  const [dispatchCount, setDispatchCount] = useState(0)
  // action's default state is explicitly "undefined" so that in stateChanger we could set the
  // action as default parameter:
  // async function * changeState (getState, signal, action = { type: null }) {...
  // if it equals null - parameter returns as defined and the defaulting doesn't work
  // eslint-disable-next-line no-undefined
  const action = useRef(undefined)

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
    // eslint-disable-next-line no-undefined
    action.current = undefined
    return () => abortController?.abort()
  }, [run, memoizedStateChanger, dispatchCount])

  return [state, dispatch]
}

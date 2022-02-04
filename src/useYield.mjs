import { useCallback, useRef, useState } from 'react'
import fastDeepEqual from 'fast-deep-equal/es6'

export default function useYield (initialState) {
  if (!(typeof initialState === 'object' && initialState instanceof Object)) {
    throw new Error('useAsyncState only accepts object as initialState')
  }

  const state = useRef(initialState)
  const [_, setCounter] = useState(0)

  const getState = useCallback(() => {
    return { ...state.current }
  }, [state])

  const updateState = useCallback((value, signal = null) => {
    //it's important to return the same object, if no changes to the state was made, in this
    // way other hooks can use this state as a respectful dependency
    if (signal && signal.aborted) {
      return state.current
    }

    const newState = { ...state.current, ...value }
    if (fastDeepEqual(state.current, newState)) {
      return state.current
    }

    //this call causes re-render and returns new object only if states are different
    state.current = newState
    setCounter(c => c + 1)

    return newState
  }, [state])

  //this function is always the same, so it's safe to include it into deps
  const run = useCallback((stateChanger, options) => {
    const abortController = options?.aborter ?? new window.AbortController()

    function pull (asyncGenerator) {
      function onYield ({ done, value }) {
        if (!done) {
          updateState(value, abortController.signal)
          asyncGenerator.next().then(onYield)
        }
      }

      asyncGenerator.next().then(onYield)
    }

    const stateChangerResult = stateChanger(getState, abortController.signal)

    if (stateChangerResult.next) {
      // if generator is passed as stateChanger
      pull(stateChangerResult)
      return abortController

    } else if (stateChangerResult.then) {
      // if regular async function is passed as stateChanger
      stateChangerResult.then(result => {
        updateState(result, abortController.signal)
      })
      return abortController

    } else {
      // if stateChanger is a regular function
      updateState(stateChangerResult)
      return null
    }
  }, [state, getState, updateState])

  return [state.current, run]
}
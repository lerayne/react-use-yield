# react-use-yield

State hooks for asynchronous state management with respect of
`react-hooks/exhaustive-deps` lint rule and AbortController functionality

## Basic usage

The most basic option is `useYieldState` which hides some functionality 
under the hood

```jsx
import { useYieldState } from 'react-use-yield'

function MyComponent () {
  const [startIndex, setStartIndex] = useState(0)

  const { posts, users } = useYieldState(
    // 1st argument: an async generator function that is being ran as in  
    // useEffect based on dependency array. This function receives 2 arguments:
    // getState - a function that returns current state
    // signal - passed to fetch to make it abortable when the effect clears
    async function * (getState, signal) {
      const posts = await fetchJSON(
        `${API_URL}/posts?_start=${startIndex}&_limit=3`, 
        { signal }
      )

      // call of yield causes rerender as this.setState of class component (it 
      // merges the state but only if merged state is different from previous)
      // after call of yield the state is already updated and painted to UI
      yield { posts }

      // let's say we need to ask for users mentioned in posts that we need to 
      // fetch here call of getState() returns current state after previous 
      // update
      const neededUserIds = getUniqueUserIds(getState().posts, getState().users)

      const users = await fetchJSON(
        `${API_URL}/users?ids=${neededUserIds}`, 
        { signal }
      )
      yield {
        users: [...getState().users, ...users].filter(makeUnique)
      }
    },

    // this dependency aray is honored by react-hooks/exhaustive-deps if 
    // "additionalHooks" option is configured.
    [startIndex],

    // initial state
    { posts: [], users: [] }
  )
}
```

`useYieldState` also can use a simple async function instead of async generator:

```jsx
function MyComponent () {
  const [startIndex, setStartIndex] = useState(0)

  const { posts, users } = useYieldState(
    async (getState, signal) => {
      const posts = await fetchJSON(
        `${API_URL}/posts?_start=${startIndex}&_limit=3`, 
        { signal }
      )

      const neededUserIds = getUniqueUserIds(posts, getState().users)

      const users = await fetchJSON(
        `${API_URL}/users?ids=${neededUserIds}`, 
        { signal }
      )

      // this way the state is updated only once by a return
      return {
        posts,
        users: [...getState().users, ...users].filter(makeUnique)
      }
    },
    [startIndex],
    { posts: [], users: [] }
  )
}
```

## Reducer-like usage

Let's imagine you need more than one "action" to be executed in your 
component, for example you have a button that resets all data to default 
empty state and another one that reloads the data explicitly.  
In that case `useYieldReducer` is recommended (it's quite similar to 
useReducer usage):

```jsx
import { useYieldReducer } from 'react-use-yield'

function MyComponent () {
  const [startIndex, setStartIndex] = useState(0)

  const [{ posts, users }, dispatch] = useYieldReducer(
    async function * (getState, signal, action) {
      // Take note that ANY execution of this function, despite the action 
      // called, will call abortController.abort() for it's previous call, 
      // so "reset" action will abort "reload" action if it hasn't beed 
      // flushed to state
      switch (action) {
        case 'reset':
          yield {
            posts: [],
            users: []
          }
          // don't forget to break if you're using async generator
          // when using async function - it's safe to just return new state
          break
        
        // we have a "reload" action that just re-runs effect explicitly
        case 'reload':
        // default usage is the case when effect is ran initialy, or by a 
        // depencency change
        default:
          const posts = await fetchJSON(
            `${API_URL}/posts?_start=${startIndex}&_limit=3`, 
            { signal }
          )
          yield { posts }

          const neededUserIds = getUniqueUserIds(
            getState().posts, 
            getState().users
          )

          const users = await fetchJSON(
            `${API_URL}/users?ids=${neededUserIds}`, 
            { signal }
          )
          yield { 
            users: [...getState().users, ...users].filter(makeUnique)
          }
      }
    },
    [startIndex],
    { posts: [], users: [] }
  )

  function handleResetClick () {
    dispatch('reset')
  }
  
  function handleReloadClick () {
    dispatch('reload')
  }
}
```

## ESLint rules configuration
To use "react-hooks/exhaustive-deps" rule with this hook you need to install
[eslint-plugin-react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)
and configure your .eslintrc in the following way:

```json
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/exhaustive-deps": ["error", {
      "additionalHooks": "(useYieldState|useYieldReducer)"
    }]
  }
}
```

## Advanced usage

`useYieldState` and `useYieldReducer` are actually just thin wrappers over 
the more complex and more versatile function `useYield`.

**Use it with care and maximize your awareness about undesired side effects**

Here is an absolute equivalent of the 1st example with the usage of `useYield`:

```jsx
import { useYield } from 'react-use-yield'

function MyComponent () {
  const [startIndex, setStartIndex] = useState(0)

  // useYield returns a tuple of state and "run" function which immediately 
  // executes a desired effect and returns an instance of abortController
  const [{ posts, users }, run] = useYield({ posts: [], users: [] })

  // a regular useEffect is used
  useEffect(() => {
    const abortController = run(async function * (getState, signal) {
      const posts = await fetchJSON(
        `${API_URL}/posts?_start=${startIndex}&_limit=3`, 
        { signal }
      )

      yield { posts }

      const neededUserIds = getUniqueUserIds(getState().posts, getState().users)

      const users = await fetchJSON(
        `${API_URL}/users?ids=${neededUserIds}`, 
        { signal }
      )
      yield {
        users: [...getState().users, ...users].filter(makeUnique)
      }
    })

    return () => abortController?.abort()
  }, [startIndex])
}
```

```jsx
// it can also take a simple sync function.
function handleClear () {
  run(getState => ({
    posts: [],
    users: []
  }))
}

// the other obvious benefit of useYield is that you can call "run" in 
// different places of your code and execute different state updates. Just 
// keep in mind that you still need to track your abortables
const abortController = useRef(null)

const updateUsers = useCallback(() => {
  if (abortController.current && !abortController.current.signal.aborted) {
    abortController.current.abort()
  }
  abortController.current = run(async (getState, signal) => {
    const allUsersOfCurrentPage = getUniqueUserIds(getState().posts, [])
    const users = await fetchJSON(
      `${API_URL}/users?ids=${allUsersOfCurrentPage}`, 
      { signal }
    )
    return {
      users
    }
  })
}, [])
```

`run` function can also take an additional "options" argument where you can 
pass your own abort controller instance. This function is made just for 
extra convenience, it's not recommended for frequent use

```jsx
useEffect(() => {
  const abortController = new AbortController()

  run(async (getState, signal) => {
    /* ... */
  }, { abortable: abortController })

  run(async (getState, signal) => {
    /* ... */
  }, { abortable: abortController })

  return () => abortController.abort()
})
```

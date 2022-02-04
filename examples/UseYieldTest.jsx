import React, { useEffect, useState } from 'react'
import { useYield } from '../src'
import { fetchJSON, pause } from './helpers'

const API_URL = 'https://jsonplaceholder.typicode.com'
const INITIAL_COUNT = 1

export default function UseYieldEffectTest () {
  const [count, setCount] = useState(INITIAL_COUNT)
  const [startIndex, setStartIndex] = useState(0)
  const [{ posts, users }, run] = useYield({ posts: [], users: [] })

  // example of simple sync function
  function handleClear () {
    run(() => ({
      users: [],
      posts: []
    }))
  }

  useEffect(() => {
    const abc = run(async function * (getState, signal) {
      try {
        const posts = await fetchJSON(`${API_URL}/posts?_start=${startIndex}&_limit=${count}`, { signal })
        await pause(1000)

        yield { posts }

        console.log(1, getState().posts)

        const users = await fetchJSON(`${API_URL}/users?_start=${startIndex}&_limit=${count}`, { signal })
        await pause(1000)

        console.log(4, users)

        yield { users }
      } catch (err) {
        console.error(new Error(err))
      }
    })

    return () => abc?.abort()
  }, [
    // todo: check that react-hooks/exhaustive-deps works as expected (it does)
    run, count, startIndex
  ])

  return (
    <div>
      <button onClick={() => setStartIndex(startIndex + count)}>next</button>
      <button onClick={() => setCount(count + INITIAL_COUNT)}>more</button>
      <button onClick={handleClear}>clear</button>

      <pre>
        {JSON.stringify(posts, null, '  ')}
      </pre>
      <pre>
        {JSON.stringify(users, null, '  ')}
      </pre>
    </div>
  )
}

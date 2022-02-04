import React, { useState } from 'react'
import { useYieldState } from '../src'
import { fetchJSON, pause } from './helpers.mjs'

const API_URL = 'https://jsonplaceholder.typicode.com'
const INITIAL_COUNT = 1

export default function UseYieldStateTest () {
  const [count, setCount] = useState(INITIAL_COUNT)
  const [startIndex, setStartIndex] = useState(0)

  const { posts, users } = useYieldState(
    async function * (getState, signal) {
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
    },
    [
      // todo: check that react-hooks/exhaustive-deps works as expected (it does)
      count, startIndex
    ],
    {
      posts: [],
      users: []
    }
  )

  return (
    <div>
      <button onClick={() => setStartIndex(startIndex + count)}>next</button>
      <button onClick={() => setCount(count + INITIAL_COUNT)}>more</button>

      <pre>
        {JSON.stringify(posts, null, '  ')}
      </pre>
      <pre>
        {JSON.stringify(users, null, '  ')}
      </pre>
    </div>
  )
}

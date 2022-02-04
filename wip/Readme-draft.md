# React: Исследование хука для стейта

Created: January 24, 2022 5:30 PM Tags: JavaScript, react

# **Проблема**

Довольно часто в рамках реакт-компонента возникает необходимость построить такую архитектуру данных,
в которой разные элементы state зависят друг от друга и меняются в разных точках жизненного цикла
программы, при этом это все сопряжено, как правило, еще и с асинхронностью.

## **Пример**

Компонент который отображает список постов в чате. Есть 2 api - getPosts: получение списка сообщений
по startIndex и count и getUsers: получение списка пользователей. Предположим getPosts отдает нам
только id автора поста, или же мы получаем пользователей и посты из разных сервисов (такие кейсы
реально были в рабочей практике)

Довольно логичным решенеим в таком случае выглядит кешировать пользователей, потому что они будут
часто повторяться в интерфейсе. Это сэкономит и трафик и вычислительные ресурсы сервера и, что
наверное важнее всего - время ответа сервера. Именно к отзывчивости интерфейчас у клиента обычно
больше всего вопросов.

**Итак, создаем примерно такую схему:**

```jsx
//для наглядности, вынесем за пределы компонента всю логику, которую возможно

// эта функция возвращает список id отсутствующих в кеше пользователей на основании 
// списка постов и, собственно, кеша
const getUncachedUserIds = (posts, cachedUsers)
{
  return posts.map(post => post.user.id)
    .filter((id, index, array) => array.indexOf(id) === index) //отсеем дубликаты
    .filter(userId => !usersCache.find(cachedUser => cachedUser.id === userId))
}

// фетчер данных - получает новый стартовый индекс, количество постов и кеш 
// пользователей, возвращает новый список постов и новых пользователей, которых 
// еще нет в кеше
const getPage = async (startIndex, count, usersCache, signal) => {
  //получаем посты
  const newPosts = await API.getPosts(startIndex, count, signal)

  //собираем из постов id юзеров которых у нас еще нет в usersCache
  const neededUserIds = getUncachedUserIds(newPosts, usersCache)

  //запрашиваем только нужных пользователей
  const newUsers = await API.getUsers(neededUserIds, signal)

  //возвращаем нужные значения
  return {
    users: newUsers,
    posts: newPosts
  }
}

//смешивает старых и новых пользователей, отдавая предпочтение новым
function mergeUsers (existingUsers, newUsers) {
  return newUsers.concat(existingUsers).filter((user, index, array) => {
    return array.findIndex(u => u.id === user.id) === index
  })
}

function Posts () {
  const [usersCache, setUsersCache] = useState([])
  const [posts, setPosts] = useState([])
  const [startIndex, setStartIndex] = useState(0)
  const [count, setCount] = useState(50)

  // эффект, который зависит от startIndex, и count будет корректно запускаться каждый 
  // раз, когда мы захотим переключить страницу, предварительно очищая все предыдушщие 
  // вызовы
  useEffect(() => {
    const cancelable = new AbortController()
    getPage(startIndex, count, usersCache, cancelable.signal).then(response => {
      //меняем state
      setUsersCache(oldUsers => mergeUsers(oldUsers, response.users))
      setPosts(response.posts)
    })
    return () => cancelable?.abort()
  }, [
    startIndex,
    count,
    usersCache
    // А вот и наша проблема. Правило react-hooks/exhaustive-deps принуждает нас
    // добавлять в зависимости все передаваемые по замыканию параметры. Мы не можем 
    // обойтись без передачи usersCache в эффект и мы вызываем setUsersCache внутри 
    // эффекта - это приведет к бесконечному циклу отправки запросов getPage.
  ])

  return <div>{...}</div>
}
```

Да, конечно эту проблему можно решить просто забив на правило react-hooks/exhaustive-deps, (и в
данном случае код будет корректно работать), но оно добавлено самими разработчиками реакта и не
просто так. Его нарушение искажает ментальную модель хуков, провоцируя многие виды ошибок, особенно
связанных с асинхронностью. Например usersCache может асинхронно меняться где-то еще в коде
компонента и не в том порядке, который мы предусмотрели, потому что скорость выполнения асинхронных
запросов недетерминирована.

Попробуем выделить правила, которые помогут нам решить данную задачу “чисто”:

1. **Если в компоненте есть некие единицы state которые зависят друг от друга - они всегда должны
   изменяться вместе, на основании предыдущего общего значения state**

Одно из наиболее очевидных решений данной задачи - использование useReducer:

```jsx
function reducer (state, action) {
  switch (action.type) {
    case 'fetch_posts':
      getPage(action.startIndex, action.count, state.usersCache, action.signal)
        .then(response => {
          action.dispatch({
            type: 'posts_arrived',
            posts: response.posts,
            users: response.users
          })
        })
      return state;

    case 'posts_arrived':
      return {
        ...state,
        posts: action.posts,
        users: mergeUsers(state.usersCache, action.users)
      }

    default:
      return state
  }
}

function Posts () {
  const [{ posts, usersCache }, dispatch] = useReducer(reducer, {
    posts: [],
    usersCache: []
  })

  const [startIndex, setStartIndex] = useState(0)
  const [count, setCount] = useState(50)

  // теперь эффект ничего не знает о том состоянии, которое не нужно для его перезапуска
  // он лишь вслепую оправляет экшн, а что делать дальше - забота выделенного 
  // логического компонента - редюсера
  useEffect(() => {
    const cancelable = new AbortController()
    dispatch({
      type: 'fetch_posts',
      startIndex,
      count,
      signal: cancelable.signal,
      // да, немного некарсиво что нам приходится передавать сюда dispatch
      dispatch
    })
    return () => cancelable?.abort()
  }, [startIndex, count])

  return <div>{...}</div>
}
```

Но у такого решения сразу виден ряд недостатков:

1. Код редюсера довольно обширный, особенно для такого прсотого функционала, его не слишком удобно
   читать
2. Приходится каждый раз передавать в экшн переменную dispatch
3. Редюсер возвращает state даже когда задача экшна - только запустить асинхронное действие. Это
   можно считать и выгодой, ведь тогда мы можем сразу передать например стостояние loading, если бы
   оно у нас было, но такой вызов был бы не слишком интуитивным, так как мы сначала запускаем
   асинхронность, а потом возвращаем state, а хотелось бы наоборот
4. Редюсер плохо работает с асинхронным функциями - приходится делать этажерку из then если
   необходимо, или оборачивать асинхронную функцию в самозапуск
5. Было бы неплохо иметь cancelable из коробки, чтобы не создавать его вручную каждый раз и не
   передавать в экшн

# Вариант 1

Итак, как бы это могло выглядеть “в идеале”.
**Вариант 1, логика асинхронности и мутаций вынесена в объявление хука, как в случае с редюсером.**

```jsx
function Posts () {
  const [{ loading, posts, usersCache }, actions] = useSuperState(
    {
      // initial state
      loading: false,
      posts: [],
      usersCache: []
    }, {
      // вариант с генератором
      async * fetchPosts (startIndex, count, getState, signal) {
        // примечание: yield работает как this.setState в класс-компоненте, то есть 
        // мерджит состояние, а не польностью переписывает
        yield { loading: true }
        // yield передает контроль в управляющую функцию, что означает, что следующий 
        // вызов getState() уже вернет loading: true
        const cache = getState().usersCache
        const response = await getPage(startIndex, count, cache, signal)
        yield {
          loading: false,
          posts: response.posts,
          users: mergeUsers(getState().usersCache, response.users)
        }
      }
    }
  )

  const [startIndex, setStartIndex] = useState(0)
  const [count, setCount] = useState(50)

  useEffect(() => {
    // здесь нужно отдельно оговорить что данная функция fetchPosts - не та же что
    // объявлена в хуке, а обернутая в специальный врапер, который возвращает abortable 
    // и управляет асинхронностью
    const abortable = actions.fetchPosts(startIndex, count)
    return () => abortable?.abort()
  }, [startIndex, count, fetchPosts])

  return <div>{...}</div>
}
```

# Вариант 2

**Вариант 2, логика асинхронности объявляется либо там где она выполняется, либо там где вам
хочется.** Мне этот вариант нравится больше, как минимум потому что startIndex и count больше не
нужно передавать как аргументы функции, смешивая их в кучу с getState и signal. Вместо этого
startIndex и count передаются по замыканию, как это и ожидается при работе эффекта. Кроме того такая
модель проще читается, если код выполняется там где он определен.

Кроме того, как видим код получился еще чище и компактнее, чем в предыдущем варианте и в разы чище
чем с использованием редюсера

```jsx
function Posts () {
  const [{ loading, posts, usersCache }, runAsync] = useSuperState({
    loading: false,
    posts: [],
    usersCache: []
  })

  const [startIndex, setStartIndex] = useState(0)
  const [count, setCount] = useState(50)

  useEffect(() => {
    const abortable = runAsync(async function * (getState, signal) {
      yield { loading: true }
      const cache = getState().usersCache
      const response = await getPage(startIndex, count, cache, signal)
      yield {
        loading: false,
        posts: response.posts,
        users: mergeUsers(getState().usersCache, response.users)
      }
    })

    return () => abortable?.abort()
  }, [startIndex, count, runAsync])

  return <div>{...}</div>
}
```

Более того, при желании саму функцию можно вынести куда угодно, например в коллбек, если нам нужно
ее выполнять где-то еще:

```jsx
function Posts () {
  const [{ loading, posts, usersCache }, runAsync] = useSuperState({
    loading: false,
    posts: [],
    usersCache: []
  })

  const [startIndex, setStartIndex] = useState(0)
  const [count, setCount] = useState(50)

  const fetchPosts = useCallback(async function * (getState, signal) {
    yield { loading: true }
    const cache = getState().usersCache
    const response = await getPage(startIndex, count, cache, signal)
    yield {
      loading: false,
      posts: response.posts,
      users: mergeUsers(getState().usersCache, response.users)
    }
  }, [count, startIndex])

  useEffect(() => {
    const abortable = runAsync(fetchPosts)
    return () => abortable?.abort()
  }, [fetchPosts])

  return <div>{...}</div>
}
```

Теперь, когда основной интерфейс “идеального стейт-хендлера” мы увидели, попробуем развернуть какие
еще фичи в нем нам нужны

```jsx
// например мы можем передавать в runAsync не только генератор, но и простую 
// асинхронную функцию. Как видим, это почти никак не повлияло на синтаксис. 
// единственное, что нужно понимать - вызов setState - не асинхронный, поэтому
// при последующем вызове getState().loading мы не получим true
runAsync(async (getState, setState, signal) => {
  setState({ loading: true })
  const cache = getState().usersCache
  const response = await getPage(startIndex, count, cache, signal)
  setState({
    loading: false,
    posts: response.posts,
    users: mergeUsers(getState().usersCache, response.users)
  })
})

// впрочем, нам никто не мешает сделать setState и асинхронным тоже
runAsync(async (getState, setState, signal) => {
  await setState({ loading: true })
  const cache = getState().usersCache
  const response = await getPage(startIndex, count, cache, signal)
  // здесь возвращаем промис, чтобы он не оставался "висеть в воздухе" и мог быть 
  // обработан внтури runAsync
  return setState({
    loading: false,
    posts: response.posts,
    users: mergeUsers(getState().usersCache, response.users)
  })
})

//можно передать синхронную функцию, тогда значение мы будем просто возвращать:
runAsync(getState => {
  return {
    users: [...getState().users, newUser]
  }
})

// также мы можем захотеть работать не с встроенным AbortConroller, а с внешним, 
// например если хотим контролировать два параллельных вызова
useEffect(() => {
  const abortable = new AbortController()

  runAsync(async function * (getState, signal) {
    const posts = await getPage(startIndex, count, signal)
    yield { posts }
  }, { abortable }) //передаем дополнительный параметр

  runAsync(async (getState, setState, signal) => {
    const users = await getUsers(signal)
    return setState({ users })
  }, { abortable }) //передаем дополнительный параметр

  return () => abortable?.abort()
}, [startIndex, count, runAsync])

// Возможен также параметр, который вызывает внутренние эффекты через useLayoutEffect, 
// что делает все отрисовки после yield максимально синхронными и таким образом 
// упрощает работу с DOM
runAsync(
  async function * (getState, signal) {
    yield { pageWidth: 500 }
    //то что происходит здесь - происходит до пейнта, ровно как в случае с useLayoutEffect
  },
  { sync: true }
)
```

Да, еще конечно же и state и runAsync мы можем передать вниз по дереву как через пропсы, так и через
контекст, что даст нам фактически такой мини-редукс. Правда в этом случае предпочтительнее “вариант
1” (с объектом actions)

С другой стороны - а что нам мешает позволить оба интерфейса?

```jsx
const [{ loading, posts, usersCache }, actions] = useSuperState(
  {
    // initial state
    loading: false,
    posts: [],
    usersCache: []
  }, {
    // вариант с генератором
    async * fetchPosts (startIndex, count, getState, signal) {
      yield { loading: true }
      const cache = getState().usersCache
      const response = await getPage(startIndex, count, cache, signal)
      yield {
        loading: false,
        posts: response.posts,
        users: mergeUsers(getState().usersCache, response.users)
      }
    }
  }
)

useEffect(() => {
  // заранее определенный экшн
  actions.fetchPosts(count, startFrom)
}, [count, startFrom])

useEffect(() => {
  // кастомный экшн (зарезервированное слово run)
  const abc = actions.run((getState, signal) => {
    return { /* ... */ }
  })
}, [...])
```

альтернатива - все таки признаем что нам нужен один интерфейс (например потому что в
actions.fetchPosts нельзя передать дополнительные параметры, такие как abortable)

Но мы все еще можем создать наш собственный способ для удобной передачи actions вниз:

```jsx
function Posts () {
  const [startIndex, setStartIndex] = useState(0)
  const [count, setCount] = useState(50)

  const [state, runAsync] = useSuperState({
    loading: false,
    posts: [],
    usersCache: []
  })
  const { loading, posts, usersCache } = state

  const actions = useMemo(() => ({
    fetchPosts: (count, startIndex) => runAsync(async function * (getState, signal) {
      yield { loading: true }
      const cache = getState().usersCache
      const response = await getPage(startIndex, count, cache, signal)
      yield {
        loading: false,
        posts: response.posts,
        users: mergeUsers(getState().usersCache, response.users)
      }
    }),

    resetUsers: () => runAsync(() => {
      return { users: [] }
    })
  }), []) // экшны такого типа вообще не должны зависеть от замыканий

  useEffect(() => {
    const abortable = actions.fetchPosts(count, startIndex)
    return () => abortable?.abort()
  }, [actions.fetchPosts])

  return <MyContext.Provider value={{ state, actions }}>
    <div>{...}</div>
  </MyContext.Provider>
}
```
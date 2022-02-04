export async function fetchJSON (url, options) {
  const resp = await window.fetch(url, options)
  if (resp.ok) {
    return resp.json()
  } else {
    throw new Error(resp.status + ': ' + resp.statusText)
  }
}

export function pause (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

import { useCallback, useEffect, useRef, useState } from 'react'

export function useConfirmation() {
  const [request, setRequest] = useState(null)
  const pending = useRef(null)
  const confirm = useCallback(options => new Promise(resolve => {
    if (pending.current) { resolve(false); return }
    pending.current = resolve
    setRequest(options)
  }), [])
  const answer = useCallback(accepted => {
    const resolve = pending.current
    pending.current = null
    setRequest(null)
    resolve?.(accepted)
  }, [])
  useEffect(() => () => { pending.current?.(false); pending.current = null }, [])
  return { request, confirm, answer }
}

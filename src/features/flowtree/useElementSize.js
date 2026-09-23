import { useEffect, useRef, useState } from 'react'

export function useElementSize(initialSize = { width: 1200, height: 700 }) {
  const ref = useRef(null)
  const [size, setSize] = useState(initialSize)

  useEffect(() => {
    const element = ref.current
    if (!element) return undefined
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, size]
}

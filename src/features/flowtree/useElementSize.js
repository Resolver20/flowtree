import { useEffect, useRef, useState } from 'react'

export function useElementSize(initialSize = { width: 1200, height: 700 }) {
  const ref = useRef(null)
  const [size, setSize] = useState(initialSize)
  const [hasMeasured, setHasMeasured] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return undefined
    const observer = new ResizeObserver(([entry]) => {
      // A hidden side panel can briefly report zero. Keep the last usable size.
      if (entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      setHasMeasured(true)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, size, hasMeasured]
}

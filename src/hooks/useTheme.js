import { useEffect, useState } from 'react'
import { readDeviceTheme, writeDeviceTheme } from '../domain/devicePreferences'

export function useTheme() {
  const [theme, setTheme] = useState(() => readDeviceTheme(window))
  useEffect(() => { writeDeviceTheme(window, theme) }, [theme])
  return [theme, () => setTheme(current => current === 'light' ? 'dark' : 'light')]
}

import { useEffect, useState } from 'react'

export function usePwaInstall() {
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true)
  useEffect(() => {
    const display = window.matchMedia('(display-mode: standalone)')
    const offered = event => { event.preventDefault(); setPrompt(event) }
    const completed = () => { setPrompt(null); setInstalled(true) }
    const displayChanged = () => setInstalled(display.matches || navigator.standalone === true)
    window.addEventListener('beforeinstallprompt', offered)
    window.addEventListener('appinstalled', completed)
    display.addEventListener('change', displayChanged)
    return () => {
      window.removeEventListener('beforeinstallprompt', offered)
      window.removeEventListener('appinstalled', completed)
      display.removeEventListener('change', displayChanged)
    }
  }, [])
  async function install() {
    if (!prompt) return false
    try {
      await prompt.prompt()
      await prompt.userChoice
      return true
    } catch { return false }
    finally { setPrompt(null) }
  }
  return { installed, install }
}

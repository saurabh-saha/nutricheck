import { useEffect, useState } from 'react'

export default function useDarkMode() {
  // const [isDark, setIsDark] = useState(() => {
  //   return localStorage.getItem('theme')
  // })

  // useEffect(() => {
  //   const html = document.documentElement
  //   if (isDark) {
  //     html.classList.add('dark')
  //     localStorage.setItem('theme', 'dark')
  //   } else {
  //     html.classList.remove('dark')
  //     localStorage.setItem('theme', 'light')
  //   }
  // }, [isDark])

  // const toggle = () => setIsDark(!isDark)

  useEffect(() => {
    const html = document.documentElement
    html.classList.add('dark')
  }, [])

  const toggle = () => {
    // No toggle, do nothing or just keep it dark
  }

  return { isDark: true, toggle }
}

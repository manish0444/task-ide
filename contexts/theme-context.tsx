'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { themes } from '@/lib/themes'

type ThemeContextType = {
  theme: string
  setTheme: (theme: string) => void
  themeConfig: typeof themes[keyof typeof themes]
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('vs-dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem('ide-theme')
    if (savedTheme && themes[savedTheme as keyof typeof themes]) {
      setTheme(savedTheme)
    }
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem('ide-theme', newTheme)
  }

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        setTheme: handleThemeChange, 
        themeConfig: themes[theme as keyof typeof themes] 
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

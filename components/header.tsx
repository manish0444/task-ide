'use client'

import { Button } from "@/components/ui/button"
import { useTheme } from "@/contexts/theme-context"
import { themes } from "@/lib/themes"
import Image from 'next/image'

export const languages = [
  { id: 'python', name: 'Python' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'html', name: 'HTML' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
  { id: 'rust', name: 'Rust' },
  { id: 'php', name: 'PHP' }
]

type HeaderProps = {
  onRun: () => void
  onStop: () => void
  isRunning: boolean
  currentLanguage: string
  onLanguageChange: (lang: string) => void
}

export function Header({
  onRun,
  onStop,
  isRunning,
  currentLanguage,
  onLanguageChange
}: HeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="flex h-14 items-center justify-between bg-[#1E1E1E] px-4">
      <div className="flex items-center gap-2 ml-12">
        <div className="relative h-8 w-8">
          <Image src="/logo.svg" alt="Code Runner" fill className="object-contain" />
        </div>
        <h1 className="text-lg font-semibold text-white">Code Runner</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <select
          value={currentLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="h-8 rounded border border-[#2D2D2D] bg-[#2D2D2D] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {languages.map(lang => (
            <option key={lang.id} value={lang.id}>{lang.name}</option>
          ))}
        </select>

        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="h-8 rounded border border-[#2D2D2D] bg-[#2D2D2D] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(themes).map(([key, value]) => (
            <option key={key} value={key}>{value.name}</option>
          ))}
        </select>

        <Button
          onClick={onRun}
          disabled={isRunning}
          className="h-8 bg-green-600 px-6 text-sm font-medium text-white hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50"
        >
          ▶ Run
        </Button>

        <Button
          onClick={onStop}
          disabled={!isRunning}
          className="h-8 bg-red-600 px-6 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50"
        >
          ■ Stop
        </Button>
      </div>
    </header>
  )
}
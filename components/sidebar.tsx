'use client'

import { languages } from './header'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Image from 'next/image'

type SidebarProps = {
  currentLanguage: string
  onLanguageChange: (lang: string) => void
}

export function Sidebar({ currentLanguage, onLanguageChange }: SidebarProps) {
  return (
    <aside className="flex w-16 flex-col items-center bg-[#1E1E1E] py-4">
      
      <TooltipProvider>
        <div className="flex flex-col gap-4 flex-1">
          {languages.map((lang) => (
            <Tooltip key={lang.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onLanguageChange(lang.id)}
                  className={`relative flex h-10 w-10 items-center justify-center rounded transition-colors hover:bg-[#2D2D2D] ${
                    currentLanguage === lang.id ? 'bg-[#2D2D2D]' : ''
                  }`}
                >
                  <div className="relative h-6 w-6">
                    <Image
                      src={`/${lang.id}.png`}
                      alt={lang.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  {currentLanguage === lang.id && (
                    <div className="absolute -left-1 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r bg-blue-500" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{lang.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      <div className="text-xs text-gray-500 mt-4">MANISH</div>
    </aside>
  )
}
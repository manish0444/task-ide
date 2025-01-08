'use client'

import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { Editor } from '@/components/editor'
import { useState } from 'react'
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function CodeEditorPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState('python')
  const { toast } = useToast()

  const handleRun = () => {
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
  }

  const handleLanguageChange = (lang: string) => {
    if (isRunning) {
      toast({
        title: "Warning",
        description: "Please stop the current execution before changing language",
        variant: "destructive"
      })
      return
    }
    setCurrentLanguage(lang)
  }

  return (
    <div className="flex h-screen bg-[#1E1E1E] text-white">
      <Sidebar 
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
      />
      <div className="flex flex-1 flex-col">
        <Header 
          onRun={handleRun}
          onStop={handleStop}
          isRunning={isRunning}
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
        />
        <Editor 
          isRunning={isRunning}
          onRunStateChange={setIsRunning}
          currentLanguage={currentLanguage}
        />
      </div>
      <Toaster />
    </div>
  )
}

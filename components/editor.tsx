'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useToast } from "@/hooks/use-toast"
import { useTheme } from '@/contexts/theme-context'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { getCodeSuggestion, generateCode } from '@/lib/gemini-service'
import ReactMarkdown from 'react-markdown'
import { Loader2 } from 'lucide-react'
import { Button } from './ui/button'

interface SupportedLanguage {
  id: string;
  compile: boolean;
}

interface BracketPair {
  open: string;
  close: string;
}

const supportedLanguages: Record<string, SupportedLanguage> = {
  'python': { id: 'python', compile: true },
  'javascript': { id: 'javascript', compile: true },
  'html': { id: 'html', compile: false },
  'java': { id: 'java', compile: true },
  'cpp': { id: 'cpp', compile: true },
  'rust': { id: 'rust', compile: true },
  'php': { id: 'php', compile: true }
}

const bracketPairs: BracketPair[] = [
  { open: '(', close: ')' },
  { open: '{', close: '}' },
  { open: '[', close: ']' }
]

interface EditorProps {
  isRunning: boolean;
  onRunStateChange: (state: boolean) => void;
  currentLanguage: string;
}

export function Editor({ isRunning, onRunStateChange, currentLanguage }: EditorProps) {
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isOutputInteractive, setIsOutputInteractive] = useState(false)
  const [isWaitingForInput, setIsWaitingForInput] = useState(false)
  const [inputBuffer, setInputBuffer] = useState('')
  const { toast } = useToast()
  const { theme, themeConfig } = useTheme()
  const [ws, setWs] = useState<WebSocket | null>(null)
 
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const outputRef = useRef<HTMLTextAreaElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  const handleBracketMatching = useCallback((value: string): string | null => {
    const stack: BracketPair[] = []
    
    for (const char of value) {
      const openBracket = bracketPairs.find(pair => pair.open === char)
      if (openBracket) {
        stack.push(openBracket)
        continue
      }

      const closeBracket = bracketPairs.find(pair => pair.close === char)
      if (closeBracket) {
        const lastOpen = stack.pop()
        if (!lastOpen || lastOpen.close !== char) {
          return `Syntax Error: Mismatched bracket near "${char}"`
        }
      }
    }

    if (stack.length > 0) {
      return `Syntax Error: Unclosed bracket "${stack[stack.length - 1].open}"`
    }

    return null
  }, [])

  useEffect(() => {
    const connectWebSocket = () => {
      const socket = new WebSocket('wss://compiler.skillshikshya.com/ws/compiler/')
      
      socket.onopen = () => {
        console.log('Connected to WebSocket')
        setWs(socket)
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
      }

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('Received message:', data)

          if (data.type === 'stdout') {
            if (data.data.includes('Invalid input') || data.data.includes('Enter your guess')) {
              // Don't duplicate the prompt if we're already showing it
              if (!output.endsWith(data.data)) {
                setOutput(prev => prev + data.data)
              }
            } else {
              setOutput(prev => prev + data.data)
            }
            setError(null)
            setSuggestion(null)
            
            // Check if the output is waiting for input
            const lastLine = data.data.trim()
            const isPrompt = lastLine.endsWith(':') || lastLine.endsWith('?')
            setIsWaitingForInput(isPrompt)
            setIsOutputInteractive(isPrompt)
          } else if (data.type === 'stderr') {
            const errorMsg = data.data
            setError(errorMsg)
            onRunStateChange(false)
            setIsOutputInteractive(false)

            const suggestion = await getCodeSuggestion(code, errorMsg, currentLanguage)
            if (suggestion) {
              setSuggestion(suggestion)
            }
          } else if (data.type === 'run' && data.message === 'your message has receive') {
            toast({
              title: "Code execution started",
              description: "Your code is now running..."
            })
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      socket.onerror = (error) => {
        console.error('WebSocket error:', error)
        setWs(null)
      }

      socket.onclose = () => {
        console.log('WebSocket connection closed')
        setWs(null)
        onRunStateChange(false)
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000)
      }

      return socket
    }

    const socket = connectWebSocket()

    return () => {
      if (socket) {
        socket.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isRunning && ws && ws.readyState === WebSocket.OPEN) {
      const lang = supportedLanguages[currentLanguage]
      if (!lang) {
        setError(`Language "${currentLanguage}" is not supported.\nSupported languages: ${Object.keys(supportedLanguages).join(', ')}`)
        onRunStateChange(false)
        return
      }

      if (!lang.compile) {
        setOutput(code)
        setError(null)
        setSuggestion(null)
        onRunStateChange(false)
        return
      }

      setOutput('')
      setError(null)
      setSuggestion(null)
      ws.send(JSON.stringify({
        command: 'run',
        code: code,
        language: currentLanguage,
        input: ''
      }))
    }
  }, [isRunning, code, currentLanguage])

  useEffect(() => {
    const textarea = textareaRef.current
    const editor = editorRef.current?.querySelector('pre')
    
    if (!textarea || !editor) return
    
    const syncScroll = () => {
      editor.scrollTop = textarea.scrollTop
      editor.scrollLeft = textarea.scrollLeft
    }
    
    textarea.addEventListener('scroll', syncScroll)
    return () => textarea.removeEventListener('scroll', syncScroll)
  }, [])

  useEffect(() => {
    if (currentLanguage === 'html') {
      try {
        setOutput(code)
        setError(null)
        setSuggestion(null)
      } catch (err: any) {
        setError(err.message)
      }
    }
  }, [code, currentLanguage])

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    const value = textarea.value
    const selectionStart = textarea.selectionStart
    
    setCode(value)
    
    requestAnimationFrame(() => {
      textarea.selectionStart = selectionStart
      textarea.selectionEnd = selectionStart
    })
    
    if (value.trim() && currentLanguage !== 'html') {
      try {
        if (currentLanguage === 'python' && !value.match(/^[ ]*$/m)) {
          const indentation = value.match(/^[ ]*/gm)
          if (indentation && indentation.some(i => i.length % 4 !== 0)) {
            setError('Indentation Error: Python requires consistent indentation (use 4 spaces)')
          }
        } else if (currentLanguage === 'javascript' || currentLanguage === 'java') {
          const error = handleBracketMatching(value)
          if (error) {
            setError(error)
          }
        }
      } catch (err: any) {
        setError(err.message)
      }
    }
  }

  const handleOutputInteraction = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && ws?.readyState === WebSocket.OPEN && isWaitingForInput) {
      e.preventDefault()
      const input = (e.target as HTMLTextAreaElement).value.trim()
      
      if (input) {
        // Store the input in buffer to prevent echo
        setInputBuffer(input)
        
        // Send input to WebSocket
        ws.send(JSON.stringify({
          command: 'input',
          input: input + '\n'
        }))
        
        // Clear the input field
        ;(e.target as HTMLTextAreaElement).value = ''
        
        // Add input to output display
        setOutput(prev => prev + input + '\n')
        
        // Reset waiting state
        setIsWaitingForInput(false)
      }
    }
  }

  const handleClear = () => {
    setOutput('')
    setError(null)
    setSuggestion(null)
    setIsOutputInteractive(false)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: "Text copied to clipboard",
      })
    })
  }

  const handleGenerateCode = async () => {
    setIsGenerating(true)
    try {
      const generatedCode = await generateCode(currentLanguage)
      if (generatedCode) {
        setCode(generatedCode)
        toast({
          title: "Code Generated!",
          description: "AI has generated a sample code for you",
        })
      }
    } catch (err) {
      console.error('Error generating code:', err)
      toast({
        title: "Error",
        description: "Failed to generate code. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="grid flex-1 grid-cols-2 gap-4 h-full">
      <div className="flex flex-col rounded-lg overflow-hidden h-full" 
        style={{ 
          backgroundColor: themeConfig.editorBackground,
          border: `1px solid ${theme === 'light' ? '#E0E0E0' : '#2D2D2D'}`,
        }}>
        <div className="flex-none flex items-center justify-between px-4 py-2 border-b" 
          style={{ 
            borderColor: theme === 'light' ? '#E0E0E0' : '#2D2D2D',
            backgroundColor: themeConfig.background,
          }}>
          <div className="flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${isRunning ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-sm font-medium" style={{ color: themeConfig.foreground }}>
              {isRunning ? 'Running Code...' : 'Ready to Run'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(code)}
              className="flex h-7 items-center gap-1 rounded px-3 text-xs font-medium transition-all"
              style={{ 
                backgroundColor: theme === 'light' ? '#F3F4F6' : '#2D2D2D',
                color: themeConfig.foreground
              }}
            >
              Copy Code
            </button>
            <Button
              onClick={handleGenerateCode}
              disabled={isGenerating}
              className="relative h-8 px-6 text-sm font-medium text-white overflow-hidden group rounded transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(45deg, #FF3366, #FF6B6B, #4834D4, #686DE0)',
                backgroundSize: '300% 300%',
                animation: 'gradient 5s ease infinite',
              }}
            >
              <style jsx global>{`
                @keyframes gradient {
                  0% {
                    background-position: 0% 50%;
                  }
                  50% {
                    background-position: 100% 50%;
                  }
                  100% {
                    background-position: 0% 50%;
                  }
                }
                @keyframes shine {
                  from {
                    transform: translateX(-100%) rotate(45deg);
                  }
                  to {
                    transform: translateX(100%) rotate(45deg);
                  }
                }
              `}</style>
              <div
                className="absolute inset-0 bg-white/30 group-hover:animate-[shine_1s_ease-in-out]"
                style={{
                  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)',
                }}
              />
              <span className="relative z-10 flex items-center gap-1">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span className="animate-pulse">✨</span>
                    <span>AI Assist</span>
                  </>
                )}
              </span>
            </Button>
          </div>
        </div>
        
        <div 
          ref={editorRef}
          className="flex-1 relative"
          style={{
            backgroundColor: themeConfig.editorBackground,
          }}
        >
          <div className="absolute inset-0 flex">
            <div 
              className="w-[50px] flex-none border-r"
              style={{ 
                borderColor: theme === 'light' ? '#E0E0E0' : '#2D2D2D',
                backgroundColor: theme === 'light' ? '#F6F8FA' : themeConfig.sidebarBackground,
                color: themeConfig.foreground
              }}
            >
              <div className="py-3 text-right">
                {code.split('\n').map((_, i) => (
                  <div 
                    key={i} 
                    className="px-2 text-xs leading-6"
                    style={{ 
                      color: theme === 'light' ? '#6E7781' : '#6E7681',
                    }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={handleCodeChange}
                className="absolute inset-0 resize-none bg-transparent p-3 font-mono text-sm leading-6 outline-none overflow-auto"
                style={{ 
                  color: 'transparent',
                  caretColor: themeConfig.foreground,
                }}
                placeholder={`Write your ${currentLanguage.toUpperCase()} code here...`}
                spellCheck={false}
                wrap="off"
              />
              
              <SyntaxHighlighter
                language={supportedLanguages[currentLanguage]?.id || 'text'}
                style={theme === 'light' ? vs : vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: '12px',
                  background: 'transparent',
                  fontSize: '0.875rem',
                  lineHeight: '1.5rem',
                  pointerEvents: 'none',
                  color: themeConfig.foreground,
                  position: 'absolute',
                  inset: 0,
                  overflow: 'auto'
                }}
                codeTagProps={{
                  style: {
                    color: themeConfig.foreground,
                  }
                }}
              >
                {code || ' '}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col rounded-lg overflow-hidden h-full" 
        style={{ 
          backgroundColor: themeConfig.editorBackground,
          border: `1px solid ${theme === 'light' ? '#E0E0E0' : '#2D2D2D'}`,
        }}>
        <div className="flex-none flex items-center justify-between px-4 py-2 border-b" 
          style={{ 
            borderColor: theme === 'light' ? '#E0E0E0' : '#2D2D2D',
            backgroundColor: themeConfig.background
          }}>
          <span className="text-sm font-medium" style={{ color: themeConfig.foreground }}>
            {error ? 'Error Output' : 'Code Output'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleCopy(error || output)}
              className="flex h-7 items-center gap-1 rounded px-3 text-xs font-medium transition-all"
              style={{ 
                backgroundColor: theme === 'light' ? '#F3F4F6' : '#2D2D2D',
                color: themeConfig.foreground
              }}
            >
              Copy
            </button>
            <button
              onClick={handleClear}
              className="flex h-7 items-center gap-1 rounded px-3 text-xs font-medium transition-all"
              style={{ 
                backgroundColor: theme === 'light' ? '#F3F4F6' : '#2D2D2D',
                color: themeConfig.foreground
              }}
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col relative">
          <div className="absolute inset-0">
            {isOutputInteractive ? (
              <textarea
                ref={outputRef}
                className="h-full w-full resize-none p-4 font-mono text-sm leading-6 outline-none overflow-auto"
                style={{
                  backgroundColor: 'transparent',
                  color: themeConfig.foreground
                }}
                value={output}
                onChange={(e) => {
                  // Only allow changes to the last line when waiting for input
                  if (isWaitingForInput) {
                    const lines = output.split('\n')
                    const newLines = e.target.value.split('\n')
                    if (lines.length === newLines.length) {
                      lines[lines.length - 1] = newLines[newLines.length - 1]
                      setOutput(lines.join('\n'))
                    }
                  }
                }}
                onKeyDown={handleOutputInteraction}
                spellCheck={false}
              />
            ) : (
              <div className="h-full overflow-auto">
                {currentLanguage === 'html' ? (
                  <div 
                    className="h-full w-full"
                    dangerouslySetInnerHTML={{ __html: output }}
                  />
                ) : (
                  <pre 
                    className="h-full w-full p-4 font-mono text-sm leading-6"
                    style={{ 
                      color: error 
                        ? theme === 'light' ? '#DC2626' : '#F87171'
                        : themeConfig.foreground,
                      whiteSpace: 'pre-wrap',
                      backgroundColor: 'transparent'
                    }}
                  >
                    {error || output || 'No output yet...'}
                  </pre>
                )}
              </div>
            )}
          </div>
          {suggestion && (
            <div className="mt-auto border-t flex-none" style={{ borderColor: theme === 'light' ? '#E0E0E0' : '#2D2D2D' }}>
              <div className="p-4 prose prose-sm max-w-none">
                <ReactMarkdown>{suggestion}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
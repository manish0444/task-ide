'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useToast } from "@/hooks/use-toast"
import { useTheme } from '@/contexts/theme-context'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { getCodeSuggestion, generateCode } from '@/lib/gemini-service'
import ReactMarkdown from 'react-markdown'
import { Loader2 } from 'lucide-react'

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
  const { toast } = useToast()
  const { theme, themeConfig } = useTheme()
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [lineCount, setLineCount] = useState(1)
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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
            setOutput(prev => prev + data.data)
            setError(null)
            setSuggestion(null)
          } else if (data.type === 'stderr') {
            const errorMsg = data.data
            setError(errorMsg)
            onRunStateChange(false)

            // Get code suggestion from Gemini
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
        // Try to reconnect after 3 seconds
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

      // For HTML, just preview
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

  // Improved scrollbar styles with better specificity
  const editorScrollbarStyles = {
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--scrollbar-thumb) transparent',
    '&::-webkit-scrollbar': {
      width: '8px',
      height: '8px'
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent'
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'var(--scrollbar-thumb)',
      borderRadius: '4px'
    }
  } as const

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

  useEffect(() => {
    const lines = code.split('\n').length
    setLineCount(Math.max(lines, 30)) // minimum 30 lines
  }, [code])

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    const value = textarea.value
    const selectionStart = textarea.selectionStart
    
    setCode(value)

    // Preserve cursor position
    requestAnimationFrame(() => {
      textarea.selectionStart = selectionStart
      textarea.selectionEnd = selectionStart
    })
    
    // Sync scroll between textarea and syntax highlighter
    if (editorRef.current) {
      const syntaxHighlighter = editorRef.current.querySelector('pre')
      if (syntaxHighlighter) {
        syntaxHighlighter.scrollTop = textarea.scrollTop
        syntaxHighlighter.scrollLeft = textarea.scrollLeft
      }
    }

    // Check for syntax errors in real-time
    if (value.trim() && currentLanguage !== 'html') {
      try {
        // Basic syntax check based on language
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

  const handleClear = () => {
    setOutput('')
    setError(null)
    setSuggestion(null)
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
    <div className="grid flex-1 grid-cols-2 gap-4">
      <div className="flex flex-col rounded-lg overflow-hidden" 
        style={{ 
          backgroundColor: theme === 'light' ? '#ffffff' : '#1E1E1E',
          border: `1px solid ${theme === 'light' ? '#E0E0E0' : '#2D2D2D'}`,
        }}>
        <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: theme === 'light' ? '#E0E0E0' : '#2D2D2D' }}>
          <div className="flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${isRunning ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-sm font-medium" style={{ color: theme === 'light' ? '#24292E' : '#E1E4E8' }}>
              {isRunning ? 'Running Code...' : 'Ready to Run'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(code)}
              className="flex h-7 items-center gap-1 rounded px-3 text-xs font-medium transition-all"
              style={{ 
                backgroundColor: theme === 'light' ? '#F3F4F6' : '#2D2D2D',
                color: theme === 'light' ? '#24292E' : '#E1E4E8'
              }}
            >
              Copy Code
            </button>
            <button
              onClick={handleGenerateCode}
              disabled={isGenerating}
              className="flex h-7 items-center gap-1 rounded px-3 text-xs font-medium text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: '#0366D6' }}
            >
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
            </button>
          </div>
        </div>
        
        <div 
          ref={editorRef}
          className="relative flex-1"
          style={{
            backgroundColor: theme === 'light' ? '#ffffff' : '#1E1E1E',
          }}
        >
          <div className="absolute inset-0 flex h-full">
            <div 
              className="w-[50px] flex-none border-r py-3 text-right"
              style={{ 
                borderColor: theme === 'light' ? '#E0E0E0' : '#2D2D2D',
                backgroundColor: theme === 'light' ? '#F6F8FA' : '#252526'
              }}
            >
              {Array.from({ length: Math.max(lineCount, 30) }).map((_, i) => (
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
            
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={handleCodeChange}
                className="absolute inset-0 h-full w-full resize-none bg-transparent p-3 font-mono text-sm leading-6 outline-none"
                style={{ 
                  color: 'transparent',
                  caretColor: theme === 'light' ? '#24292E' : '#E1E4E8',
                  ...editorScrollbarStyles
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
                  overflow: 'hidden'
                }}
                wrapLines={true}
              >
                {code || ' '}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col rounded-lg overflow-hidden" 
        style={{ 
          backgroundColor: theme === 'light' ? '#ffffff' : '#1E1E1E',
          border: `1px solid ${theme === 'light' ? '#E0E0E0' : '#2D2D2D'}`,
        }}>
        <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: theme === 'light' ? '#E0E0E0' : '#2D2D2D' }}>
          <span className="text-sm font-medium" style={{ color: theme === 'light' ? '#24292E' : '#E1E4E8' }}>
            {error ? 'Error Output' : 'Code Output'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleCopy(error || output)}
              className="flex h-7 items-center gap-1 rounded px-3 text-xs font-medium transition-all"
              style={{ 
                backgroundColor: theme === 'light' ? '#F3F4F6' : '#2D2D2D',
                color: theme === 'light' ? '#24292E' : '#E1E4E8'
              }}
            >
              Copy
            </button>
            <button
              onClick={handleClear}
              className="flex h-7 items-center gap-1 rounded px-3 text-xs font-medium transition-all"
              style={{ 
                backgroundColor: theme === 'light' ? '#F3F4F6' : '#2D2D2D',
                color: theme === 'light' ? '#24292E' : '#E1E4E8'
              }}
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="flex flex-1 flex-col">
          <div 
            className="h-full"
            style={{ 
              backgroundColor: error 
                ? theme === 'light' ? '#FFF5F5' : '#2D2226'
                : theme === 'light' ? '#ffffff' : '#1E1E1E'
            }}
          >
            <div 
              className="h-full w-full p-4 overflow-auto"
              style={{
                ...editorScrollbarStyles
              }}
            >
              {currentLanguage === 'html' ? (
                <div 
                  className="h-full w-full"
                  dangerouslySetInnerHTML={{ __html: output }}
                />
              ) : (
                <pre 
                  className="font-mono text-sm leading-6"
                  style={{ 
                    color: error 
                      ? theme === 'light' ? '#DC2626' : '#F87171'
                      : theme === 'light' ? '#24292E' : '#E1E4E8',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {error || output || 'No output yet...'}
                </pre>
              )}
            </div>
          </div>
          {suggestion && (
            <div className="flex-1 rounded-lg border border-[#2D2D2D] bg-blue-500/5">
              <div 
                className="h-full w-full overflow-auto p-4 prose prose-sm dark:prose-invert max-w-none"
                style={editorScrollbarStyles }
              >
                <ReactMarkdown>{suggestion}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
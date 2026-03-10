import { createFileRoute } from '@tanstack/react-router'
import { useChat } from '@ai-sdk/react'
import { isTextUIPart, isReasoningUIPart, isToolUIPart, getToolName } from 'ai'
import { useRef, useEffect, useState } from 'react'
import { Send, Square, Wrench, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { Streamdown } from 'streamdown'
import type { DynamicToolUIPart, UIMessagePart } from 'ai'
type AnyPart = UIMessagePart<never, never>

const EXAMPLE_PROMPTS = [
  { label: 'Check SOL balance', prompt: "What's my SOL balance?" },
  { label: 'Swap tokens', prompt: 'Swap 0.1 SOL for USDC' },
  { label: 'View portfolio', prompt: 'Show me all my token holdings' },
  { label: 'Check token price', prompt: 'What is the price of BONK?' },
]

export const Route = createFileRoute('/')({
  component: ChatPage,
})

function ThinkingBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-2 rounded-xl border border-gray-700/60 bg-gray-900/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span className="italic">Thinking…</span>
      </button>
      {open && (
        <div className="px-4 pb-3 text-xs text-gray-400 italic whitespace-pre-wrap border-t border-gray-700/60 pt-2">
          {content}
        </div>
      )}
    </div>
  )
}

function ToolInvocationBlock({ part }: { part: DynamicToolUIPart }) {
  const [open, setOpen] = useState(false)
  const isDone = part.state === 'output-available' || part.state === 'output-error'
  const isError = part.state === 'output-error'
  const toolName = getToolName(part)

  return (
    <div className="mb-2 rounded-xl border border-blue-500/20 bg-blue-950/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-blue-300 hover:text-blue-100 transition-colors"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <Wrench className="w-3.5 h-3.5 shrink-0" />
        <span className="font-mono font-medium">{toolName}</span>
        {!isDone && <Loader2 className="w-3 h-3 animate-spin ml-auto text-blue-400" />}
        {isDone && !isError && <span className="ml-auto text-green-400 text-[10px]">✓ done</span>}
        {isError && <span className="ml-auto text-red-400 text-[10px]">✗ error</span>}
      </button>
      {open && (
        <div className="border-t border-blue-500/20 px-3 py-2 space-y-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Input</p>
            <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(part.input, null, 2)}
            </pre>
          </div>
          {part.state === 'output-available' && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Output</p>
              <pre className="text-xs text-green-300 overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(part.output, null, 2)}
              </pre>
            </div>
          )}
          {isError && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Error</p>
              <pre className="text-xs text-red-300 overflow-x-auto whitespace-pre-wrap break-all">
                {part.errorText}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MessageParts({ parts }: { parts: AnyPart[] }) {
  return (
    <>
      {parts.map((part, i) => {
        if (isTextUIPart(part)) {
          return (
            <div key={i} className="prose prose-invert prose-sm max-w-none">
              <Streamdown>{part.text}</Streamdown>
            </div>
          )
        }
        if (isReasoningUIPart(part)) {
          const content = part.text.trim()

          if (!content) return null
          return <ThinkingBlock key={i} content={content} />
        }
        if (isToolUIPart(part)) {
          const name = getToolName(part)
          const toolCallId = 'toolCallId' in part ? (part as DynamicToolUIPart).toolCallId : name
          return <ToolInvocationBlock key={toolCallId} part={part as DynamicToolUIPart} />
        }
        return null
      })}
    </>
  )
}



function ChatPage() {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, stop } = useChat()
  const isLoading = status === 'submitted' || status === 'streaming'


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    sendMessage({ text: trimmed })
    setInput('')
  }

  const handleExampleClick = (prompt: string) => {
    if (isLoading) return
    sendMessage({ text: prompt })
  }

  return (
    <div className="relative h-[calc(100vh-57px)] overflow-hidden">
      {/* Scrollable message area */}
      <div className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 pt-6 pb-36 space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-24">
              <p className="text-xl font-semibold text-white mb-2">Welcome to Agentic Wallet</p>
              <p className="text-sm text-gray-400 mb-6">Connect your wallet and start trading on Solana</p>

              {/* Clickable examples */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {EXAMPLE_PROMPTS.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(example.prompt)}
                    disabled={isLoading}
                    className="text-left p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-purple-500/30 transition-all group"
                  >
                    <p className="text-sm font-medium text-gray-300 group-hover:text-white mb-1">
                      {example.label}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {example.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[80%]">
                {message.role === 'user' ? (
                  <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 bg-purple-600/30 border border-purple-500/20 text-white text-sm">
                    {(message.parts.find((p) => p.type === 'text') as { type: 'text'; text: string } | undefined)?.text ?? ''}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <MessageParts parts={message.parts as AnyPart[]} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-gray-800/60 border border-gray-700/40">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Floating input */}
      <div className="absolute bottom-0 inset-x-0 pb-5 px-4 pointer-events-none">
        <form
          onSubmit={handleSubmit}
          className={`mx-auto pointer-events-auto transition-all duration-300 ease-out ${focused ? 'max-w-3xl -translate-y-3' : 'max-w-xl translate-y-0'
            }`}
        >
          <div className={`flex items-center gap-2 rounded-2xl border bg-gray-900/80 backdrop-blur-xl shadow-xl shadow-black/40 px-3 py-2 transition-all duration-300 ${focused ? 'border-purple-500/40 shadow-purple-900/20' : 'border-gray-700/70'
            }`}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Ask about your wallet, swap tokens, or transfer SOL..."
              className="flex-1 bg-transparent px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none"
              disabled={isLoading}
              autoComplete="off"
            />

            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                className="p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors shrink-0"
                title="Stop"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>

    </div>
  )
}

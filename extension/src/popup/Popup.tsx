import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { VerificationResponse } from '../types'

interface StoredState {
  isLoading?: boolean
  result?: VerificationResponse | null
  error?: string | null
  isCapturing?: boolean
}

export default function Popup() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<VerificationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [flashEffect, setFlashEffect] = useState(false)

  // Loading messages that rotate
  const loadingMessages = [
    "Our AI is fact-checking this post...",
    "Cross-checking facts across trusted sources...",
    "Analyzing claims with real-time data...",
    "Verifying truth takes a second ⏳"
  ]
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)

  const incrementMessageIndex = useCallback(() => {
    setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length)
  }, [])

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(incrementMessageIndex, 3000) // 3 seconds for readability
      return () => clearInterval(interval)
    } else {
      setLoadingMessageIndex(0) // Reset when not loading
    }
  }, [isLoading, incrementMessageIndex])

  // Background script handles everything - popup just reads from storage
  useEffect(() => {
    // Function to update state from storage
    const updateStateFromStorage = () => {
      chrome.storage.local.get(['popupState'], (data) => {
        if (data.popupState) {
          const state: StoredState = data.popupState
          
          // Always update states - force updates to ensure UI reflects storage
          setIsLoading(state.isLoading || false)
          
          // Update result - always check if it changed
          setResult(prev => {
            const prevStr = prev ? JSON.stringify(prev) : null
            const newStr = state.result ? JSON.stringify(state.result) : null
            if (prevStr !== newStr) {
              return state.result || null
            }
            return prev
          })
          
          // Always update error
          setError(state.error || null)
        } else {
          // No state in storage - reset to initial
          setIsLoading(false)
          setResult(null)
          setError(null)
        }
      })
    }

    // Load initial state immediately
    updateStateFromStorage()

    // Listen for storage changes (more reliable than polling)
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.popupState) {
        // Small delay to ensure storage is fully updated
        setTimeout(updateStateFromStorage, 50)
      }
    }

    chrome.storage.onChanged.addListener(storageListener)

    // Fallback: Poll storage every 300ms (in case listener misses updates)
    // This is especially important for long-running API calls (30-50 seconds)
    const interval = setInterval(updateStateFromStorage, 300)

    // Cleanup
    return () => {
      chrome.storage.onChanged.removeListener(storageListener)
      clearInterval(interval)
    }
  }, [])

  const startCapture = async () => {
    setError(null)
    setResult(null)
    setIsCapturing(true)
    
    // Trigger camera flash effect
    setFlashEffect(true)
    setTimeout(() => setFlashEffect(false), 500)

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE' })
        // Close popup so user can see the page clearly
        window.close()
      }
    } catch (err) {
      setIsCapturing(false)
      setError('Failed to start capture. Please refresh the page and try again.')
    }
  }

  // Count sources from response
  const getSourceCount = (response: string): number => {
    const matches = response.match(/\[\d+\]/g)
    return matches ? new Set(matches).size : 0
  }


  const reset = () => {
    setResult(null)
    setError(null)
    setIsCapturing(false)
    setIsLoading(false)
    // Clear stored state
    chrome.storage.local.remove(['popupState'])
  }

  return (
    <div className="w-full min-h-[500px] bg-black">
      {/* Camera Flash Effect */}
      {flashEffect && (
        <div className="fixed inset-0 bg-white camera-flash z-50 pointer-events-none" />
      )}
      
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">ReaLM</h1>
            <p className="text-xs text-zinc-400 font-medium">AI-Powered Fact Checker</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Initial State */}
        {!isLoading && !result && !isCapturing && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="mb-8 float">
              <div className="relative">
                <div className="absolute inset-0 bg-white rounded-full blur-3xl opacity-5 pulse-glow"></div>
                <svg
                  className="w-24 h-24 text-white relative z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 text-center tracking-tight">
              Not sure if that info is real? Let's find out.
            </h2>
            <p className="text-xs text-zinc-500 text-center mb-10 px-4">
              Snap a quick screenshot — ReaLM will tell you if it's true or misleading in seconds.
            </p>
            <button
              onClick={startCapture}
              className="group relative flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-black font-semibold px-8 py-4 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              <svg
                className="w-5 h-5 transition-transform group-hover:scale-110 duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Capture Screenshot</span>
            </button>

            <footer className="text-xs text-zinc-500 text-center mt-4">
            Built with ❤️ by <a href="https://x.com/lakshh__" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors">@lakshh__</a>
            </footer>
          </div>
        )}

        {/* Capturing State */}
        {isCapturing && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-white animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <p className="text-white font-semibold mb-2">Capture Mode Active</p>
            <p className="text-sm text-zinc-400 text-center px-4">
              Click and drag to select the area to capture
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Right-click to cancel
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="relative mb-6">
              {/* Outer ring */}
              <div className="absolute inset-0 w-20 h-20 border-4 border-zinc-800 rounded-full spin-slow -ml-2 -mt-2"></div>
              {/* Middle ring */}
              <div className="absolute inset-0 w-16 h-16 border-4 border-zinc-700 rounded-full animate-spin"></div>
              {/* Inner pulse */}
              <div className="w-16 h-16 bg-white rounded-full wave-pulse flex items-center justify-center">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <p className="text-white font-bold mb-4 text-lg tracking-tight">Analyzing...</p>
            <div className="text-sm text-zinc-400 text-center px-4 mb-4 min-h-[48px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingMessageIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="font-medium"
                >
                  {loadingMessages[loadingMessageIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-zinc-900 border-l-4 border-white p-4 rounded">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-white mt-0.5 mr-2 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-white font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Results State */}
        {result && (
          <div className="space-y-4">
            {/* Validity Badge with Color Coding */}
            <div className={`relative overflow-hidden flex items-start gap-3 p-5 rounded-xl border-2 ${
              result.validity 
                ? 'border-green-700 bg-green-950/30 text-green-200' 
                : 'border-amber-700 bg-amber-950/30 text-amber-200'
            }`}>
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                result.validity ? 'bg-green-600' : 'bg-amber-600'
              }`}>
                {result.validity ? (
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className={`text-lg font-bold mb-1 tracking-tight ${
                  result.validity ? 'text-green-100' : 'text-amber-100'
                }`}>
                  {result.validity ? 'Accurate Information' : 'Misleading Information'}
                </p>
                <p className={`text-sm font-medium ${
                  result.validity ? 'text-green-300' : 'text-amber-300'
                }`}>
                  {result.validity
                    ? 'This claim is supported by evidence'
                    : 'This claim appears to be false or misleading'}
                </p>
                
                {/* Credibility Markers */}
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                    result.validity 
                      ? 'bg-green-600 text-green-50' 
                      : 'bg-amber-600 text-amber-50'
                  }`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold">AI Verified</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span className="font-semibold">{getSourceCount(result.response)} Sources</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Claim - Monochrome */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">
                    Extracted Claim
                  </p>
                  <p className="text-sm text-white leading-relaxed font-medium">
                    {result.claim}
                  </p>
                </div>
              </div>
            </div>

            {/* Analysis - Monochrome */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-3">
                    Detailed Analysis
                  </p>
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap space-y-2">
                    {result.response}
                  </div>
                </div>
              </div>
            </div>

            {/* Reset Button - Monochrome */}
            <button
              onClick={reset}
              className="w-full bg-white hover:bg-zinc-100 text-black font-semibold py-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Check Another Post
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


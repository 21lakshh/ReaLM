chrome.runtime.onInstalled.addListener(() => {
  // Extension installed
})

async function verifyImage(imageBlob: Blob) {
  const formData = new FormData()
  formData.append('image', imageBlob, 'screenshot.jpg')

  const response = await fetch('http://localhost:8787/verify-new', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }

  return await response.json()
}

function dataURLtoBlob(dataURL: string): Blob {
  const parts = dataURL.split(',')
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(parts[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  
  return new Blob([u8arr], { type: mime })
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CAPTURE_SCREENSHOT') {
    chrome.tabs.captureVisibleTab(
      { format: 'jpeg', quality: 90 },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message })
        } else {
          sendResponse({ imageData: dataUrl })
        }
      }
    )
    return true // Keep message channel open for async response
  }

  if (message.type === 'CAPTURE_COMPLETE' && message.imageData) {
    // Process the image and call API in background
    ;(async () => {
      try {
        // Set loading state immediately
        await chrome.storage.local.set({ popupState: { isLoading: true, result: null, error: null } })
        
        const blob = dataURLtoBlob(message.imageData)
        
        // Create a timeout promise (60 seconds max)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout: API took too long to respond')), 60000)
        })
        
        // Race between API call and timeout
        const result = await Promise.race([
          verifyImage(blob),
          timeoutPromise
        ]) as any
        
        // Save result immediately
        await chrome.storage.local.set({ 
          popupState: { 
            isLoading: false, 
            result, 
            error: null 
          } 
        })
        
        // Force a storage event by updating again (ensures listener catches it)
        setTimeout(() => {
          chrome.storage.local.set({ 
            popupState: { 
              isLoading: false, 
              result, 
              error: null 
            } 
          })
        }, 100)
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to verify image'
        
        // Save error state
        await chrome.storage.local.set({ 
          popupState: { 
            isLoading: false, 
            result: null, 
            error: errorMessage
          } 
        })
        
        // Force update
        setTimeout(() => {
          chrome.storage.local.set({ 
            popupState: { 
              isLoading: false, 
              result: null, 
              error: errorMessage
            } 
          })
        }, 100)
      }
    })()
  }

  if (message.type === 'CAPTURE_ERROR') {
    chrome.storage.local.set({ 
      popupState: { 
        isLoading: false, 
        result: null, 
        error: message.error || 'Failed to capture screenshot' 
      } 
    })
  }
})


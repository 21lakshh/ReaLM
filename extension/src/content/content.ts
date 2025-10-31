let isSelecting = false
let selectionOverlay: HTMLDivElement | null = null
let startX = 0
let startY = 0
let selectionBox: HTMLDivElement | null = null

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_CAPTURE') {
    startScreenCapture()
    sendResponse({ success: true })
  }
})

function startScreenCapture() {
  if (isSelecting) return

  isSelecting = true
  
  // Create full-screen overlay
  selectionOverlay = document.createElement('div')
  selectionOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.3);
    cursor: crosshair;
    z-index: 2147483647;
  `
  
  // Create selection box
  selectionBox = document.createElement('div')
  selectionBox.style.cssText = `
    position: fixed;
    border: 2px solid #3b82f6;
    background: rgba(59, 130, 246, 0.1);
    display: none;
    z-index: 2147483648;
    pointer-events: none;
  `
  
  document.body.appendChild(selectionOverlay)
  document.body.appendChild(selectionBox)
  
  selectionOverlay.addEventListener('mousedown', handleMouseDown)
  selectionOverlay.addEventListener('mousemove', handleMouseMove)
  selectionOverlay.addEventListener('mouseup', handleMouseUp)
  selectionOverlay.addEventListener('contextmenu', cancelSelection)
}

function handleMouseDown(e: MouseEvent) {
  e.preventDefault()
  startX = e.clientX
  startY = e.clientY
  
  if (selectionBox) {
    selectionBox.style.left = `${startX}px`
    selectionBox.style.top = `${startY}px`
    selectionBox.style.width = '0px'
    selectionBox.style.height = '0px'
    selectionBox.style.display = 'block'
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!selectionBox || selectionBox.style.display === 'none') return
  
  const currentX = e.clientX
  const currentY = e.clientY
  
  const width = Math.abs(currentX - startX)
  const height = Math.abs(currentY - startY)
  const left = Math.min(startX, currentX)
  const top = Math.min(startY, currentY)
  
  selectionBox.style.left = `${left}px`
  selectionBox.style.top = `${top}px`
  selectionBox.style.width = `${width}px`
  selectionBox.style.height = `${height}px`
}

function handleMouseUp(e: MouseEvent) {
  e.preventDefault()
  
  if (!selectionBox) return
  
  const rect = {
    x: parseInt(selectionBox.style.left),
    y: parseInt(selectionBox.style.top),
    width: parseInt(selectionBox.style.width),
    height: parseInt(selectionBox.style.height)
  }
  
  cleanup()
  
  // Capture screenshot and crop
  chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
    if (response.error) {
      chrome.runtime.sendMessage({
        type: 'CAPTURE_ERROR',
        error: response.error
      })
      return
    }
    
    cropImage(response.imageData, rect).then((croppedImage) => {
      chrome.runtime.sendMessage({
        type: 'CAPTURE_COMPLETE',
        imageData: croppedImage
      })
    }).catch((error) => {
      chrome.runtime.sendMessage({
        type: 'CAPTURE_ERROR',
        error: error.message
      })
    })
  })
}

function cancelSelection(e: Event) {
  e.preventDefault()
  cleanup()
  chrome.runtime.sendMessage({
    type: 'CAPTURE_ERROR',
    error: 'Capture cancelled'
  })
}

function cleanup() {
  isSelecting = false
  
  if (selectionOverlay) {
    selectionOverlay.remove()
    selectionOverlay = null
  }
  
  if (selectionBox) {
    selectionBox.remove()
    selectionBox = null
  }
}

async function cropImage(dataUrl: string, rect: { x: number; y: number; width: number; height: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      
      canvas.width = rect.width
      canvas.height = rect.height
      
      ctx.drawImage(
        img,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        0,
        0,
        rect.width,
        rect.height
      )
      
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}


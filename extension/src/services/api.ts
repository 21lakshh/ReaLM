import { VerificationResponse } from '../types'

const API_BASE_URL = 'http://localhost:8787'

export async function verifyImage(imageBlob: Blob): Promise<VerificationResponse> {
  const formData = new FormData()
  formData.append('image', imageBlob, 'screenshot.jpg')

  const response = await fetch(`${API_BASE_URL}/verify-new`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }

  const data = await response.json()
  return data as VerificationResponse
}

export function dataURLtoBlob(dataURL: string): Blob {
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


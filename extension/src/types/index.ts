export interface VerificationResponse {
  question: string
  claim: string
  validity: boolean
  response: string
}

export interface CaptureMessage {
  type: 'START_CAPTURE' | 'CAPTURE_COMPLETE' | 'CAPTURE_ERROR'
  imageData?: string
  error?: string
}

export interface VerificationState {
  isLoading: boolean
  result: VerificationResponse | null
  error: string | null
}


// Pixel sounds library for retro gaming audio effects

let soundEnabled = typeof window !== 'undefined' && localStorage.getItem('pixelSounds') !== 'false'

// Web Audio API context
let audioContext: AudioContext | null = null

// Initialize audio context on user interaction
if (typeof window !== 'undefined') {
  document.addEventListener('click', initAudioContext, { once: true })
}

function initAudioContext() {
  if (!audioContext && typeof window !== 'undefined') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
}

// Sound effect generators
const sounds = {
  click: () => {
    if (!audioContext || !soundEnabled) return
    
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'square'
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  },
  
  success: () => {
    if (!audioContext || !soundEnabled) return
    
    const oscillator1 = audioContext.createOscillator()
    const oscillator2 = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator1.connect(gainNode)
    oscillator2.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator1.type = 'square'
    oscillator2.type = 'square'
    
    oscillator1.frequency.setValueAtTime(440, audioContext.currentTime)
    oscillator1.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.15)
    
    oscillator2.frequency.setValueAtTime(554.37, audioContext.currentTime)
    oscillator2.frequency.exponentialRampToValueAtTime(1108.73, audioContext.currentTime + 0.15)
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    
    oscillator1.start(audioContext.currentTime)
    oscillator2.start(audioContext.currentTime)
    oscillator1.stop(audioContext.currentTime + 0.3)
    oscillator2.stop(audioContext.currentTime + 0.3)
  },
  
  error: () => {
    if (!audioContext || !soundEnabled) return
    
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2)
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
  },
  
  hover: () => {
    if (!audioContext || !soundEnabled) return
    
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 1200
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.05)
  }
}

export function playSound(type: keyof typeof sounds) {
  initAudioContext()
  sounds[type]?.()
}

export function toggleSound() {
  soundEnabled = !soundEnabled
  if (typeof window !== 'undefined') {
    localStorage.setItem('pixelSounds', soundEnabled.toString())
  }
}

export function isSoundEnabled() {
  return soundEnabled
} 
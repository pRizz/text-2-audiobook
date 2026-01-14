/// <reference types="vite/client" />

interface Navigator {
  gpu?: GPU
}

interface GPU {
  requestAdapter(): Promise<GPUAdapter | null>
}

interface GPUAdapter {}

declare const __APP_VERSION__: string
declare const __GIT_HASH__: string
declare const __BUILD_DATETIME__: string

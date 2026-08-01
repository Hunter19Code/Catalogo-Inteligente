import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  )
  const [showIos, setShowIos] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    const key = 'favoritos_install_dismissed'
    if (localStorage.getItem(key) === '1') {
      setDismissed(true)
    }

    if (isIos()) {
      setShowIos(true)
      return
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (dismissed || isStandalone()) return null
  if (!deferred && !showIos) return null

  function dismiss() {
    localStorage.setItem('favoritos_install_dismissed', '1')
    setDismissed(true)
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }

  return (
    <div className="animate-fade-up mb-4 rounded-[1.35rem] bg-primary p-4 text-white shadow-soft">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Instalar Favoritos</p>
          {showIos ? (
            <p className="mt-1 text-sm leading-relaxed text-white/90">
              En Safari: toca{' '}
              <Share className="mx-0.5 inline size-3.5 align-text-bottom" />{' '}
              <strong>Compartir</strong> →{' '}
              <strong>Añadir a pantalla de inicio</strong>
            </p>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-white/90">
              Añádela a tu pantalla de inicio y úsala como una app.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {!showIos && deferred ? (
              <button
                type="button"
                onClick={() => void install()}
                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-primary active:scale-95"
              >
                Instalar app
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white active:scale-95"
            >
              Ahora no
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

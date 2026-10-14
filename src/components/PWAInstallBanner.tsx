import { useState, useEffect } from 'react';
import { X, Share, PlusSquare, MoreVertical } from 'lucide-react';

interface PWAInstallBannerProps {
  variant?: 'default' | 'cashier';
}

const PWAInstallBanner = ({ variant = 'default' }: PWAInstallBannerProps) => {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const isCashier = variant === 'cashier';
  const storageKey = isCashier ? 'pwa-cashier-banner-dismissed' : 'pwa-banner-dismissed';
  const title = isCashier ? 'Instale o Caixa Bah Ofertas' : 'Instale o Bah Ofertas';
  const subtitle = isCashier
    ? 'Acesse o painel do caixa direto da tela inicial'
    : 'Acesse ofertas direto da tela inicial';
  const installButtonLabel = isCashier ? 'Instalar Caixa' : 'Instalar Aplicativo';

  useEffect(() => {
    // Don't show if already installed as standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Don't show if already dismissed
    if (localStorage.getItem(storageKey)) return;

    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /Android/i.test(ua);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Cashier: always show with manual instructions (don't wait for events)
    if (isCashier) {
      const timer = setTimeout(() => setShow(true), 800);
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    if (isIOSDevice) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isCashier, storageKey]);

  const handleDismiss = () => {
    setShow(false);
    document.body.classList.remove('pwa-banner-active');
    localStorage.setItem(storageKey, 'true');
  };

  useEffect(() => {
    if (show) document.body.classList.add('pwa-banner-active');
    return () => document.body.classList.remove('pwa-banner-active');
  }, [show]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShow(false);
    }
  };

  if (!show) return null;

  // Show manual instructions when there's no native prompt available
  const showManualInstructions = isIOS || (isCashier && !deferredPrompt);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-in slide-in-from-bottom duration-500">
      <div className="mx-auto max-w-lg p-3">
        <div className="relative rounded-2xl bg-card border border-border shadow-2xl p-4">
          <button
            type="button"
            onClick={handleDismiss}
            onTouchEnd={(e) => { e.preventDefault(); handleDismiss(); }}
            className="overlay-close top-1 right-1"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <img src="/pwa-icon.png" alt="Bah Ofertas" className="w-12 h-12 rounded-xl" />
            <div>
              <h3 className="font-bold text-foreground text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          {deferredPrompt && !isIOS && (
            <button
              onClick={handleInstall}
              className="w-full rounded-xl bg-primary text-primary-foreground font-semibold text-sm py-2.5 hover:bg-primary/90 transition-colors mb-2"
            >
              {installButtonLabel}
            </button>
          )}

          {showManualInstructions && (
            <div className="bg-muted/50 rounded-xl p-3 space-y-2">
              {isIOS ? (
                <>
                  <p className="text-xs text-foreground font-medium">Como instalar no iPhone/iPad:</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">1</span>
                    <span>Toque no ícone</span>
                    <Share className="h-4 w-4 text-primary shrink-0" />
                    <span>(Compartilhar)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">2</span>
                    <span>Selecione</span>
                    <PlusSquare className="h-4 w-4 text-primary shrink-0" />
                    <span>"Adicionar à Tela de Início"</span>
                  </div>
                </>
              ) : isAndroid ? (
                <>
                  <p className="text-xs text-foreground font-medium">Como instalar no Android:</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">1</span>
                    <span>Toque no menu</span>
                    <MoreVertical className="h-4 w-4 text-primary shrink-0" />
                    <span>do navegador</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">2</span>
                    <span>Selecione "Instalar app" ou "Adicionar à tela inicial"</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-foreground font-medium">Como instalar no computador:</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">1</span>
                    <span>Clique no ícone de instalação na barra de endereço</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">2</span>
                    <span>Ou abra o menu do navegador → "Instalar app"</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;

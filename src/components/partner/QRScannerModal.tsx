import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, Keyboard, CheckCircle2, XCircle, RotateCcw, VideoOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import jsQR from 'jsqr';

interface ValidationResult {
  success: boolean;
  error?: string;
  voucher_id?: string;
  offer_title?: string;
  company_name?: string;
  purchase_price?: number;
  original_price?: number;
  economy_amount?: number;
}

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

const QRScannerModal = ({ open, onOpenChange, companyId }: QRScannerModalProps) => {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const scanningRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  const { toast } = useToast();

  // Keep refs in sync
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
    scanningRef.current = false;
  }, []);

  const handleClose = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      stopCamera();
      setResult(null);
      setCode('');
      setCameraError(null);
      setMode('camera');
    }
    onOpenChangeRef.current(isOpen);
  }, [stopCamera]);

  const validateVoucher = useCallback(async (voucherCode: string) => {
    const trimmed = voucherCode.trim().toUpperCase();
    if (trimmed.length === 0) return;

    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.rpc('validate_voucher_by_code', {
        voucher_code: trimmed,
        partner_company_id: companyId,
      });
      if (error) throw error;

      const validationResult = data as unknown as ValidationResult;
      setResult(validationResult);

      if (validationResult.success) {
        stopCamera();
        toast({ title: '✅ Voucher validado!', description: `${validationResult.offer_title} marcado como usado.` });
      }
    } catch (err) {
      console.error('Validation error:', err);
      toast({ title: 'Erro', description: 'Erro ao validar voucher.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [companyId, stopCamera, toast]);

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !scanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (qrResult && qrResult.data) {
      setScanning(false);
      scanningRef.current = false;
      validateVoucher(qrResult.data);
      return;
    }

    if (scanningRef.current) {
      animationRef.current = requestAnimationFrame(scanFrame);
    }
  }, [validateVoucher]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        scanningRef.current = true;
        animationRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Permissão da câmera negada. Por favor, permita o acesso à câmera nas configurações do seu navegador.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('Nenhuma câmera encontrada neste dispositivo.');
      } else {
        setCameraError('Não foi possível acessar a câmera. Tente digitar o código manualmente.');
      }
      setMode('manual');
    }
  }, [scanFrame]);

  useEffect(() => {
    if (open && mode === 'camera') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, mode]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 pt-10 sm:pt-12">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
            Escanear Voucher
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code ou digite o código do voucher do cliente para validar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'camera' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
              onClick={() => { setMode('camera'); setResult(null); }}
            >
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Câmera
            </Button>
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
              onClick={() => { stopCamera(); setMode('manual'); setResult(null); }}
            >
              <Keyboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Digitar Código
            </Button>
          </div>

          {/* Camera View */}
          {mode === 'camera' && !result && (
            <div className="relative">
              <div className="relative rounded-lg sm:rounded-xl overflow-hidden bg-black aspect-square max-h-[50vh] sm:max-h-[60vh] md:max-h-none">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning overlay */}
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-40 h-40 sm:w-56 sm:h-56 border-2 border-primary rounded-xl sm:rounded-2xl relative">
                      <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-l-4 border-primary rounded-tl-lg sm:rounded-tl-xl" />
                      <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-r-4 border-primary rounded-tr-lg sm:rounded-tr-xl" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-l-4 border-primary rounded-bl-lg sm:rounded-bl-xl" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-r-4 border-primary rounded-br-lg sm:rounded-br-xl" />
                      {/* Animated scan line */}
                      <div className="absolute left-2 right-2 h-0.5 bg-primary/80 animate-[scanLine_2s_ease-in-out_infinite]" />
                    </div>
                  </div>
                )}

                {/* Camera error */}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/90 p-4 sm:p-6 text-center">
                    <VideoOff className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-2 sm:mb-3" />
                    <p className="text-xs sm:text-sm text-muted-foreground">{cameraError}</p>
                  </div>
                )}
              </div>

              {scanning && (
                <p className="text-center text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-3 animate-pulse">
                  Aponte a câmera para o QR Code do cliente
                </p>
              )}

              {!scanning && !cameraError && (
                <div className="text-center mt-2 sm:mt-3">
                  <Button size="sm" variant="outline" onClick={startCamera} className="text-xs sm:text-sm">
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    Reiniciar Câmera
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Manual Code Input */}
          {mode === 'manual' && !result && (
            <div className="space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Digite o código de 8 caracteres apresentado pelo cliente
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Input
                  placeholder="Ex: AB12CD34"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && validateVoucher(code)}
                  className="font-mono text-lg sm:text-xl tracking-[0.2em] sm:tracking-[0.3em] text-center uppercase h-12 sm:h-10"
                  maxLength={8}
                  autoFocus
                />
                <Button
                  onClick={() => validateVoucher(code)}
                  disabled={loading || code.length < 1}
                  className="w-full sm:w-auto px-6 h-10 sm:h-10"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Validar'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && mode === 'camera' && (
            <div className="flex items-center justify-center py-4 sm:py-6">
              <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 sm:ml-3 text-xs sm:text-sm text-muted-foreground">Validando voucher...</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`p-3 sm:p-5 rounded-lg sm:rounded-xl border-2 ${result.success ? 'border-green-500/30 bg-green-500/10' : 'border-destructive/30 bg-destructive/10'}`}>
              {result.success ? (
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-base sm:text-lg font-bold">Voucher Validado!</span>
                  </div>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p><strong>Oferta:</strong> {result.offer_title}</p>
                    <p><strong>Valor pago:</strong> {formatCurrency(result.purchase_price || 0)}</p>
                    {result.original_price && (
                      <p><strong>Valor original:</strong> {formatCurrency(result.original_price)}</p>
                    )}
                    {result.economy_amount && Number(result.economy_amount) > 0 && (
                      <p className="text-green-600 dark:text-green-400 font-semibold">
                        Economia do cliente: {formatCurrency(Number(result.economy_amount))}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-green-600 hover:bg-green-700 text-white text-xs">Marcado como Usado</Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive shrink-0" />
                  <p className="text-destructive text-xs sm:text-sm font-medium">{result.error}</p>
                </div>
              )}

              {result.success && (
                <Button
                  variant="outline"
                  className="w-full mt-3 h-9 sm:h-10 text-sm"
                  onClick={() => handleClose(false)}
                >
                  Fechar
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRScannerModal;

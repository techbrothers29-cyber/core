import { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VideoOff, Keyboard, Camera } from 'lucide-react';
import jsQR from 'jsqr';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
}

const CashierQRScanner = ({ open, onOpenChange, onScan }: Props) => {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scannedRef = useRef(false);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    scannedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const tick = () => {
        if (scannedRef.current || !videoRef.current || !canvasRef.current) return;
        const v = videoRef.current;
        if (v.readyState === v.HAVE_ENOUGH_DATA) {
          const c = canvasRef.current;
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.drawImage(v, 0, 0, c.width, c.height);
            const img = ctx.getImageData(0, 0, c.width, c.height);
            const result = jsQR(img.data, img.width, img.height);
            if (result?.data) {
              scannedRef.current = true;
              stop();
              onScan(result.data.trim());
              return;
            }
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError('Não foi possível acessar a câmera. Use o modo manual.');
      setMode('manual');
    }
  }, [onScan, stop]);

  useEffect(() => {
    if (open && mode === 'camera') start();
    return () => stop();
  }, [open, mode, start, stop]);

  const handleManual = () => {
    if (!code.trim()) return;
    onScan(code.trim().toUpperCase());
    setCode('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) { stop(); setCode(''); setError(null); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Validar voucher</DialogTitle></DialogHeader>
        <div className="flex gap-2 mb-3">
          <Button variant={mode === 'camera' ? 'default' : 'outline'} size="sm" onClick={() => setMode('camera')}>
            <Camera className="h-4 w-4 mr-1" />Câmera
          </Button>
          <Button variant={mode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => { stop(); setMode('manual'); }}>
            <Keyboard className="h-4 w-4 mr-1" />Manual
          </Button>
        </div>

        {mode === 'camera' ? (
          <div className="space-y-2">
            {error ? (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <VideoOff className="h-4 w-4" />{error}
              </div>
            ) : (
              <video ref={videoRef} className="w-full rounded-md bg-black aspect-square object-cover" playsInline muted />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Digite o código do voucher"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleManual()}
            />
            <Button className="w-full" onClick={handleManual} disabled={!code.trim()}>Validar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CashierQRScanner;

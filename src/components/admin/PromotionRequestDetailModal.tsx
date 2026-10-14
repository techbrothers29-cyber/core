import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

interface PromotionRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    title: string;
    description: string;
    created_at: string;
    priority: string;
    notes?: string;
    companyName?: string;
    requesterEmail?: string;
  } | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const PromotionRequestDetailModal = ({ isOpen, onClose, item, onApprove, onReject }: PromotionRequestDetailModalProps) => {
  if (!item) return null;

  // Parse notes to display in a structured way
  const notesLines = (item.notes || item.description || '').split('\n').filter(line => line.trim());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            📢 Detalhes da Solicitação de Promoção
          </DialogTitle>
          <DialogDescription>
            Solicitação enviada por {item.requesterEmail || 'parceiro'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Company & Meta */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-orange-100 text-orange-800 border-orange-200">Promoção</Badge>
            <Badge className={`${item.priority === 'high' ? 'bg-red-100 text-red-800' : item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
              {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
            </Badge>
          </div>

          {item.companyName && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Empresa:</span>
              <p className="text-base font-semibold text-foreground">{item.companyName}</p>
            </div>
          )}

          {/* Structured notes display */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <span className="text-sm font-medium text-muted-foreground mb-2 block">Detalhes da Solicitação:</span>
            {notesLines.map((line, i) => (
              <p key={i} className="text-sm text-foreground whitespace-pre-wrap">{line}</p>
            ))}
          </div>

          <div>
            <span className="text-xs text-muted-foreground">
              Enviado em: {new Date(item.created_at).toLocaleString('pt-BR')}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                onApprove(item.id);
                onClose();
              }}
            >
              <Check className="w-4 h-4 mr-2" />
              Aprovar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                onReject(item.id);
                onClose();
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Recusar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

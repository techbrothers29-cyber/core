import { CreditCard, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentMethod = 'pix' | 'credit_card';

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
}

const PaymentMethodSelector = ({ selected, onSelect, disabled }: PaymentMethodSelectorProps) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onSelect('pix')}
        disabled={disabled}
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
          selected === 'pix'
            ? "border-primary bg-primary/5 text-primary"
            : "border-border bg-card hover:border-primary/50 text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <QrCode className="w-6 h-6" />
        <span className="font-semibold text-sm">PIX</span>
        <span className="text-xs text-muted-foreground">Aprovação imediata</span>
      </button>

      <button
        type="button"
        onClick={() => onSelect('credit_card')}
        disabled={disabled}
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
          selected === 'credit_card'
            ? "border-primary bg-primary/5 text-primary"
            : "border-border bg-card hover:border-primary/50 text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <CreditCard className="w-6 h-6" />
        <span className="font-semibold text-sm">Cartão</span>
        <span className="text-xs text-muted-foreground">Crédito</span>
      </button>
    </div>
  );
};

export default PaymentMethodSelector;

import { ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const CartIcon = () => {
  let totalItems = 0;
  try {
    totalItems = useCart().totalItems;
  } catch {
    return null;
  }
  const navigate = useNavigate();
  const { user } = useAuth();

  // Hide cart for admin and affiliate users (they don't shop on the marketplace)
  if (user && (user.user_metadata?.role_type === 'admin' || user.user_metadata?.role_type === 'affiliate')) {
    return null;
  }

  const handleClick = () => {
    navigate('/checkout');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      aria-label="Abrir carrinho"
      className="relative hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
    >
      <ShoppingCart className="w-5 h-5" />
      {totalItems > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs p-0"
        >
          {totalItems > 99 ? '99+' : totalItems}
        </Badge>
      )}
    </Button>
  );
};

export default CartIcon;

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { User, ShoppingCart, CreditCard, MapPin, Phone, Mail, Calendar, Package, UserCheck } from 'lucide-react';

interface UserDetailsModalProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    created_at: string;
    is_active: boolean;
    role_type: string;
    status?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

interface UserDetails {
  profile: any;
  purchases: any[];
  cartItems: any[];
  totalSpent: number;
  totalPurchases: number;
  referrer: { full_name: string; affiliate_code: string } | null;
}

export const UserDetailsModal = ({ user, isOpen, onClose }: UserDetailsModalProps) => {
  const [userDetails, setUserDetails] = useState<UserDetails>({
    profile: null,
    purchases: [],
    cartItems: [],
    totalSpent: 0,
    totalPurchases: 0,
    referrer: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      loadUserDetails();
    }
  }, [user, isOpen]);

  const loadUserDetails = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let profile = null;
      let purchases: any[] = [];
      let cartItems: any[] = [];

      // Buscar perfil completo baseado no tipo de usuário
      if (user.role_type === 'partner') {
        const { data } = await supabase
          .from('companies')
          .select('id, name, trade_name, cnpj, email, phone, website, address, business_hours, description, logo_url, banner_url, is_active, is_verified, approval_status, commission_rate, category_id, created_at, updated_at')
          .eq('id', user.id)
          .single();
        profile = data;
      } else if (user.role_type === 'affiliate') {
        const { data } = await supabase
          .from('affiliates')
          .select('id, full_name, email, phone, cpf, affiliate_code, commission_rate, total_earnings, pending_earnings, total_conversions, total_clicks, status, is_active, approval_date, profile_image_url, address, created_at, updated_at')
          .eq('id', user.id)
          .single();
        profile = data;
      } else {
        const { data } = await supabase
          .from('users')
          .select('id, full_name, email, phone, cpf, address, birth_date, gender, is_active, role_type, profile_image_url, created_at, updated_at, referrer_affiliate_code')
          .eq('id', user.id)
          .single();
        profile = data;

        // Buscar compras do usuário (apenas para clientes)
        const { data: userVouchers } = await supabase
          .from('user_vouchers')
          .select(`
            *,
            offers (
              title,
              description,
              card_image_url,
              company_id,
              companies (
                name
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Compras de ingressos NovaXS/ParksNet
        const { data: ticketBookings } = await supabase
          .from('ticket_bookings')
          .select('id, products, establishment_name, total_price, currency, status, use_date, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const { data: transactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        // Buscar itens do carrinho
        const { data: cart } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Unificar vouchers e ingressos em uma única lista de compras
        const voucherPurchases = (userVouchers || []).map((v: any) => ({
          ...v,
          _kind: 'voucher' as const,
        }));
        const ticketPurchases = (ticketBookings || []).map((t: any) => ({
          id: t.id,
          _kind: 'ticket' as const,
          created_at: t.created_at,
          purchase_price: t.total_price || 0,
          status: t.status,
          ticket: t,
        }));
        purchases = [...voucherPurchases, ...ticketPurchases].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        cartItems = cart || [];
      }

      // Calcular estatísticas
      const totalSpent = purchases.reduce((sum, purchase) => sum + (purchase.purchase_price || 0), 0);
      const totalPurchases = purchases.length;

      // Buscar afiliado que indicou o usuário
      let referrer = null;
      if (profile?.referrer_affiliate_code) {
        const { data: referrerData } = await supabase
          .from('affiliates')
          .select('full_name, affiliate_code')
          .eq('affiliate_code', profile.referrer_affiliate_code)
          .maybeSingle();
        if (referrerData) {
          referrer = referrerData;
        }
      }

      setUserDetails({
        profile,
        purchases,
        cartItems,
        totalSpent,
        totalPurchases,
        referrer
      });
    } catch (error) {
      console.error('Erro ao carregar detalhes do usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getRoleTypeLabel = (roleType: string) => {
    switch (roleType) {
      case 'affiliate': return 'Afiliado';
      case 'partner': return 'Parceiro';
      case 'client': return 'Cliente';
      default: return 'Usuário';
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Detalhes do Usuário
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Nome Completo</p>
                    <p className="text-sm text-muted-foreground">{user.full_name}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Tipo de Usuário</p>
                    <Badge variant="outline">{getRoleTypeLabel(user.role_type)}</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      E-mail
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  {user.phone && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Telefone
                      </p>
                      <p className="text-sm text-muted-foreground">{user.phone}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Data de Cadastro
                    </p>
                    <p className="text-sm text-muted-foreground">{formatDate(user.created_at)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Status</p>
                    <Badge className={user.is_active ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  {userDetails.referrer && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        Indicado por
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {userDetails.referrer.full_name} ({userDetails.referrer.affiliate_code})
                      </p>
                    </div>
                  )}
                </div>

                {/* Informações adicionais baseadas no perfil */}
                {userDetails.profile && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userDetails.profile.cpf && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">CPF</p>
                          <p className="text-sm text-muted-foreground">{userDetails.profile.cpf}</p>
                        </div>
                      )}
                      {userDetails.profile.cnpj && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">CNPJ</p>
                          <p className="text-sm text-muted-foreground">{userDetails.profile.cnpj}</p>
                        </div>
                      )}
                      {userDetails.profile.address && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Endereço
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {typeof userDetails.profile.address === 'object'
                              ? JSON.stringify(userDetails.profile.address, null, 2)
                              : userDetails.profile.address
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tabs para Compras e Carrinho (apenas para clientes) */}
            {user.role_type !== 'partner' && user.role_type !== 'affiliate' && (
              <Tabs defaultValue="purchases" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="purchases">Compras</TabsTrigger>
                  <TabsTrigger value="cart">Carrinho</TabsTrigger>
                  <TabsTrigger value="stats">Estatísticas</TabsTrigger>
                </TabsList>

                <TabsContent value="purchases" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Histórico de Compras ({userDetails.purchases.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {userDetails.purchases.length > 0 ? (
                        <div className="space-y-4">
                          {userDetails.purchases.map((purchase) => (
                            <div key={purchase.id} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  {purchase._kind === 'ticket' ? (
                                    <>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-medium">{purchase.ticket.establishment_name || 'Ingresso'}</h4>
                                        <Badge variant="outline" className="text-xs">Ingresso</Badge>
                                      </div>
                                      <ul className="text-sm text-muted-foreground space-y-0.5">
                                        {(purchase.ticket.products || []).map((p: any, i: number) => (
                                          <li key={i}>
                                            {p.amount}x {p.title}
                                            {p.date ? ` — ${p.date}` : ''}
                                            {p.schedule ? ` às ${p.schedule}` : ''}
                                          </li>
                                        ))}
                                      </ul>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-medium">{purchase.offers?.title || 'Voucher'}</h4>
                                        <Badge variant="outline" className="text-xs">Voucher</Badge>
                                      </div>
                                      {purchase.offers?.companies?.name && (
                                        <p className="text-sm font-medium text-muted-foreground">
                                          {purchase.offers.companies.name}
                                        </p>
                                      )}
                                    </>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    Comprado em {formatDate(purchase.created_at)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{formatCurrency(purchase.purchase_price)}</p>
                                  <Badge variant={purchase.status === 'active' || purchase.status === 'paid' ? 'default' : 'secondary'}>
                                    {purchase.status === 'active' ? 'Ativo' : purchase.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhuma compra realizada
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="cart" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Itens no Carrinho ({userDetails.cartItems.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {userDetails.cartItems.length > 0 ? (
                        <div className="space-y-4">
                          {userDetails.cartItems.map((item) => (
                            <div key={item.id} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <h4 className="font-medium">{item.title}</h4>
                                  {item.metadata?.establishmentName && (
                                    <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                                      <MapPin className="w-3 h-3" />
                                      {item.metadata.establishmentName}
                                    </div>
                                  )}
                                  <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                                  {item.metadata?.productId && (
                                    <p className="text-xs text-muted-foreground">
                                      Produto: {String(item.metadata.productId).replace('products/', '')}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    Adicionado em {formatDate(item.created_at)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{formatCurrency(item.price)}</p>
                                  <p className="text-sm text-muted-foreground">Qtd: {item.quantity}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          Carrinho vazio
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="stats" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Total Gasto
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(userDetails.totalSpent)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Total de Compras
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-primary">
                          {userDetails.totalPurchases}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useNovaxsEstablishments } from '@/hooks/useNovaxsEstablishments';
import { Search, Package, Store, Loader2, Ticket, Clock, Users, MapPin } from 'lucide-react';
import type { Establishment, NovaxsProduct } from '@/data/novaxs-establishments';
import { classifyEstablishment } from '@/data/novaxs-establishments';

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const CategoryBadge = ({ category }: { category: string }) => {
  const colors: Record<string, string> = {
    entretenimento: 'bg-blue-100 text-blue-800 border-blue-200',
    restaurante: 'bg-orange-100 text-orange-800 border-orange-200',
    servicos: 'bg-purple-100 text-purple-800 border-purple-200',
  };
  const labels: Record<string, string> = {
    entretenimento: 'Entretenimento',
    restaurante: 'Restaurante',
    servicos: 'Serviços',
  };
  return (
    <Badge variant="outline" className={colors[category] || ''}>
      {labels[category] || category}
    </Badge>
  );
};

const ProductRow = ({ product }: { product: NovaxsProduct }) => {
  const hasSchedules = product.schedules && product.schedules.length > 0;
  const hasSubProducts = product.products && product.products.length > 0;

  return (
    <div className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Image */}
        <div className="w-full sm:w-20 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Ticket className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
              <p className="text-xs text-muted-foreground">ID: {product.id} • Tipo: {product.type || 'N/A'}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-sm text-green-600">{formatCurrency(product.priceCents)}</p>
              {product.oldValue && product.oldValue > product.priceCents && (
                <p className="text-xs text-muted-foreground line-through">{formatCurrency(product.oldValue)}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {hasSchedules && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                <Clock className="w-3 h-3 mr-1" />
                {product.schedules.length} horários
              </Badge>
            )}
            {hasSubProducts && (
              <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                <Package className="w-3 h-3 mr-1" />
                Combo ({product.products!.length} itens)
              </Badge>
            )}
            {product.available > 0 && product.available < 2147483647 && (
              <Badge variant="outline" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {product.available} disponíveis
              </Badge>
            )}
            {product.available >= 2147483647 && (
              <Badge variant="outline" className="text-xs text-green-600">
                ✓ Ilimitado
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const NovaxsProductsSection = () => {
  const { establishments, allProducts, loading, error } = useNovaxsEstablishments();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredEstablishments = useMemo(() => {
    return establishments.filter(est => {
      const matchesSearch = !searchTerm ||
        est.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.products.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || est.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [establishments, searchTerm, categoryFilter]);

  const stats = useMemo(() => ({
    totalEstablishments: establishments.length,
    totalProducts: allProducts.length,
    entertainment: establishments.filter(e => e.category === 'entretenimento').length,
    restaurants: establishments.filter(e => e.category === 'restaurante').length,
    services: establishments.filter(e => e.category === 'servicos').length,
  }), [establishments, allProducts]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando produtos NovaXS/ParksNet...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-8 text-center">
          <p className="text-destructive font-medium">Erro ao carregar produtos NovaXS</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200/50 bg-gradient-to-br from-blue-50/30 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-blue-600" />
          Produtos NovaXS / ParksNet
        </CardTitle>
        <CardDescription>
          Estabelecimentos e produtos integrados em tempo real via API NovaXS
        </CardDescription>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
          <div className="bg-background rounded-lg p-2 text-center border">
            <p className="text-lg font-bold text-foreground">{stats.totalEstablishments}</p>
            <p className="text-xs text-muted-foreground">Estabelecimentos</p>
          </div>
          <div className="bg-background rounded-lg p-2 text-center border">
            <p className="text-lg font-bold text-foreground">{stats.totalProducts}</p>
            <p className="text-xs text-muted-foreground">Produtos</p>
          </div>
          <div className="bg-background rounded-lg p-2 text-center border">
            <p className="text-lg font-bold text-blue-600">{stats.entertainment}</p>
            <p className="text-xs text-muted-foreground">Entretenimento</p>
          </div>
          <div className="bg-background rounded-lg p-2 text-center border">
            <p className="text-lg font-bold text-orange-600">{stats.restaurants}</p>
            <p className="text-xs text-muted-foreground">Restaurantes</p>
          </div>
          <div className="bg-background rounded-lg p-2 text-center border">
            <p className="text-lg font-bold text-purple-600">{stats.services}</p>
            <p className="text-xs text-muted-foreground">Serviços</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar estabelecimento ou produto..."
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              <SelectItem value="entretenimento">Entretenimento</SelectItem>
              <SelectItem value="restaurante">Restaurantes</SelectItem>
              <SelectItem value="servicos">Serviços</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Establishments accordion */}
        {filteredEstablishments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum estabelecimento encontrado.
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {filteredEstablishments.map((est) => (
              <AccordionItem key={est.id} value={est.id} className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    {/* Establishment image */}
                    <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {est.image ? (
                        <img src={est.image} alt={est.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Store className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{est.name}</h4>
                        <CategoryBadge category={est.category} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{est.productCount} produto{est.productCount !== 1 ? 's' : ''}</span>
                        {est.minPrice > 0 && (
                          <span>A partir de {formatCurrency(est.minPrice)}</span>
                        )}
                        <span>⭐ {est.rating}</span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {est.products
                      .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((product) => (
                        <ProductRow key={product.id || product.path} product={product} />
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

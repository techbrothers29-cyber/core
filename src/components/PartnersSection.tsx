import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { ShoppingCart } from "lucide-react";
import type { CarouselApi } from "@/components/ui/carousel";
import PartnerDetailModal from "./PartnerDetailModal";
import { supabase } from "@/integrations/supabase/client";
import { useCarouselTouchPause } from "@/hooks/useCarouselTouchPause";
import { CarouselSkeletonLoader } from "@/components/ui/offer-skeleton";

interface PartnerData {
  id: string;
  name: string;
  trade_name?: string;
  logo_url?: string;
  description?: string;
  phone?: string;
  website?: string;
  address?: any;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

const PartnersSection = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();

  useCarouselTouchPause({ api, interval: 3000 });

  // Load partners from companies database
  useEffect(() => {
    const loadPartnersData = async () => {
      try {
        // Public directory: only fetch non-sensitive columns. Sensitive fields like
        // phone, email, cnpj are restricted at the column-grant level for anon users.
        const { data: tblData, error: tblError } = await supabase
          .from('companies')
          .select('id,name,trade_name,logo_url,description,website,address,is_active,is_verified,created_at')
          .eq('is_active', true)
          .eq('is_verified', true)
          .eq('approval_status', 'approved')
          .order('created_at', { ascending: false });
        if (tblError) throw tblError;
        const rawPartners = tblData || [];

        // Map the data to the expected format
        const mappedPartners: PartnerData[] = rawPartners.map((partner: any) => ({
          id: partner.id,
          name: partner.name,
          trade_name: partner.trade_name,
          logo_url: partner.logo_url,
          description: partner.description,
          phone: undefined,
          website: partner.website,
          address: partner.address,
          is_active: true,
          is_verified: true,
          created_at: partner.created_at
        }));

        setPartners(mappedPartners);
      } catch (error) {
        console.error('Erro ao carregar parceiros:', error);
      }
    };

    loadPartnersData();

    // Set up real-time subscription
    const channel = supabase
      .channel('companies-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'companies'
      }, loadPartnersData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const handlePartnerClick = (partner: PartnerData) => {
    // Convert to expected format for modal
    const addressString = typeof partner.address === 'string'
      ? partner.address
      : partner.address?.street || 'Endereço não informado';

    const partnerForModal = {
      name: partner.trade_name || partner.name,
      rating: 4.5,
      reviewCount: 100,
      address: addressString,
      phone: partner.phone || 'Telefone não informado',
      website: partner.website || '',
      description: partner.description || 'Descrição não disponível',
      discountPercent: 15,
      logo: partner.logo_url || '/placeholder-partner.jpg'
    };
    setSelectedPartner(partnerForModal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPartner(null);
  };
  if (partners.length === 0) {
    return (
      <section className="py-8 bg-card/30 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Nossos <span className="text-primary">Parceiros</span>
            </h2>
          </div>
          <div className="max-w-6xl mx-auto">
            <CarouselSkeletonLoader type="partner" />
          </div>
        </div>
      </section>
    );
  }
  return <section className="py-8 bg-card/30 relative overflow-hidden">
      {/* Enhanced decorative background elements */}
      <div className="absolute top-10 left-10 w-20 h-20 md:w-32 md:h-32 bg-gradient-to-br from-primary/15 to-transparent rounded-xl blur-md animate-pulse" />
      <div className="absolute bottom-20 right-10 w-16 h-16 md:w-24 md:h-24 bg-gradient-to-tl from-secondary/12 to-transparent rounded-full blur-sm animate-pulse delay-700" />
      <div className="absolute top-1/2 left-1/4 w-2 h-16 md:h-24 bg-gradient-to-b from-transparent via-primary/8 to-transparent animate-pulse delay-1200" />
      <div className="absolute top-1/3 right-1/4 w-6 h-6 md:w-10 md:h-10 bg-accent/20 rounded-full blur-sm animate-pulse delay-300" />
      <div className="absolute top-24 right-1/3 w-4 h-4 md:w-6 md:h-6 border border-primary/15 rounded-lg animate-pulse delay-800" />
      <div className="absolute bottom-8 left-1/3 w-14 h-14 md:w-18 md:h-18 bg-gradient-to-br from-red-500/10 to-transparent rounded-2xl blur-lg animate-pulse delay-400" />
      <div className="absolute top-8 right-8 w-1 h-20 md:h-28 bg-gradient-to-b from-transparent via-accent/6 to-transparent animate-pulse delay-1000" />
      <div className="absolute bottom-32 left-8 w-8 h-2 bg-gradient-to-r from-transparent via-secondary/8 to-transparent rotate-45 animate-pulse delay-1400" />

      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" itemScope itemType="https://schema.org/Organization">
            Nossos <span className="text-primary">Parceiros</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Descubra estabelecimentos únicos com ofertas exclusivas
          </p>
        </div>

        {partners.length === 0 ? <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Nenhuma empresa cadastrada encontrada.
            </p>
          </div> : <div><Carousel setApi={setApi} className="w-full max-w-6xl mx-auto" opts={{
        align: "start",
        loop: true
      }}>
            <CarouselContent className="-ml-2 md:-ml-4">
              {partners.map((partner, index) => <CarouselItem key={partner.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4">
                <Card className="group border-0 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 overflow-hidden cursor-pointer" onClick={() => handlePartnerClick(partner)}>
                  <CardContent className="p-0 relative">
                    <div className="aspect-square overflow-hidden relative bg-white flex items-center justify-center">
                      <img
                        src={partner.logo_url || '/placeholder-partner.jpg'}
                        alt={`Logo de ${partner.trade_name || partner.name}`}
                        className="w-full h-full object-contain p-4 transition-all duration-500 group-hover:scale-110"
                      />
                      <div className="absolute -inset-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="font-bold text-white text-lg mb-3 line-clamp-2 drop-shadow-lg">
                          {partner.trade_name || partner.name}
                        </h3>
                        {user && user.user_metadata?.role_type !== 'admin' && (
                          <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300" onClick={e => {
                        e.stopPropagation();
                        if (!user) {
                          navigate('/auth');
                          return;
                        }
                        // Adicionar parceiro ao carrinho
                        addItem({
                          id: `partner-${partner.id}`,
                          title: `Oferta ${partner.trade_name || partner.name}`,
                          subtitle: `Desconto especial em ${partner.trade_name || partner.name}`,
                          price: 50.00,
                          originalPrice: 58.82,
                          discountPercent: 15,
                          imageUrl: partner.logo_url || '/placeholder-partner.jpg',
                          category: "Parceiros"
                        });
                      }}>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Comprar
                          </Button>
                        )}
                        {user && user.user_metadata?.role_type === 'admin' && (
                          <div className="w-full p-2 text-center text-white/70 text-sm bg-white/10 rounded-lg backdrop-blur-sm">
                            Admin - Apenas visualização
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
                  </CardContent>
                </Card>
              </CarouselItem>)}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel></div>}

        {/* Partner Detail Modal */}
        {selectedPartner && <PartnerDetailModal isOpen={isModalOpen} onClose={handleCloseModal} partner={selectedPartner} />}
      </div>
    </section>;
};
export default PartnersSection;
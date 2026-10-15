import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { AffiliateAuthProvider } from "@/hooks/useAffiliateAuth";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";
import { PartnerAuthProvider } from "@/hooks/usePartnerAuth";
import { RoleGuard } from "@/components/RoleGuard";
import { AdminGuard } from "@/components/AdminGuard";
import PrivacyBanner from "@/components/PrivacyBanner";
import ReferralTracker from "@/components/ReferralTracker";
import RouteNoIndex from "@/components/RouteNoIndex";

import PWAInstallBanner from "@/components/PWAInstallBanner";
import FloatingCartButton from "@/components/FloatingCartButton";
import FloatingDateButton from "@/components/FloatingDateButton";
import { PushSubscriptionProvider } from "@/components/PushSubscriptionProvider";
import ProfileCompletionGuard from "@/components/ProfileCompletionGuard";
import PublicHeaderLayout from "@/components/layouts/PublicHeaderLayout";
import Index from "./pages/Index";

const LoginTypeSelector = lazy(() => import("@/components/LoginTypeSelector"));
const AdminAuth = lazy(() => import("./pages/AdminAuth"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AuthRedirect = lazy(() => import("./pages/AuthRedirect"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AffiliateAuth = lazy(() => import("./pages/AffiliateAuth"));
const AffiliatePanel = lazy(() => import("./pages/AffiliatePanel"));
const AffiliateProgramInfo = lazy(() => import("./pages/AffiliateProgramInfo"));
const PartnerLogin = lazy(() => import("./pages/PartnerLogin"));
const PartnerPanel = lazy(() => import("./pages/PartnerPanel"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CookiesConfig = lazy(() => import("./pages/CookiesConfig"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CompanyOffers = lazy(() => import("./pages/CompanyOffers"));
const Hospedagem = lazy(() => import("./pages/Hospedagem"));
const HotelCheckout = lazy(() => import("./pages/HotelCheckout"));
const HotelConfirmacao = lazy(() => import("./pages/HotelConfirmacao"));
const MinhasReservas = lazy(() => import("./pages/MinhasReservas"));
const Reservas = lazy(() => import("./pages/Reservas"));
const Favoritos = lazy(() => import("./pages/Favoritos"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Estabelecimento = lazy(() => import("./pages/Estabelecimento"));
const HospedagemHotel = lazy(() => import("./pages/HospedagemHotel"));
const Entretenimento = lazy(() => import("./pages/Entretenimento"));
const Restaurantes = lazy(() => import("./pages/Restaurantes"));
const Servicos = lazy(() => import("./pages/Servicos"));
const Carros = lazy(() => import("./pages/Carros"));
const CashierLogin = lazy(() => import("./pages/CashierLogin"));
const CashierPanel = lazy(() => import("./pages/CashierPanel"));
const CityLanding = lazy(() => import("./pages/cities/CityLanding"));
const HotelDetalhe = lazy(() => import("./pages/HotelDetalhe"));
const OfertaDetalhe = lazy(() => import("./pages/OfertaDetalhe"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 24 * 60 * 60_000, // 24h — needed for persistence to be useful
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const localStoragePersister =
  typeof window !== "undefined"
    ? createSyncStoragePersister({
        storage: window.localStorage,
        key: "bah-react-query-cache",
        throttleTime: 1000,
      })
    : undefined;

const LazyFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister: localStoragePersister!,
      maxAge: 24 * 60 * 60_000,
      buster: "novaxs-product-names-v8",
      dehydrateOptions: {
        // Only persist successful, durable queries — skip auth/session-scoped data.
        shouldDehydrateQuery: (q) => {
          if (q.state.status !== "success") return false;
          const key = Array.isArray(q.queryKey) ? String(q.queryKey[0] ?? "") : "";
          // Persist public catalog data that powers the carousels.
          return (
            key.startsWith("novaxs-") ||
            key.startsWith("bahofertas-") ||
            key === "promo-banner" ||
            key === "banner-slides" ||
            key === "carousel-settings" ||
            key === "categories"
          );
        },
      },
    }}
  >
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ProfileCompletionGuard>
              <Suspense fallback={<LazyFallback />}>
                <Routes>
                  <Route element={<PublicHeaderLayout />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/parceiro/:companyId/ofertas" element={<CompanyOffers />} />
                    <Route path="/hospedagem" element={<Hospedagem />} />
                    <Route path="/hospedagem/hotel/:hid/:slug" element={<HotelDetalhe />} />
                    <Route path="/hospedagem/h/:hotelId/:slug" element={<HospedagemHotel />} />
                    <Route path="/hospedagem/h/:hotelId" element={<HospedagemHotel />} />
                    <Route path="/oferta/:id/:slug" element={<OfertaDetalhe />} />
                    <Route path="/oferta/:id" element={<OfertaDetalhe />} />
                    <Route path="/estabelecimento/:name" element={<Estabelecimento />} />
                    <Route path="/entretenimento" element={<Entretenimento />} />
                    <Route path="/favoritos" element={<Favoritos />} />
                    <Route path="/restaurantes" element={<Restaurantes />} />
                    <Route path="/servicos" element={<Servicos />} />
                    <Route path="/carros" element={<Carros />} />

                    {/* Landing pages SEO — Serra Gaúcha */}
                    <Route path="/hoteis-em-gramado" element={<CityLanding citySlug="gramado" category="hoteis" path="/hoteis-em-gramado" />} />
                    <Route path="/hoteis-em-canela" element={<CityLanding citySlug="canela" category="hoteis" path="/hoteis-em-canela" />} />
                    <Route path="/hoteis-em-bento-goncalves" element={<CityLanding citySlug="bento-goncalves" category="hoteis" path="/hoteis-em-bento-goncalves" />} />
                    <Route path="/hoteis-na-serra-gaucha" element={<CityLanding citySlug="gramado" category="hoteis" path="/hoteis-na-serra-gaucha" />} />
                    <Route path="/pousadas-em-gramado" element={<CityLanding citySlug="gramado" category="pousadas" path="/pousadas-em-gramado" />} />
                    <Route path="/pousadas-em-canela" element={<CityLanding citySlug="canela" category="pousadas" path="/pousadas-em-canela" />} />
                    <Route path="/hoteis-baratos-em-gramado" element={<CityLanding citySlug="gramado" category="hoteis-baratos" path="/hoteis-baratos-em-gramado" />} />
                    <Route path="/ofertas-em-gramado" element={<CityLanding citySlug="gramado" category="ofertas" path="/ofertas-em-gramado" />} />
                    <Route path="/ofertas-em-canela" element={<CityLanding citySlug="canela" category="ofertas" path="/ofertas-em-canela" />} />
                    <Route path="/passeios-em-gramado" element={<CityLanding citySlug="gramado" category="passeios" path="/passeios-em-gramado" />} />
                    <Route path="/passeios-em-canela" element={<CityLanding citySlug="canela" category="passeios" path="/passeios-em-canela" />} />
                    <Route path="/restaurantes-em-gramado" element={<CityLanding citySlug="gramado" category="restaurantes" path="/restaurantes-em-gramado" />} />

                    {/* LPs temáticas — alta intenção de busca */}
                    <Route path="/fondue-em-gramado" element={<CityLanding citySlug="gramado" category="restaurantes" path="/fondue-em-gramado" />} />
                    <Route path="/cafe-colonial-em-gramado" element={<CityLanding citySlug="gramado" category="restaurantes" path="/cafe-colonial-em-gramado" />} />
                    <Route path="/rodizio-em-gramado" element={<CityLanding citySlug="gramado" category="restaurantes" path="/rodizio-em-gramado" />} />
                    <Route path="/ingressos-snowland" element={<CityLanding citySlug="gramado" category="passeios" path="/ingressos-snowland" />} />
                    <Route path="/ingressos-mini-mundo" element={<CityLanding citySlug="gramado" category="passeios" path="/ingressos-mini-mundo" />} />
                    <Route path="/ingressos-dreamland" element={<CityLanding citySlug="gramado" category="passeios" path="/ingressos-dreamland" />} />
                    <Route path="/ingressos-gramadozoo" element={<CityLanding citySlug="gramado" category="passeios" path="/ingressos-gramadozoo" />} />
                    <Route path="/ingressos-acquamotion" element={<CityLanding citySlug="gramado" category="passeios" path="/ingressos-acquamotion" />} />
                    <Route path="/ingressos-alpen-park" element={<CityLanding citySlug="canela" category="passeios" path="/ingressos-alpen-park" />} />
                    <Route path="/ingressos-parque-do-caracol" element={<CityLanding citySlug="canela" category="passeios" path="/ingressos-parque-do-caracol" />} />
                    <Route path="/natal-luz-gramado" element={<CityLanding citySlug="gramado" category="passeios" path="/natal-luz-gramado" />} />
                    <Route path="/hoteis-com-piscina-em-gramado" element={<CityLanding citySlug="gramado" category="hoteis" path="/hoteis-com-piscina-em-gramado" />} />
                    <Route path="/hoteis-pet-friendly-em-gramado" element={<CityLanding citySlug="gramado" category="hoteis" path="/hoteis-pet-friendly-em-gramado" />} />

                    {/* Cidades novas — Serra Gaúcha expandida */}
                    <Route path="/hoteis-em-nova-petropolis" element={<CityLanding citySlug="nova-petropolis" category="hoteis" path="/hoteis-em-nova-petropolis" />} />
                    <Route path="/hoteis-em-sao-francisco-de-paula" element={<CityLanding citySlug="sao-francisco-de-paula" category="hoteis" path="/hoteis-em-sao-francisco-de-paula" />} />
                    <Route path="/hoteis-em-garibaldi" element={<CityLanding citySlug="garibaldi" category="hoteis" path="/hoteis-em-garibaldi" />} />
                    <Route path="/hoteis-em-farroupilha" element={<CityLanding citySlug="farroupilha" category="hoteis" path="/hoteis-em-farroupilha" />} />
                    <Route path="/passeios-em-nova-petropolis" element={<CityLanding citySlug="nova-petropolis" category="passeios" path="/passeios-em-nova-petropolis" />} />
                    <Route path="/passeios-em-sao-francisco-de-paula" element={<CityLanding citySlug="sao-francisco-de-paula" category="passeios" path="/passeios-em-sao-francisco-de-paula" />} />
                    <Route path="/passeios-em-bento-goncalves" element={<CityLanding citySlug="bento-goncalves" category="passeios" path="/passeios-em-bento-goncalves" />} />
                    <Route path="/restaurantes-em-canela" element={<CityLanding citySlug="canela" category="restaurantes" path="/restaurantes-em-canela" />} />
                    <Route path="/restaurantes-em-bento-goncalves" element={<CityLanding citySlug="bento-goncalves" category="restaurantes" path="/restaurantes-em-bento-goncalves" />} />
                    <Route path="/o-que-fazer-em-gramado" element={<CityLanding citySlug="gramado" category="passeios" path="/o-que-fazer-em-gramado" />} />
                    <Route path="/o-que-fazer-em-canela" element={<CityLanding citySlug="canela" category="passeios" path="/o-que-fazer-em-canela" />} />
                    <Route path="/o-que-fazer-em-bento-goncalves" element={<CityLanding citySlug="bento-goncalves" category="passeios" path="/o-que-fazer-em-bento-goncalves" />} />
                    <Route path="/vinicolas-em-bento-goncalves" element={<CityLanding citySlug="bento-goncalves" category="passeios" path="/vinicolas-em-bento-goncalves" />} />
                    <Route path="/canion-itaimbezinho" element={<CityLanding citySlug="sao-francisco-de-paula" category="passeios" path="/canion-itaimbezinho" />} />
                  </Route>
                  <Route path="/login" element={<LoginTypeSelector />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/auth-redirect" element={<AuthRedirect />} />
                  <Route path="/completar-cadastro" element={<CompleteProfile />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/reservas" element={<Reservas />} />
                  <Route
                    path="/dashboard"
                    element={
                      <RoleGuard allowedRoles={['user', 'client']}>
                        <Dashboard />
                      </RoleGuard>
                    }
                  />
                  <Route path="/programa-afiliados" element={<AffiliateProgramInfo />} />
                  <Route path="/afiliado/auth" element={
                    <AffiliateAuthProvider>
                      <AffiliateAuth />
                    </AffiliateAuthProvider>
                  } />
                  <Route path="/afiliado/painel" element={
                    <AffiliateAuthProvider>
                      <RoleGuard allowedRoles={['affiliate']} fallbackRoute="/afiliado/auth">
                        <AffiliatePanel />
                      </RoleGuard>
                    </AffiliateAuthProvider>
                  } />
                  <Route path="/admin/login" element={
                    <AdminAuthProvider>
                      <AdminAuth />
                    </AdminAuthProvider>
                  } />
                  <Route path="/admin/dashboard" element={
                    <AdminAuthProvider>
                      <AdminGuard>
                        <RoleGuard allowedRoles={['admin']}>
                          <AdminDashboard />
                        </RoleGuard>
                      </AdminGuard>
                    </AdminAuthProvider>
                  } />
                  <Route path="/parceiro/login" element={
                    <PartnerAuthProvider>
                      <PartnerLogin />
                    </PartnerAuthProvider>
                  } />
                  <Route path="/parceiro/painel" element={
                    <PartnerAuthProvider>
                      <RoleGuard allowedRoles={['partner']}>
                        <PartnerPanel />
                      </RoleGuard>
                    </PartnerAuthProvider>
                  } />
                  <Route path="/cookies-config" element={<CookiesConfig />} />
                  <Route path="/termos" element={<TermsOfUse />} />
                  <Route path="/privacidade" element={<PrivacyPolicy />} />
                  <Route path="/hospedagem/checkout" element={<HotelCheckout />} />
                  <Route path="/hospedagem/confirmacao" element={<HotelConfirmacao />} />
                  <Route path="/hospedagem/reservas" element={<MinhasReservas />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route path="/caixa/login" element={<CashierLogin />} />
                  <Route path="/caixa/painel" element={<CashierPanel />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ProfileCompletionGuard>
            <RouteNoIndex />
            <ReferralTracker />

            <PrivacyBanner />
            <PWAInstallBanner />
            <FloatingDateButton />
            <FloatingCartButton />
            <PushSubscriptionProvider>{null}</PushSubscriptionProvider>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;

import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import HomePlaceCard from "@/components/home/HomePlaceCard";
import HomeBottomNav from "@/components/home/HomeBottomNav";
import { HOME_CONTAINER } from "@/components/home/layout";
import { useFavorites } from "@/hooks/useFavorites";

/** Lista de favoritos salvos neste aparelho (coração dos cards da Home). */
const Favoritos = () => {
  const { items } = useFavorites();

  return (
    <div className="min-h-screen bg-background font-jakarta">
      <SEOHead title="Favoritos | Bah Ofertas" description="Seus lugares salvos no Bah Ofertas." canonical="/favoritos" noindex />
      <main className={`${HOME_CONTAINER} pt-6 md:pt-10 pb-10`}>
        <h1 className="m-0 text-2xl md:text-[32px] font-extrabold tracking-tight text-foreground">Favoritos</h1>
        <p className="m-0 mt-1 text-sm text-muted-foreground">
          {items.length > 0
            ? `${items.length} ${items.length === 1 ? "lugar salvo" : "lugares salvos"} neste aparelho`
            : "Salvos neste aparelho"}
        </p>

        {items.length === 0 ? (
          <div className="mt-10 md:mt-16 max-w-md mx-auto text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Heart className="w-6 h-6 text-foreground" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h2 className="m-0 mt-4 text-lg font-semibold text-foreground">Nenhum favorito ainda</h2>
            <p className="m-0 mt-1 text-sm text-muted-foreground">
              Toque no coração de um parque, restaurante ou oferta para guardar aqui.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center mt-6 h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-[15px] hover:bg-primary/90 transition-colors"
            >
              Explorar ofertas
            </Link>
          </div>
        ) : (
          <ul className="m-0 mt-6 p-0 list-none grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-6 md:gap-x-5 md:gap-y-8">
            {items.map((item) => (
              <li key={item.key}>
                <HomePlaceCard
                  favKey={item.key}
                  title={item.title}
                  image={item.image}
                  path={item.path}
                  rating={item.rating}
                  subtitle={item.subtitle}
                  price={item.priceLabel?.replace(/^A partir de /, "")}
                  fromLabel={!!item.priceLabel?.startsWith("A partir de ")}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
      <HomeBottomNav />
    </div>
  );
};

export default Favoritos;

import { memo } from "react";
import type { Establishment, OfferProduct } from "@/data/novaxs-establishments";
import { prefetchEstabelecimento } from "@/lib/route-prefetch";
import { establishmentPath } from "@/lib/establishment-slug";
import HomePlaceCard from "@/components/home/HomePlaceCard";

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Card de estabelecimento da Home (visual novo).
 * Preço, preço antigo, destino e pré-carregamento seguem exatamente a mesma regra
 * de EstablishmentCard/EstablishmentCardCompact (que continuam intactos nas demais páginas).
 */
export const HomeEstablishmentCard = memo(({ establishment }: { establishment: Establishment }) => {
  const { id, name, displayName, image, rating, minPrice, minPriceOldValue, productCount, category, partnerType, companyId } = establishment;
  const label = displayName || name;
  const fillExistingPhoto = companyId === "93e66d28-2de1-45a3-b4c5-8c9aeb50f027";
  const isAcquamotion = label.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes("acquamotion");
  const displayPrice = minPrice > 0 ? minPrice : (isAcquamotion ? 12950 : 0);
  const price = displayPrice > 0 ? brl(displayPrice) : undefined;
  const oldPrice = minPriceOldValue && minPriceOldValue > displayPrice && displayPrice > 0 ? brl(minPriceOldValue) : null;
  const targetPath = partnerType === "bahofertas" && companyId
    ? `/parceiro/${companyId}/ofertas`
    : establishmentPath(displayName || name);
  const options = productCount > 0 ? ` · ${productCount} ${productCount === 1 ? "opção" : "opções"}` : "";

  return (
    <HomePlaceCard
      favKey={`est:${id}`}
      title={label}
      image={image}
      path={targetPath}
      rating={rating}
      subtitle={`Serra Gaúcha${options}`}
      tag={category === "entretenimento" ? "Entretenimento" : "Gastronomia"}
      price={price}
      oldPrice={oldPrice}
      onPrefetch={partnerType === "bahofertas" ? undefined : prefetchEstabelecimento}
      forceCover={fillExistingPhoto}
      imageClassName={fillExistingPhoto ? "object-[center_42%]" : undefined}
    />
  );
});
HomeEstablishmentCard.displayName = "HomeEstablishmentCard";

/**
 * Card de produto em oferta da Home (visual novo).
 * Mesmo destino de OfferProductCard/OfferProductCardCompact.
 */
export const HomeOfferCard = memo(({ offer }: { offer: OfferProduct }) => {
  const targetPath = offer.partnerType === "bahofertas" && offer.companyId
    ? `/parceiro/${offer.companyId}/ofertas`
    : establishmentPath(offer.establishmentName);
  const price = offer.price > 0 ? brl(offer.price) : undefined;
  const oldPrice = offer.oldPrice > offer.price && offer.price > 0 ? brl(offer.oldPrice) : null;

  return (
    <HomePlaceCard
      favKey={`offer:${offer.id}`}
      title={offer.name}
      image={offer.image}
      path={targetPath}
      rating={offer.rating}
      subtitle={offer.establishmentName}
      tag={offer.discountPercent > 0 ? `-${offer.discountPercent}%` : offer.type || undefined}
      tagTone={offer.discountPercent > 0 ? "brand" : "neutral"}
      price={price}
      oldPrice={oldPrice}
      fromLabel={false}
      onPrefetch={offer.partnerType === "bahofertas" ? undefined : prefetchEstabelecimento}
    />
  );
});
HomeOfferCard.displayName = "HomeOfferCard";

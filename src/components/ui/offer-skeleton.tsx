import { Skeleton } from "@/components/ui/skeleton";

const OfferCardSkeleton = () => {
  return (
    <div className="relative bg-card rounded-xl overflow-hidden shadow-lg">
      {/* Image skeleton with shimmer effect */}
      <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-r from-muted via-muted/50 to-muted animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4 bg-muted" />
        <Skeleton className="h-3 w-1/2 bg-muted/70" />

        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-5 w-16 bg-primary/20" />
          <Skeleton className="h-4 w-12 bg-muted/50" />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            <Skeleton className="h-4 w-4 rounded-full bg-yellow-400/30" />
            <Skeleton className="h-3 w-8 bg-muted/50" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg bg-primary/20" />
        </div>
      </div>

      {/* Discount badge skeleton */}
      <div className="absolute top-3 left-3">
        <Skeleton className="h-6 w-14 rounded-full bg-primary/30" />
      </div>
    </div>
  );
};

const PartnerCardSkeleton = () => {
  return (
    <div className="relative bg-card rounded-xl overflow-hidden shadow-lg">
      <div className="aspect-square relative overflow-hidden bg-gradient-to-r from-muted via-muted/50 to-muted animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <Skeleton className="h-5 w-3/4 bg-white/20 mb-3" />
        <Skeleton className="h-8 w-full rounded-lg bg-white/20" />
      </div>
    </div>
  );
};

const CarouselSkeletonLoader = ({
  type = "offer"
}: {
  type?: "offer" | "partner"
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={index}
          className={index < 2 ? "" : index < 3 ? "hidden sm:block" : index < 4 ? "hidden md:block" : index < 5 ? "hidden lg:block" : "hidden xl:block"}
          style={{ animationDelay: `${index * 80}ms` }}
        >
          {type === "offer" ? <OfferCardSkeleton /> : <PartnerCardSkeleton />}
        </div>
      ))}
    </div>
  );
};

export { OfferCardSkeleton, PartnerCardSkeleton, CarouselSkeletonLoader };

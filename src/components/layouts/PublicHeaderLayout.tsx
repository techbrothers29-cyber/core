import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import WelcomeDiscountModal from "@/components/WelcomeDiscountModal";
import { Suspense } from "react";
import { Outlet } from "react-router-dom";

const PublicRouteFallback = () => (
  <div className="min-h-[40vh] bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const PublicHeaderLayout = () => {
  return (
    <>
      <Header />
      <PageTransition>
        <Suspense fallback={<PublicRouteFallback />}>
          <Outlet />
        </Suspense>
      </PageTransition>
      <WelcomeDiscountModal />
    </>
  );
};

export default PublicHeaderLayout;

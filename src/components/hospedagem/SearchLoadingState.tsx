import React, { useEffect, useState } from "react";
import { Hotel as HotelIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const STEPS = [
  { at: 0, label: "Conectando aos parceiros de hospedagem..." },
  { at: 15, label: "Consultando disponibilidade em tempo real..." },
  { at: 35, label: "Comparando preços e tarifas exclusivas..." },
  { at: 60, label: "Buscando os melhores quartos para você..." },
  { at: 80, label: "Organizando os resultados..." },
  { at: 95, label: "Finalizando, quase pronto..." },
];

/** Esqueleto no mesmo formato do HotelResultCard (foto em cima no celular, ao lado no desktop). */
const CardSkeleton = () => (
  <li className="flex flex-col md:flex-row md:gap-4 md:rounded-2xl md:border md:border-[#ebebeb] md:p-3">
    <Skeleton className="h-[230px] w-full shrink-0 rounded-2xl md:h-[160px] md:w-[240px]" />
    <div className="mt-3 flex-1 space-y-2.5 md:mt-1">
      <Skeleton className="h-4 w-3/4 md:h-5 md:w-1/2" />
      <Skeleton className="h-3.5 w-1/2 md:w-1/3" />
      <Skeleton className="h-3.5 w-1/3 md:w-1/4" />
      <Skeleton className="h-5 w-28 !mt-4" />
    </div>
  </li>
);

const SearchLoadingState: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Progresso simulado (~30s), desacelera para nunca chegar a 100 antes dos dados reais
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      setProgress(Math.min(95, 95 * (1 - Math.exp(-elapsed / 12))));
    }, 200);
    return () => clearInterval(id);
  }, []);

  const currentStep = [...STEPS].reverse().find((s) => progress >= s.at) ?? STEPS[0];

  return (
    <div className="font-jakarta animate-[fadeInUp_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-4 rounded-2xl border border-[#ebebeb] bg-card p-4 md:p-5"
      >
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" aria-hidden="true" />
          <HotelIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="m-0 text-[15px] font-bold md:text-base">Buscando as melhores hospedagens</p>
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <p className="m-0 mt-0.5 truncate text-[13px] text-muted-foreground">{currentStep.label}</p>
          <Progress value={progress} className="mt-2.5 h-1.5" aria-label="Progresso da busca" />
        </div>
      </div>
      <p className="m-0 mt-2.5 px-1 text-xs text-muted-foreground">
        Consultamos preços em tempo real — pode levar até 30 segundos.
      </p>

      <ul className="m-0 mt-6 flex list-none flex-col gap-6 p-0 md:gap-4" aria-hidden="true">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </ul>
    </div>
  );
};

export default SearchLoadingState;

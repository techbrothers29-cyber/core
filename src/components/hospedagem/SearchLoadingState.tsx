import React, { useEffect, useState } from "react";
import { Plane, Hotel as HotelIcon, Luggage } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { at: 0, label: "Conectando aos parceiros de hospedagem..." },
  { at: 15, label: "Consultando disponibilidade em tempo real..." },
  { at: 35, label: "Comparando preços e tarifas exclusivas..." },
  { at: 60, label: "Buscando os melhores quartos para você..." },
  { at: 80, label: "Organizando os resultados..." },
  { at: 95, label: "Finalizando, quase pronto..." },
];

const SearchLoadingState: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulates progress over ~35s, easing out so it never reaches 100 before real data arrives
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      // Asymptotic curve: approaches 95 around 30s
      const next = Math.min(95, 95 * (1 - Math.exp(-elapsed / 12)));
      setProgress(next);
    }, 200);
    return () => clearInterval(id);
  }, []);

  const currentStep = [...STEPS].reverse().find((s) => progress >= s.at) ?? STEPS[0];

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6 animate-[fadeInUp_0.5s_cubic-bezier(0.22,1,0.36,1)_both]">
      <div className="relative flex items-center gap-8">
        <div className="animate-float" style={{ animationDelay: "0ms" }}>
          <Plane className="h-8 w-8 text-primary opacity-70" />
        </div>
        <div className="animate-float" style={{ animationDelay: "400ms" }}>
          <HotelIcon className="h-10 w-10 text-primary" />
        </div>
        <div className="animate-float" style={{ animationDelay: "800ms" }}>
          <Luggage className="h-8 w-8 text-primary opacity-70" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <p className="text-foreground font-medium text-lg">Buscando as melhores hospedagens...</p>
        <p className="text-muted-foreground text-sm min-h-[1.25rem] transition-opacity">
          {currentStep.label}
        </p>
      </div>

      <div className="w-full max-w-md px-4">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Pesquisando</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/80 max-w-sm text-center px-4">
        Isso pode levar até 30 segundos enquanto consultamos preços em tempo real. Por favor, aguarde nesta tela.
      </p>
    </div>
  );
};

export default SearchLoadingState;

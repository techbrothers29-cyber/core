import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Se o valor for maior que 1000, provavelmente está em centavos e precisa ser dividido por 100
  const adjustedValue = numValue > 1000 ? numValue / 100 : numValue;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(adjustedValue);
}

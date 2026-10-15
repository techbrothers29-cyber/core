import React from "react";
import { Link } from "react-router-dom";

interface Props {
  hotelName: string;
  /** Destino real da busca de disponibilidade (mesmo link de antes do redesign). */
  reserveHref: string;
}

const FIELD =
  "block min-w-0 rounded-[10px] border border-[#dddddd] px-3.5 py-2.5 text-xs font-extrabold text-foreground hover:border-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/**
 * Card de reserva fixo da coluna direita (desktop).
 * As datas e os hóspedes são escolhidos na busca de hospedagem (/hospedagem), que hoje
 * não recebe datas pela URL — por isso cada campo leva para lá, onde a escolha acontece.
 */
const HotelDetailBookingCard: React.FC<Props> = ({ hotelName, reserveHref }) => (
  <div className="rounded-2xl border border-[#dddddd] bg-white p-5 shadow-[0_6px_20px_rgba(0,0,0,0.08)] flex flex-col gap-3">
    <h2 className="m-0 text-lg font-extrabold leading-snug text-foreground">Reserve {hotelName}</h2>
    <div className="grid grid-cols-2 gap-2">
      <Link to={reserveHref} className={FIELD} aria-label="Escolher data de check-in na busca de hospedagem">
        Check-in
        <span className="block text-sm font-normal text-muted-foreground">Selecione</span>
      </Link>
      <Link to={reserveHref} className={FIELD} aria-label="Escolher data de check-out na busca de hospedagem">
        Check-out
        <span className="block text-sm font-normal text-muted-foreground">Selecione</span>
      </Link>
    </div>
    <Link to={reserveHref} className={FIELD} aria-label="Escolher hóspedes e quartos na busca de hospedagem">
      Hóspedes e quartos
      <span className="block text-sm font-normal text-muted-foreground">1 quarto, 2 adultos</span>
    </Link>
    <Link
      to={reserveHref}
      className="inline-flex h-[52px] items-center justify-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      Ver disponibilidade e preços
    </Link>
    <p className="m-0 text-center text-sm text-muted-foreground">Preços em tempo real, sem taxa extra</p>
  </div>
);

export default HotelDetailBookingCard;

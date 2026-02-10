"use client";

import { useState } from "react";
import { TransferSummary } from "@/lib/parser/types";
import { formatArgentineCurrency } from "@/lib/parser/number-format";

interface TransfersCardProps {
  transfers: TransferSummary[];
}

const INITIAL_VISIBLE = 8;

export function TransfersCard({ transfers }: TransfersCardProps) {
  const [showAll, setShowAll] = useState(false);

  if (transfers.length === 0) {
    return (
      <div className="card p-6 animate-slide-up stagger-5">
        <h3 className="text-lg font-semibold mb-4">Transferencias</h3>
        <p className="text-[var(--text-muted)]">
          No hay transferencias en este período
        </p>
      </div>
    );
  }

  const totalSent = transfers.reduce((sum, t) => sum + t.totalSent, 0);
  const totalReceived = transfers.reduce((sum, t) => sum + t.totalReceived, 0);

  return (
    <div className="card p-6 animate-slide-up stagger-5">
      <div className="flex items-center gap-3 mb-6">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: "#3B82F6" }}
        />
        <h3 className="text-lg font-semibold">Transferencias</h3>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-[var(--bg-secondary)]">
        <div>
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-1">
            Enviadas
          </p>
          <p className="font-mono text-sm sm:text-lg text-[var(--negative)]">
            -{formatArgentineCurrency(totalSent)}
          </p>
        </div>
        <div>
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-1">
            Recibidas
          </p>
          <p className="font-mono text-sm sm:text-lg text-[var(--positive)]">
            +{formatArgentineCurrency(totalReceived)}
          </p>
        </div>
      </div>

      {/* Per-person breakdown - simplified list */}
      <div className="space-y-4">
        {(showAll ? transfers : transfers.slice(0, INITIAL_VISIBLE)).map((transfer) => (
          <div
            key={transfer.cuit || transfer.name}
            className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border-subtle)] last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate" title={transfer.name}>
                {transfer.name}
              </p>
              {transfer.bank && (
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {transfer.bank}
                </p>
              )}
              <div className="flex gap-4 mt-1 text-xs">
                {transfer.totalSent > 0 && (
                  <span className="text-[var(--text-muted)]">
                    Enviado: <span className="text-[var(--negative)]">-{formatArgentineCurrency(transfer.totalSent)}</span>
                  </span>
                )}
                {transfer.totalReceived > 0 && (
                  <span className="text-[var(--text-muted)]">
                    Recibido: <span className="text-[var(--positive)]">+{formatArgentineCurrency(transfer.totalReceived)}</span>
                  </span>
                )}
              </div>
            </div>
            <p
              className={`font-mono font-semibold text-right shrink-0 ${
                transfer.net >= 0
                  ? "text-[var(--positive)]"
                  : "text-[var(--negative)]"
              }`}
            >
              {transfer.net >= 0 ? "+" : ""}
              {formatArgentineCurrency(transfer.net)}
            </p>
          </div>
        ))}

        {transfers.length > INITIAL_VISIBLE && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full text-center text-sm text-[var(--accent)] hover:underline pt-2 cursor-pointer"
          >
            {showAll ? "Ver menos" : `Ver ${transfers.length - INITIAL_VISIBLE} más`}
          </button>
        )}
      </div>
    </div>
  );
}

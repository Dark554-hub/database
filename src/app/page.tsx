/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { RefreshCw, WifiOff, Bluetooth, Droplets } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/sensors");
      if (!res.ok) throw new Error("Error en la respuesta");
      const json = await res.json();
      const records = json.data || [];
      setData(records);
      setError(null);
      setLastUpdated(new Date());
      if (records.length > 0) {
        const last = records[records.length - 1];
        const keys = Object.keys(last).filter(k => typeof last[k] === "number" && k !== "id");
        setMetrics(keys);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 3000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (tick: any) => {
    try { return format(new Date(tick), "HH:mm"); } catch { return tick; }
  };

  const chartColors = ["#C9A227", "#4A7C59", "#0EA5E9", "#A34A3E", "#8b5cf6"];

  const metricLabel: Record<string, { label: string; unit: string }> = {
    ph:          { label: "pH",          unit: "" },
    turbidez:    { label: "Turbidez",    unit: " NTU" },
    temperatura: { label: "Temperatura", unit: " °C" },
    nitratos:    { label: "Nitratos",    unit: " mg/L" },
  };

  const getStatus = (key: string, val: number) => {
    if (key === "ph") {
      if (val >= 6.5 && val <= 8.0) return { label: "Óptimo",       color: "#4A7C59" };
      return                                { label: "Fuera de rango", color: "#A34A3E" };
    }
    if (key === "turbidez") {
      if (val <= 4) return { label: "Agua clara",  color: "#4A7C59" };
      if (val <= 8) return { label: "Moderada",    color: "#C9A227" };
      return               { label: "Turbia",      color: "#A34A3E" };
    }
    if (key === "temperatura") {
      if (val <= 26.5) return { label: "Normal",   color: "#4A7C59" };
      return                  { label: "Elevada",  color: "#C9A227" };
    }
    return { label: "—", color: "#64748b" };
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--lympha-sand)" }}>

      {/* ── HEADER ── */}
      <header
        style={{ backgroundColor: "var(--lympha-walnut)" }}
        className="px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
      >
        {/* Logo + Brand */}
        <div className="flex items-center gap-4">
          {/* Logo SVG embebido — sustituye con <Image> cuando tengas el archivo */}
          <div className="h-9 w-auto flex items-center">
            <Image
              src="/logo.png"
              alt="Lympha"
              width={110}
              height={36}
              style={{ objectFit: "contain" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          {/* Fallback si no existe el logo todavía */}
          <div className="flex items-center gap-2 pl-1 border-l border-white/10">
            <Droplets className="w-5 h-5" style={{ color: "var(--lympha-amber)" }} />
            <div>
              <h1 className="text-base font-bold text-white leading-none serif-italic">Lympha</h1>
              <p className="text-xs mt-0.5 font-medium" style={{ color: "#C9A22780" }}>
                Centro de Datos · Cenote Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Nav + Status */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/collector"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-md"
            style={{ backgroundColor: "var(--lympha-amber)", color: "var(--lympha-walnut)" }}
          >
            <Bluetooth className="w-4 h-4" />
            Recolector Móvil
          </Link>

          <div
            className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm border"
            style={{ backgroundColor: "#14100E99", borderColor: "#C9A22725", color: "#FAF7F3" }}
          >
            {error ? (
              <span className="flex items-center gap-2 font-medium" style={{ color: "#A34A3E" }}>
                <WifiOff className="w-4 h-4" /> Sin señal
              </span>
            ) : (
              <span className="flex items-center gap-2 font-medium" style={{ color: "#4A7C59" }}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                En vivo
              </span>
            )}
            <div className="w-px h-4" style={{ backgroundColor: "#C9A22725" }}></div>
            <span className="flex items-center gap-2 font-medium" style={{ color: "#C9A22780" }}>
              <RefreshCw className="w-3.5 h-3.5" />
              {lastUpdated ? format(lastUpdated, "HH:mm:ss") : "—"}
            </span>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="p-4 md:p-8">

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div
              className="w-10 h-10 border-4 rounded-full animate-spin"
              style={{ borderColor: "#C9A22725", borderTopColor: "var(--lympha-amber)" }}
            ></div>
            <p className="text-sm font-medium" style={{ color: "#0F172A60" }}>
              Sincronizando con la boya...
            </p>
          </div>

        ) : data.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-[50vh] rounded-3xl border-2 border-dashed"
            style={{ backgroundColor: "var(--lympha-cream)", borderColor: "#C9A22730" }}
          >
            <Droplets className="w-12 h-12 mb-4" style={{ color: "#C9A22740" }} />
            <h2 className="text-xl font-bold serif-italic" style={{ color: "var(--lympha-walnut)" }}>
              Sin lecturas aún
            </h2>
            <p className="text-sm mt-2 text-center max-w-sm px-4" style={{ color: "#0F172A70" }}>
              Usa el{" "}
              <Link href="/collector" className="underline font-semibold" style={{ color: "var(--lympha-amber)" }}>
                Recolector Móvil
              </Link>{" "}
              para enviar datos desde la boya.
            </p>
          </div>

        ) : (
          <div className="space-y-8">

            {/* ── METRIC CARDS ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map((key, i) => {
                const val = data[data.length - 1][key];
                const status = getStatus(key, val);
                const meta = metricLabel[key] ?? { label: key, unit: "" };
                return (
                  <div
                    key={key}
                    className="rounded-2xl p-5 relative overflow-hidden shadow-sm"
                    style={{ backgroundColor: "var(--lympha-walnut)" }}
                  >
                    {/* Label */}
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                      style={{ color: "#C9A22790", fontFamily: "var(--font-sans)" }}>
                      {meta.label}
                    </p>
                    {/* Big number — único uso de serif en los valores */}
                    <p className="text-4xl font-bold tracking-tight serif-italic leading-none"
                      style={{ color: "var(--lympha-amber)" }}>
                      {typeof val === "number" ? val.toFixed(1) : val}
                      <span className="text-lg ml-1 font-normal" style={{ color: "#C9A22770" }}>
                        {meta.unit}
                      </span>
                    </p>
                    {/* Status badge */}
                    <span
                      className="inline-block mt-3 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: `${status.color}20`, color: status.color, fontFamily: "var(--font-sans)" }}
                    >
                      {status.label}
                    </span>
                    {/* Decorative circle */}
                    <div
                      className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-[0.07]"
                      style={{ backgroundColor: "var(--lympha-amber)" }}
                    ></div>
                  </div>
                );
              })}
            </div>

            {/* ── CHARTS ── */}
            <div>
              <h2 className="text-2xl font-bold serif-italic mb-5" style={{ color: "var(--lympha-walnut)" }}>
                Evolución de parámetros
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {metrics.map((key, i) => {
                  const color = chartColors[i % chartColors.length];
                  const meta = metricLabel[key] ?? { label: key, unit: "" };
                  return (
                    <div
                      key={`chart-${key}`}
                      className="rounded-2xl p-5 md:p-6 shadow-sm border"
                      style={{ backgroundColor: "var(--lympha-cream)", borderColor: "#C9A22720" }}
                    >
                      {/* Chart title: serif para el nombre de la métrica */}
                      <div className="flex items-baseline justify-between mb-5">
                        <h3 className="text-lg font-bold serif-italic" style={{ color: "var(--lympha-walnut)" }}>
                          {meta.label}
                          {meta.unit && (
                            <span className="text-sm font-normal ml-1" style={{ color: "#0F172A50", fontStyle: "normal" }}>
                              {meta.unit.trim()}
                            </span>
                          )}
                        </h3>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: `${color}15`, color, fontFamily: "var(--font-sans)" }}
                        >
                          Últimas {data.length} lecturas
                        </span>
                      </div>

                      <div className="h-[220px] md:h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#C9A22718" vertical={false} />
                            <XAxis
                              dataKey="timestamp"
                              tickFormatter={formatTime}
                              stroke="#0F172A20"
                              fontSize={11}
                              tickMargin={8}
                              tick={{ fill: "#0F172A55", fontWeight: 500, fontFamily: "Inter, sans-serif" }}
                            />
                            <YAxis
                              stroke="#0F172A20"
                              fontSize={11}
                              tickMargin={8}
                              domain={["auto", "auto"]}
                              tick={{ fill: "#0F172A55", fontWeight: 500, fontFamily: "Inter, sans-serif" }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "var(--lympha-walnut)",
                                borderColor: "#C9A22740",
                                borderRadius: "14px",
                                padding: "10px 14px",
                                boxShadow: "0 8px 32px rgba(20,16,14,0.25)",
                                fontFamily: "Inter, sans-serif",
                              }}
                              itemStyle={{ color, fontWeight: 700, fontSize: 14 }}
                              labelStyle={{ color: "#C9A22790", fontSize: 11, marginBottom: 4 }}
                              labelFormatter={formatTime}
                            />
                            <Line
                              type="monotone"
                              dataKey={key}
                              stroke={color}
                              strokeWidth={2.5}
                              dot={false}
                              activeDot={{ r: 5, strokeWidth: 0, fill: color }}
                              animationDuration={400}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ── FOOTER sutíl ── */}
      <footer className="px-8 py-4 text-center border-t" style={{ borderColor: "#C9A22718" }}>
        <p className="text-xs font-medium" style={{ color: "#0F172A40" }}>
          Lympha · Cenote Water Intelligence · Actualización automática cada 3 s
        </p>
      </footer>
    </div>
  );
}

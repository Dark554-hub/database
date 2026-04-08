/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Database, RefreshCw, WifiOff, Bluetooth, Droplets } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/sensors");
      if (!res.ok) throw new Error("Error en la respuesta del servidor");
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
      setError(err.message || "Error al obtener datos");
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatXAxis = (tick: any) => {
    try { return format(new Date(tick), "HH:mm"); } catch { return tick; }
  };

  // Colores Lympha para gráficas
  const chartColors = ["#C9A227", "#4A7C59", "#0EA5E9", "#A34A3E", "#8b5cf6"];

  // Etiquetas amigables
  const metricLabel: Record<string, string> = {
    ph: "pH",
    turbidez: "Turbidez (NTU)",
    temperatura: "Temperatura (°C)",
    nitratos: "Nitratos (mg/L)",
  };

  // Iconos del semáforo por valor
  const getStatus = (key: string, val: number) => {
    if (key === "ph") {
      if (val >= 6.5 && val <= 8.0) return { label: "Óptimo", color: "#4A7C59" };
      return { label: "Fuera de rango", color: "#A34A3E" };
    }
    if (key === "turbidez") {
      if (val <= 4) return { label: "Claro", color: "#4A7C59" };
      if (val <= 8) return { label: "Moderado", color: "#C9A227" };
      return { label: "Turbio", color: "#A34A3E" };
    }
    if (key === "temperatura") {
      if (val <= 26.5) return { label: "Normal", color: "#4A7C59" };
      return { label: "Caliente", color: "#C9A227" };
    }
    return { label: "—", color: "#0F172A" };
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--lympha-sand)" }}>

      {/* ── HEADER ── */}
      <header style={{ backgroundColor: "var(--lympha-walnut)" }} className="px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: "#C9A22720" }}>
            <Droplets className="w-6 h-6" style={{ color: "var(--lympha-amber)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white serif-italic">Lympha</h1>
            <p className="text-xs font-medium" style={{ color: "#C9A22799" }}>Centro de Datos · Cenote Intelligence</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/collector"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{ backgroundColor: "var(--lympha-amber)", color: "var(--lympha-walnut)" }}
          >
            <Bluetooth className="w-4 h-4" /> Recolector Móvil
          </Link>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium border"
            style={{ backgroundColor: "#14100E99", borderColor: "#C9A22730", color: "#FAF7F3" }}>
            {error ? (
              <span className="flex items-center gap-2" style={{ color: "var(--lympha-terracota)" }}>
                <WifiOff className="w-4 h-4" /> Sin señal
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "var(--lympha-green)" }}></span>
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "var(--lympha-green)" }}></span>
                </span>
                <span style={{ color: "#4A7C59" }}>En vivo</span>
              </span>
            )}
            <div className="w-px h-4" style={{ backgroundColor: "#C9A22730" }}></div>
            <span className="flex items-center gap-2" style={{ color: "#C9A22799" }}>
              <RefreshCw className="w-3.5 h-3.5" />
              {lastUpdated ? format(lastUpdated, "HH:mm:ss") : "—"}
            </span>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <main className="p-4 md:p-8">

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-10 h-10 border-4 rounded-full animate-spin"
              style={{ borderColor: "#C9A22730", borderTopColor: "var(--lympha-amber)" }}></div>
            <p className="text-sm font-medium" style={{ color: "#0F172A80" }}>Sincronizando con la boya...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] rounded-3xl border-2 border-dashed"
            style={{ backgroundColor: "var(--lympha-cream)", borderColor: "#C9A22740" }}>
            <Database className="w-12 h-12 mb-4" style={{ color: "#C9A22750" }} />
            <h2 className="text-xl font-bold serif-italic" style={{ color: "var(--lympha-walnut)" }}>Sin lecturas aún</h2>
            <p className="text-sm font-medium mt-2 text-center max-w-sm px-4" style={{ color: "#0F172A70" }}>
              Usa el{" "}
              <Link href="/collector" className="underline font-bold" style={{ color: "var(--lympha-amber)" }}>
                Recolector Móvil
              </Link>{" "}
              para enviar datos desde la boya al sistema.
            </p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ── METRIC CARDS ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map((key, i) => {
                const val = data[data.length - 1][key];
                const status = getStatus(key, val);
                return (
                  <div key={key} className="rounded-2xl p-5 relative overflow-hidden shadow-sm"
                    style={{ backgroundColor: "var(--lympha-walnut)" }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#C9A22799" }}>
                      {metricLabel[key] || key}
                    </p>
                    <p className="text-4xl font-black tracking-tight serif-italic" style={{ color: "var(--lympha-amber)" }}>
                      {typeof val === "number" ? val.toFixed(1) : val}
                    </p>
                    <span className="inline-block mt-3 text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: `${status.color}20`, color: status.color }}>
                      {status.label}
                    </span>
                    {/* Corner decoration */}
                    <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full opacity-10"
                      style={{ backgroundColor: "var(--lympha-amber)" }}></div>
                  </div>
                );
              })}
            </div>

            {/* ── CHARTS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {metrics.map((key, i) => {
                const color = chartColors[i % chartColors.length];
                return (
                  <div key={`chart-${key}`} className="rounded-2xl p-5 md:p-6 shadow-sm border"
                    style={{ backgroundColor: "var(--lympha-cream)", borderColor: "#C9A22725" }}>
                    <div className="flex items-baseline justify-between mb-6">
                      <h3 className="text-lg font-bold serif-italic" style={{ color: "var(--lympha-walnut)" }}>
                        {metricLabel[key] || key}
                      </h3>
                      <span className="text-xs font-bold px-2 py-1 rounded-md"
                        style={{ backgroundColor: `${color}18`, color }}>
                        Últimas lecturas
                      </span>
                    </div>

                    <div className="h-[220px] md:h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#C9A22715" vertical={false} />
                          <XAxis dataKey="timestamp" tickFormatter={formatXAxis}
                            stroke="#0F172A30" fontSize={11} tickMargin={10}
                            tick={{ fill: "#0F172A60", fontWeight: 600 }} />
                          <YAxis stroke="#0F172A30" fontSize={11} tickMargin={10}
                            domain={["auto", "auto"]} tick={{ fill: "#0F172A60", fontWeight: 600 }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "var(--lympha-walnut)", borderColor: "#C9A22740", borderRadius: "14px", color: "#FAF7F3", fontWeight: 700, boxShadow: "0 8px 32px rgba(20,16,14,0.3)" }}
                            itemStyle={{ color, fontWeight: 900 }}
                            labelFormatter={formatXAxis}
                          />
                          <Line type="monotone" dataKey={key} stroke={color}
                            strokeWidth={3} dot={false}
                            activeDot={{ r: 6, strokeWidth: 0, fill: color }}
                            animationDuration={500} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

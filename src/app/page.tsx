/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { RefreshCw, WifiOff, Bluetooth, Droplets, Brain, ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";

interface DiagnosticoEtiqueta {
  parametro: string;
  estado: string;
  severidad: number;
  detalle: string;
}

interface DiagnosticoResult {
  clasificacion: "normal" | "advertencia" | "alerta";
  confianza: number;
  etiquetas: DiagnosticoEtiqueta[];
  recomendaciones: string[];
  timestamp: string;
}

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<string[]>([]);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoResult | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const lastDiagKey = React.useRef<string>("");

  const fetchDiagnostico = useCallback(async (lectura: any, isInitial: boolean) => {
    // Generar una clave con los valores para detectar cambios reales
    const key = `${lectura.ph}-${lectura.turbidez}-${lectura.temperatura}-${lectura.conductividad}`;
    if (key === lastDiagKey.current) return; // Sin cambios, no re-consultar
    lastDiagKey.current = key;

    try {
      // Solo mostrar spinner en la carga inicial
      if (isInitial) setDiagLoading(true);
      const res = await fetch("/api/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ph: lectura.ph,
          turbidez: lectura.turbidez,
          temperatura: lectura.temperatura,
          conductividad: lectura.conductividad,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setDiagnostico(json.diagnostico);
      }
    } catch { /* silently fail */ }
    finally { if (isInitial) setDiagLoading(false); }
  }, []);

  const isFirstLoad = React.useRef(true);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/lecturas");
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
        // Solo re-diagnosticar si los datos cambiaron
        fetchDiagnostico(last, isFirstLoad.current);
        isFirstLoad.current = false;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 15000); // Polling cada 15s en vez de 3s
    return () => clearInterval(t);
  }, []);

  const formatTime = (tick: any) => {
    try { return format(new Date(tick), "HH:mm"); } catch { return tick; }
  };

  const chartColors = ["#C9A227", "#4A7C59", "#0EA5E9", "#A34A3E", "#8b5cf6"];

  const metricLabel: Record<string, { label: string; unit: string }> = {
    ph:          { label: "pH",           unit: "" },
    turbidez:    { label: "Turbidez",     unit: " NTU" },
    temperatura: { label: "Temperatura",  unit: " °C" },
    nitratos:    { label: "Nitratos",     unit: " mg/L" },
    conductividad: { label: "Conductividad", unit: " µS/cm" },
  };

  const getStatus = (key: string, val: number) => {
    if (key === "ph") {
      if (val >= 6.5 && val <= 8.0) return { label: "Óptimo",        color: "#4A7C59" };
      return                                { label: "Fuera de rango", color: "#A34A3E" };
    }
    if (key === "turbidez") {
      if (val <= 4) return { label: "Agua clara", color: "#4A7C59" };
      if (val <= 8) return { label: "Moderada",   color: "#C9A227" };
      return               { label: "Turbia",     color: "#A34A3E" };
    }
    if (key === "temperatura") {
      if (val <= 26.5) return { label: "Normal",  color: "#4A7C59" };
      return                  { label: "Elevada", color: "#C9A227" };
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
        </div>

        {/* Nav + Status */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/recolector"
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
              <Link href="/recolector" className="underline font-semibold" style={{ color: "var(--lympha-amber)" }}>
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

            {/* ── ML DIAGNOSTIC PANEL ── */}
            {diagnostico && (
              <div
                className="rounded-2xl p-6 md:p-8 shadow-sm border relative overflow-hidden"
                style={{
                  backgroundColor: "var(--lympha-cream)",
                  borderColor: diagnostico.clasificacion === "normal" ? "#4A7C5930"
                    : diagnostico.clasificacion === "advertencia" ? "#C9A22730"
                    : "#A34A3E30",
                }}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2.5 rounded-xl"
                      style={{
                        backgroundColor: diagnostico.clasificacion === "normal" ? "#4A7C5915"
                          : diagnostico.clasificacion === "advertencia" ? "#C9A22715"
                          : "#A34A3E15",
                      }}
                    >
                      <Brain
                        className="w-6 h-6"
                        style={{
                          color: diagnostico.clasificacion === "normal" ? "#4A7C59"
                            : diagnostico.clasificacion === "advertencia" ? "#C9A227"
                            : "#A34A3E",
                        }}
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold serif-italic" style={{ color: "var(--lympha-walnut)" }}>
                        Diagnóstico ML
                      </h2>
                      <p className="text-xs font-medium" style={{ color: "#0F172A50" }}>
                        Modelo entrenado con 7,401 registros · NOM-127-SSA1-2021
                      </p>
                    </div>
                  </div>

                  {/* Classification badge */}
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm self-start sm:self-auto"
                    style={{
                      backgroundColor: diagnostico.clasificacion === "normal" ? "#4A7C5918"
                        : diagnostico.clasificacion === "advertencia" ? "#C9A22718"
                        : "#A34A3E18",
                      color: diagnostico.clasificacion === "normal" ? "#4A7C59"
                        : diagnostico.clasificacion === "advertencia" ? "#C9A227"
                        : "#A34A3E",
                    }}
                  >
                    {diagnostico.clasificacion === "normal" && <ShieldCheck className="w-5 h-5" />}
                    {diagnostico.clasificacion === "advertencia" && <AlertTriangle className="w-5 h-5" />}
                    {diagnostico.clasificacion === "alerta" && <ShieldAlert className="w-5 h-5" />}
                    {diagnostico.clasificacion.toUpperCase()}
                  </div>
                </div>

                {/* Parameter tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {diagnostico.etiquetas.map((et, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-4 border"
                      style={{
                        backgroundColor: et.severidad === 0 ? "#4A7C5908" : et.severidad === 1 ? "#C9A22708" : "#A34A3E08",
                        borderColor: et.severidad === 0 ? "#4A7C5920" : et.severidad === 1 ? "#C9A22720" : "#A34A3E20",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#0F172A60" }}>
                          {et.parametro}
                        </span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: et.severidad === 0 ? "#4A7C5918" : et.severidad === 1 ? "#C9A22718" : "#A34A3E18",
                            color: et.severidad === 0 ? "#4A7C59" : et.severidad === 1 ? "#C9A227" : "#A34A3E",
                          }}
                        >
                          {et.estado}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "#0F172A70" }}>
                        {et.detalle}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Recommendations */}
                {diagnostico.recomendaciones.length > 0 && (
                  <div
                    className="rounded-xl p-4 border"
                    style={{ backgroundColor: "var(--lympha-walnut)", borderColor: "#C9A22720" }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#C9A22790" }}>
                      Recomendaciones del modelo
                    </p>
                    <ul className="space-y-2">
                      {diagnostico.recomendaciones.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#FAF7F3DD" }}>
                          <span className="text-amber-400 mt-0.5 flex-shrink-0">›</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Loading overlay */}
                {diagLoading && (
                  <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                    <div
                      className="w-8 h-8 border-4 rounded-full animate-spin"
                      style={{ borderColor: "#C9A22725", borderTopColor: "var(--lympha-amber)" }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            {/* ── CHARTS ── */}
            <div>
              <h2 className="text-2xl font-bold serif-italic mb-5" style={{ color: "var(--lympha-walnut)" }}>
                Evolución de Parámetros
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
                          {data.length} lecturas recientes
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
          Flotaya · Monitoreo de Cenotes · Actualización automática cada 15 s
        </p>
      </footer>
    </div>
  );
}

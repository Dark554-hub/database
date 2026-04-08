/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Database, Server, RefreshCw, WifiOff, Bluetooth } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Determinar dinámicamente qué métricas numéricas tenemos
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

      // Extraer claves numéricas de los registros para mostrarlos
      if (records.length > 0) {
        const lastRecord = records[records.length - 1];
        const numericKeys = Object.keys(lastRecord).filter(
          (key) => typeof lastRecord[key] === "number" && key !== "id"
        );
        setMetrics(numericKeys);
      }
    } catch (err: any) {
      setError(err.message || "Error al obtener datos");
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // Obtener inmediato al montar
    const interval = setInterval(fetchData, 3000); // Polling cada 3 segundos
    return () => clearInterval(interval);
  }, []);

  // Formateador de tiempo para el eje X
  const formatXAxis = (tickItem: any) => {
    if (!tickItem) return "";
    try {
      const date = new Date(tickItem);
      return format(date, "HH:mm:ss");
    } catch {
      return tickItem;
    }
  };

  // Colores Premium para los gráficos (adaptados para modo claro)
  const colors = [
    "#2563eb", // blue-600
    "#059669", // emerald-600
    "#7c3aed", // violet-600
    "#d97706", // amber-600
    "#db2777", // pink-600
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans selection:bg-blue-200">
      
      {/* Cabecera Adaptativa */}
      <header className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Sensor Data Center
            </h1>
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2 mt-0.5">
              <Server className="w-4 h-4" /> Endpoint: /api/sensors
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Link 
            href="/collector"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
          >
            <Bluetooth className="w-4 h-4" />
            Recolector Móvil (PWA)
          </Link>

          <div className="flex items-center justify-between sm:justify-start gap-4 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm shadow-sm">
            <span className="flex items-center gap-2 font-bold">
              {error ? (
                <span className="flex items-center gap-2 text-red-500">
                  <WifiOff className="w-4 h-4" /> Desconectado
                </span>
              ) : (
                <span className="flex items-center gap-2 text-emerald-600">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  Recibiendo
                </span>
              )}
            </span>
            <div className="w-px h-4 bg-slate-200 hidden sm:block"></div>
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 text-slate-400 ${!error && "animate-spin-slow"}`} /> 
              {lastUpdated ? format(lastUpdated, "HH:mm:ss") : "Esperando..."}
            </span>
          </div>
        </div>
      </header>

      {/* Estados Visuales */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Conectando al servidor...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
          <div className="p-4 bg-slate-50 rounded-full mb-4">
            <Database className="w-12 h-12 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-700">Repositorio Vacío</h2>
          <p className="text-slate-500 mt-2 max-w-md text-center font-medium px-4">
            Aún no hay lecturas de la boya. Utiliza el <Link href="/collector" className="text-blue-600 underline">Recolector Móvil</Link> para inyectar datos de prueba o enviar por Bluetooth.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Tarjetas de Resumen Dinámicas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {metrics.map((metric, index) => {
                const latestValue = data[data.length - 1][metric];
                const color = colors[index % colors.length];
                
                return (
                  <div key={metric} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden group">
                     {/* Gradient background effect subtle */}
                    <div 
                      className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-300"
                      style={{ background: `radial-gradient(circle at right bottom, ${color}, transparent 80%)` }}
                    />
                    
                    <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {metric.replace(/_/g, ' ')}
                    </h3>
                    <div className="flex items-baseline gap-2">
                       <span className="text-3xl md:text-4xl font-black tracking-tight text-slate-800">
                         {typeof latestValue === 'number' ? latestValue.toFixed(1) : latestValue}
                       </span>
                    </div>
                  </div>
                )
             })}
          </div>

          {/* Gráficas Dinámicas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {metrics.map((metric, index) => {
               const color = colors[index % colors.length];
               return (
                 <div key={`chart-${metric}`} className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-slate-800 capitalize">Tendencia de {metric.replace(/_/g, ' ')}</h3>
                    </div>
                    
                    <div className="h-[250px] md:h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={(val) => formatXAxis(val)} 
                            stroke="#94a3b8" 
                            fontSize={12}
                            tickMargin={10}
                            tick={{ fill: '#64748b', fontWeight: 500 }}
                          />
                          <YAxis 
                            stroke="#94a3b8" 
                            fontSize={12} 
                            tickMargin={10}
                            domain={['auto', 'auto']}
                            tick={{ fill: '#64748b', fontWeight: 500 }}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: color, fontWeight: 900 }}
                            labelFormatter={(label) => formatXAxis(label)}
                          />
                          <Line 
                            type="monotone" 
                            dataKey={metric} 
                            stroke={color} 
                            strokeWidth={3.5}
                            dot={{ r: 0 }}
                            activeDot={{ r: 6, strokeWidth: 0, fill: color }}
                            animationDuration={500}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                 </div>
               )
            })}
          </div>
        </div>
      )}
    </div>
  );
}

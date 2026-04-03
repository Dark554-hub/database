/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Database, Server, RefreshCw, WifiOff } from "lucide-react";
import { format } from "date-fns";

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
          (key) => typeof lastRecord[key] === "number"
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

  // Colores Premium para los gráficos
  const colors = [
    "#3b82f6", // blue
    "#10b981", // emerald
    "#8b5cf6", // violet
    "#f59e0b", // amber
    "#ec4899", // pink
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 font-sans selection:bg-blue-500/30">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              Sensor Data Center
            </h1>
            <p className="text-sm text-neutral-400 flex items-center gap-2 mt-1">
              <Server className="w-4 h-4" /> Endpoint Activo: /api/sensors
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-neutral-900 border border-white/5 rounded-full px-5 py-2 text-sm shadow-inner">
          <span className="flex items-center gap-2">
            {error ? (
              <span className="flex items-center gap-2 text-red-400">
                <WifiOff className="w-4 h-4" /> Desconectado
              </span>
            ) : (
              <span className="flex items-center gap-2 text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Recibiendo Datos
              </span>
            )}
          </span>
          <div className="w-px h-4 bg-white/10"></div>
          <span className="text-neutral-400 flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${!error && "animate-spin-slow"}`} /> 
            {lastUpdated ? format(lastUpdated, "HH:mm:ss") : "Esperando..."}
          </span>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-neutral-400 animate-pulse">Conectando al servidor...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] bg-neutral-900/50 rounded-3xl border border-white/5 border-dashed">
          <Database className="w-16 h-16 text-neutral-600 mb-4" />
          <h2 className="text-xl font-medium text-neutral-300">Esperando datos del circuito</h2>
          <p className="text-neutral-500 mt-2 max-w-md text-center">
            Envía una petición POST a <code className="bg-black px-2 py-1 rounded text-blue-400">/api/sensors</code> con formato JSON para que aparezcan aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Tarjetas de Resumen Dinámicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {metrics.map((metric, index) => {
                const latestValue = data[data.length - 1][metric];
                const color = colors[index % colors.length];
                
                return (
                  <div key={metric} className="bg-neutral-900 rounded-2xl border border-white/5 p-6 relative overflow-hidden group">
                     {/* Gradient background effect */}
                    <div 
                      className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500"
                      style={{ background: `radial-gradient(circle at right bottom, ${color}, transparent 70%)` }}
                    />
                    
                    <h3 className="text-sm font-medium text-neutral-400 capitalize mb-1">{metric.replace(/_/g, ' ')}</h3>
                    <div className="flex items-baseline gap-2">
                       <span className="text-4xl font-bold tracking-tight text-white">
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
                 <div key={`chart-${metric}`} className="bg-neutral-900 rounded-2xl border border-white/5 p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-medium text-neutral-200 capitalize">Evolución de {metric.replace(/_/g, ' ')}</h3>
                    </div>
                    
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={(val) => formatXAxis(val)} 
                            stroke="#ffffff30" 
                            fontSize={12}
                            tickMargin={10}
                          />
                          <YAxis 
                            stroke="#ffffff30" 
                            fontSize={12} 
                            tickMargin={10}
                            domain={['auto', 'auto']}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            labelFormatter={(label) => formatXAxis(label)}
                          />
                          <Line 
                            type="monotone" 
                            dataKey={metric} 
                            stroke={color} 
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 0, fill: color }}
                            animationDuration={300}
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

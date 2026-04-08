/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  Bluetooth, LayoutDashboard, RefreshCw, Database,
  Search, Wifi, WifiOff, CloudUpload, Activity, AlertCircle, CheckCircle2, Droplets
} from "lucide-react";
import Link from "next/link";

interface PendingRead {
  id: string;
  data: any;
  timestamp: string;
}

export default function MobileCollector() {
  const [device, setDevice] = useState<any | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState<PendingRead[]>([]);
  const [isWebBluetoothSupported, setIsWebBluetoothSupported] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsWebBluetoothSupported(typeof navigator !== "undefined" && !!(navigator as any).bluetooth);
    setIsOnline(navigator.onLine);

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const stored = localStorage.getItem("lympha_offline_queue");
    if (stored) {
      try { setPendingSync(JSON.parse(stored)); } catch { /* ignore */ }
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("lympha_offline_queue", JSON.stringify(pendingSync));
  }, [pendingSync]);

  useEffect(() => {
    if (isOnline && pendingSync.length > 0 && !isSyncing) syncAll();
  }, [isOnline]);

  const connectBluetooth = async () => {
    if (!isWebBluetoothSupported) {
      alert("Web Bluetooth solo funciona en Chrome para Android o PC.");
      return;
    }
    setIsConnecting(true);
    try {
      const dev = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "0000ffe0-0000-1000-8000-00805f9b34fb",
          "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
        ],
      });
      setDevice(dev);
      dev.addEventListener("gattserverdisconnected", () => setDevice(null));
      const server = await dev.gatt?.connect();
      const services = await server?.getPrimaryServices();
      for (const svc of services || []) {
        const chars = await svc.getCharacteristics();
        for (const c of chars) {
          if (c.properties.notify || c.properties.indicate) {
            await c.startNotifications();
            c.addEventListener("characteristicvaluechanged", handleBTData);
          }
        }
      }
    } catch (e: any) {
      console.warn(e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBTData = (event: any) => {
    const csv = new TextDecoder("utf-8").decode(event.target.value).trim();
    if (csv) parseCSV(csv);
  };

  const parseCSV = (csv: string) => {
    const parts = csv.split(",").map(p => parseFloat(p.trim()));
    if (parts.length >= 3 && !parts.some(isNaN)) {
      const read: PendingRead = {
        id: Math.random().toString(36).substr(2, 9),
        data: { ph: parts[0], turbidez: parts[1], temperatura: parts[2] },
        timestamp: new Date().toISOString(),
      };
      setPendingSync(prev => [read, ...prev]);
    }
  };

  const simulateData = () => {
    const csv = `${(Math.random() * 2 + 6.5).toFixed(2)},${(Math.random() * 3 + 1).toFixed(2)},${(Math.random() * 5 + 24).toFixed(1)}`;
    parseCSV(csv);
  };

  const syncAll = async () => {
    setIsSyncing(true);
    for (const item of pendingSync) {
      try {
        const res = await fetch("/api/sensors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.data),
        });
        if (res.ok) setPendingSync(prev => prev.filter(p => p.id !== item.id));
      } catch { break; }
    }
    setIsSyncing(false);
  };

  const clearCache = () => {
    if (confirm("¿Borrar todos los datos locales no sincronizados?")) setPendingSync([]);
  };

  const lastRead = pendingSync[0]?.data ?? null;

  const getRecommendations = (d: any) => {
    const recs = [];
    if (!d) return recs;
    if (d.ph > 8.0) recs.push({ icon: "🚫", color: "var(--lympha-terracota)", bg: "#A34A3E15", title: `pH Alcalino Alto (${d.ph})`, desc: "El nivel de pH supera el límite saludable. Causa probable: cremas solares y jabones de turistas. Recomendación: restringir acceso temporal." });
    if (d.ph >= 6.5 && d.ph <= 8.0) recs.push({ icon: "✅", color: "var(--lympha-green)", bg: "#4A7C5915", title: `pH Óptimo (${d.ph})`, desc: "El agua mantiene un espectro neutro y purificado. Excelente condición biológica para fauna y flora endémica." });
    if (d.turbidez > 4) recs.push({ icon: "⚠️", color: "var(--lympha-mustard)", bg: "#C9A22715", title: `Visibilidad Reducida (${d.turbidez} NTU)`, desc: "Agua turbia detectada. Revisar posibles deslaves, obras de construcción cercanas o actividad agrícola que filtre al manto freático." });
    if (d.temperatura > 26.5) recs.push({ icon: "🌡️", color: "#d97706", bg: "#d9770615", title: `Temperatura Elevada (${d.temperatura}°C)`, desc: "Temperaturas mayores a 26.5°C favorecen la proliferación de algas nocivas que asfixian a la fauna del cenote." });
    return recs;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--lympha-sand)" }}>

      {/* HEADER */}
      <header style={{ backgroundColor: "var(--lympha-walnut)" }}
        className="px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl transition-opacity hover:opacity-70"
            style={{ backgroundColor: "#C9A22720" }}>
            <LayoutDashboard className="w-5 h-5" style={{ color: "var(--lympha-amber)" }} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white serif-italic">Recolector de Campo</h1>
            <p className="text-xs font-medium" style={{ color: "#C9A22799" }}>
              {isOnline ? "Conectado · Panel de Recomendaciones" : "Modo Offline · Almacenamiento Local"}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border ${isOnline ? "border-green-700/30" : "border-amber-700/30"}`}
          style={{ backgroundColor: isOnline ? "#4A7C5920" : "#C9A22720", color: isOnline ? "#4A7C59" : "#C9A227" }}>
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {isOnline ? "ONLINE" : "OFF-THE-GRID"}
        </div>
      </header>

      {/* BODY */}
      <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* PANEL IZQUIERDO */}
        <div className="lg:col-span-4 space-y-5">

          {/* Bluetooth Card */}
          <div className="rounded-2xl p-6 shadow-sm border"
            style={{ backgroundColor: "var(--lympha-walnut)", borderColor: "#C9A22730" }}>
            <h2 className="font-bold mb-5 flex items-center gap-2 text-white serif-italic text-lg">
              <Bluetooth style={{ color: "var(--lympha-amber)" }} className="w-5 h-5" />
              Vínculo de Campo
            </h2>
            <div className="space-y-3">
              <button onClick={connectBluetooth} disabled={isConnecting || !isWebBluetoothSupported}
                className="w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                style={{ backgroundColor: "var(--lympha-amber)", color: "var(--lympha-walnut)" }}>
                {isConnecting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {isConnecting ? "Buscando BLE..." : "Conectar Boya"}
              </button>

              <button onClick={simulateData}
                className="w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 border flex items-center justify-center gap-2"
                style={{ backgroundColor: "#C9A22710", borderColor: "#C9A22740", color: "#C9A227" }}>
                Simular Dato (Prueba)
              </button>
            </div>

            {device && (
              <div className="mt-4 p-3 rounded-xl flex items-center gap-3 border"
                style={{ backgroundColor: "#4A7C5915", borderColor: "#4A7C5940" }}>
                <Bluetooth className="w-5 h-5" style={{ color: "#4A7C59" }} />
                <p className="font-bold text-sm text-white">{device.name || "ESP32 Conectado"}</p>
              </div>
            )}
          </div>

          {/* Cache Card */}
          <div className="rounded-2xl p-5 shadow-sm border"
            style={{ backgroundColor: "var(--lympha-cream)", borderColor: "#C9A22730" }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2 text-sm"
                style={{ color: "var(--lympha-walnut)" }}>
                <Database className="w-4 h-4" style={{ color: "var(--lympha-amber)" }} />
                Memoria Local
              </h3>
              <span className="text-xs font-black px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "#C9A22715", color: "var(--lympha-amber)" }}>
                {pendingSync.length} reg.
              </span>
            </div>

            {pendingSync.length > 0 ? (
              <div className="space-y-3">
                <button onClick={clearCache}
                  className="w-full text-sm font-bold py-2 rounded-xl transition"
                  style={{ color: "var(--lympha-terracota)", backgroundColor: "#A34A3E10" }}>
                  Purgar Caché
                </button>
                {isOnline && (
                  <button onClick={syncAll} disabled={isSyncing}
                    className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl text-white shadow-md transition active:scale-95"
                    style={{ backgroundColor: "var(--lympha-walnut)" }}>
                    {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                    {isSyncing ? "Subiendo..." : "Sincronizar Ahora"}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-center py-4 rounded-xl border border-dashed"
                style={{ borderColor: "#C9A22740", color: "#0F172A60" }}>
                Todo sincronizado ✓
              </p>
            )}
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div className="lg:col-span-8">

          {/* OFFLINE VIEW */}
          {!isOnline && (
            <div className="rounded-2xl p-6 md:p-8 shadow-sm border h-full"
              style={{ backgroundColor: "var(--lympha-cream)", borderColor: "#C9A22730" }}>
              <h2 className="text-xl font-bold serif-italic mb-2 flex items-center gap-2"
                style={{ color: "var(--lympha-walnut)" }}>
                <Activity className="w-6 h-6" style={{ color: "var(--lympha-amber)" }} />
                Última Extracción de Campo
              </h2>
              <p className="text-sm font-medium mb-8" style={{ color: "#0F172A60" }}>
                Datos almacenados localmente. Conéctate a WiFi para análisis inteligente.
              </p>

              {lastRead ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[["pH", lastRead.ph], ["Turbidez NTU", lastRead.turbidez], ["Temp °C", lastRead.temperatura]].map(([label, val]) => (
                    <div key={label as string} className="rounded-2xl p-6 text-center"
                      style={{ backgroundColor: "var(--lympha-walnut)" }}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-1"
                        style={{ color: "#C9A22780" }}>{label}</p>
                      <p className="text-5xl font-black serif-italic"
                        style={{ color: "var(--lympha-amber)" }}>{(val as number).toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 rounded-2xl border-2 border-dashed"
                  style={{ borderColor: "#C9A22740" }}>
                  <Droplets className="w-10 h-10 mb-2" style={{ color: "#C9A22740" }} />
                  <p className="text-sm font-bold" style={{ color: "#0F172A50" }}>Sin lecturas descargadas hoy</p>
                </div>
              )}
            </div>
          )}

          {/* ONLINE VIEW: Recommendations */}
          {isOnline && (
            <div className="rounded-2xl p-6 md:p-8 shadow-sm border h-full"
              style={{ backgroundColor: "var(--lympha-cream)", borderColor: "#4A7C5930" }}>
              <h2 className="text-xl font-bold serif-italic mb-1"
                style={{ color: "var(--lympha-walnut)" }}>
                Diagnóstico Inteligente
              </h2>
              <p className="text-sm font-medium mb-6" style={{ color: "#0F172A60" }}>
                Análisis automático basado en la última lectura de la boya
              </p>

              {!lastRead ? (
                <div className="p-5 rounded-2xl border flex items-start gap-3"
                  style={{ backgroundColor: "#0EA5E915", borderColor: "#0EA5E930" }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--lympha-iot)" }} />
                  <div>
                    <p className="font-bold text-sm" style={{ color: "var(--lympha-slate)" }}>
                      En espera de datos
                    </p>
                    <p className="text-xs font-medium mt-1" style={{ color: "#0F172A70" }}>
                      Conecta la boya o simula un dato para activar el diagnóstico.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {getRecommendations(lastRead).map((rec, i) => (
                    <div key={i} className="p-4 md:p-5 rounded-2xl border flex items-start gap-4"
                      style={{ backgroundColor: rec.bg, borderColor: `${rec.color}30` }}>
                      <span className="text-2xl leading-none">{rec.icon}</span>
                      <div>
                        <p className="font-bold text-sm" style={{ color: rec.color }}>{rec.title}</p>
                        <p className="text-xs font-medium mt-1 leading-relaxed"
                          style={{ color: "#0F172A80" }}>{rec.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

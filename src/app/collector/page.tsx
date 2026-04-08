/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  Bluetooth, LayoutDashboard, RefreshCw, Database,
  Search, Wifi, WifiOff, CloudUpload, Activity,
  AlertCircle, Droplets
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

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

  // Auto-sync when back online
  useEffect(() => {
    if (isOnline && pendingSync.length > 0 && !isSyncing) syncAll();
  }, [isOnline]);

  const connectBluetooth = async () => {
    if (!isWebBluetoothSupported) {
      alert("Web Bluetooth requiere Chrome en Android o PC. Safari no es compatible.");
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
    if (csv) parseAndStore(csv);
  };

  const parseAndStore = (csv: string) => {
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
    parseAndStore(csv);
  };

  const syncAll = async () => {
    setIsSyncing(true);
    let synced = 0;
    for (const item of pendingSync) {
      try {
        const res = await fetch("/api/sensors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.data),
        });
        if (res.ok) {
          setPendingSync(prev => prev.filter(p => p.id !== item.id));
          synced++;
        }
      } catch { break; }
    }
    if (synced > 0) setLastSyncTime(new Date().toLocaleTimeString());
    setIsSyncing(false);
  };

  const clearCache = () => {
    if (confirm("¿Borrar todos los datos locales no sincronizados? Esta acción no se puede deshacer."))
      setPendingSync([]);
  };

  const lastRead = pendingSync[0]?.data ?? null;

  const recommendations = (d: any) => {
    if (!d) return [];
    const list = [];
    if (d.ph > 8.0)
      list.push({ icon: "🚫", severity: "alta",    color: "#A34A3E", bg: "#A34A3E12",
        title: `pH alcalino detectado (${d.ph})`,
        desc: "El pH supera el límite saludable (8.0). Causa probable: uso de cremas y bloqueadores solares por turistas. Recomendación: restringir acceso temporalmente y tomar muestras para laboratorio." });
    else if (d.ph >= 6.5)
      list.push({ icon: "✅", severity: "óptimo",  color: "#4A7C59", bg: "#4A7C5912",
        title: `pH en rango óptimo (${d.ph})`,
        desc: "El agua mantiene un índice neutro y purificado. Las condiciones son favorables para la fauna y flora endémica del cenote." });
    if (d.turbidez > 4)
      list.push({ icon: "⚠️", severity: "media",   color: "#C9A227", bg: "#C9A22712",
        title: `Visibilidad reducida (${d.turbidez} NTU)`,
        desc: "El agua está turbia. Verificar deslaves, obras de construcción o actividad agrícola cercana que pueda estar filtrando sedimentos al manto freático." });
    if (d.temperatura > 26.5)
      list.push({ icon: "🌡️", severity: "media", color: "#d97706", bg: "#d9770612",
        title: `Temperatura elevada (${d.temperatura} °C)`,
        desc: "Temperatura sobre 26.5 °C favorece la proliferación de algas nocivas que asfixian a la fauna nativa del cenote. Monitorear en las próximas 24 h." });
    return list;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--lympha-sand)" }}>

      {/* ── HEADER ── */}
      <header
        style={{ backgroundColor: "var(--lympha-walnut)" }}
        className="px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
      >
        <div className="flex items-center gap-4">
          {/* Back button */}
          <Link
            href="/"
            className="p-2 rounded-xl transition-opacity hover:opacity-70 flex-shrink-0"
            style={{ backgroundColor: "#C9A22715" }}
          >
            <LayoutDashboard className="w-5 h-5" style={{ color: "var(--lympha-amber)" }} />
          </Link>

          {/* Logo */}
          <div className="h-8 w-auto flex items-center">
            <Image
              src="/logo.png"
              alt="Lympha"
              width={100}
              height={32}
              style={{ objectFit: "contain" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>

          {/* Fallback brand + page context */}
          <div className="flex items-center gap-2 pl-3 border-l border-white/10">
            <div>
              <h1 className="text-base font-bold text-white leading-none serif-italic">
                Recolector de Campo
              </h1>
              <p className="text-xs mt-0.5 font-medium" style={{ color: "#C9A22780" }}>
                {isOnline ? "Panel de recomendaciones activo" : "Modo sin conexión — datos locales"}
              </p>
            </div>
          </div>
        </div>

        {/* Network badge */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border self-start sm:self-auto"
          style={{
            backgroundColor: isOnline ? "#4A7C5915" : "#C9A22715",
            borderColor:     isOnline ? "#4A7C5940" : "#C9A22740",
            color:           isOnline ? "#4A7C59"   : "#C9A227",
          }}
        >
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {isOnline ? "ONLINE" : "OFF-THE-GRID"}
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT PANEL ── */}
        <div className="lg:col-span-4 space-y-5">

          {/* Bluetooth connect */}
          <div
            className="rounded-2xl p-6 shadow-sm border"
            style={{ backgroundColor: "var(--lympha-walnut)", borderColor: "#C9A22725" }}
          >
            <h2 className="font-bold mb-1 flex items-center gap-2 text-white serif-italic text-xl">
              <Bluetooth style={{ color: "var(--lympha-amber)" }} className="w-5 h-5" />
              Vínculo de campo
            </h2>
            <p className="text-xs mb-5 font-medium" style={{ color: "#C9A22770" }}>
              Conecta la boya vía Bluetooth Low Energy
            </p>

            <div className="space-y-3">
              <button
                onClick={connectBluetooth}
                disabled={isConnecting || !isWebBluetoothSupported}
                className="w-full py-4 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                style={{ backgroundColor: "var(--lympha-amber)", color: "var(--lympha-walnut)" }}
              >
                {isConnecting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {isConnecting ? "Buscando BLE..." : "Conectar boya"}
              </button>

              <button
                onClick={simulateData}
                className="w-full py-3 rounded-xl font-medium text-sm transition-all active:scale-95 border flex items-center justify-center gap-2"
                style={{ backgroundColor: "#C9A22710", borderColor: "#C9A22735", color: "#C9A227" }}
              >
                Simular dato (prueba)
              </button>
            </div>

            {device && (
              <div
                className="mt-4 p-3 rounded-xl flex items-center gap-3 border"
                style={{ backgroundColor: "#4A7C5915", borderColor: "#4A7C5940" }}
              >
                <Bluetooth className="w-5 h-5 flex-shrink-0" style={{ color: "#4A7C59" }} />
                <div>
                  <p className="text-sm font-semibold text-white">{device.name || "ESP32 Boya"}</p>
                  <p className="text-xs font-medium" style={{ color: "#4A7C59" }}>Conectado · BLE</p>
                </div>
              </div>
            )}
          </div>

          {/* Cache / sync panel */}
          <div
            className="rounded-2xl p-5 shadow-sm border"
            style={{ backgroundColor: "var(--lympha-cream)", borderColor: "#C9A22725" }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold flex items-center gap-2 text-sm"
                style={{ color: "var(--lympha-walnut)" }}>
                <Database className="w-4 h-4" style={{ color: "var(--lympha-amber)" }} />
                Almacenamiento local
              </h3>
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "#C9A22715", color: "var(--lympha-amber)" }}
              >
                {pendingSync.length} registros
              </span>
            </div>

            {lastSyncTime && (
              <p className="text-xs font-medium mb-3 px-3 py-2 rounded-lg"
                style={{ backgroundColor: "#4A7C5912", color: "#4A7C59" }}>
                Última sincronización: {lastSyncTime}
              </p>
            )}

            {pendingSync.length > 0 ? (
              <div className="space-y-2">
                {isOnline && (
                  <button
                    onClick={syncAll}
                    disabled={isSyncing}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl text-white shadow-sm transition active:scale-95"
                    style={{ backgroundColor: "var(--lympha-walnut)" }}
                  >
                    {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                    {isSyncing ? "Sincronizando..." : "Subir a la nube"}
                  </button>
                )}
                <button
                  onClick={clearCache}
                  className="w-full text-xs font-semibold py-2 rounded-xl transition"
                  style={{ color: "var(--lympha-terracota)", backgroundColor: "#A34A3E0D" }}
                >
                  Purgar caché local
                </button>
              </div>
            ) : (
              <p
                className="text-xs font-medium text-center py-4 rounded-xl border border-dashed"
                style={{ borderColor: "#C9A22730", color: "#0F172A50" }}
              >
                Todo está sincronizado ✓
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="lg:col-span-8">

          {/* OFFLINE: last local reading */}
          {!isOnline && (
            <div
              className="rounded-2xl p-6 md:p-8 shadow-sm border h-full"
              style={{ backgroundColor: "var(--lympha-cream)", borderColor: "#C9A22728" }}
            >
              <h2 className="text-2xl font-bold serif-italic mb-1" style={{ color: "var(--lympha-walnut)" }}>
                Última extracción de campo
              </h2>
              <p className="text-sm font-medium mb-8" style={{ color: "#0F172A60" }}>
                Datos almacenados localmente. Conéctate a internet para el análisis inteligente.
              </p>

              {lastRead ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { k: "pH",           v: lastRead.ph },
                    { k: "Turbidez NTU", v: lastRead.turbidez },
                    { k: "Temp. °C",     v: lastRead.temperatura },
                  ].map(({ k, v }) => (
                    <div
                      key={k}
                      className="rounded-2xl p-6 text-center"
                      style={{ backgroundColor: "var(--lympha-walnut)" }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                        style={{ color: "#C9A22780" }}>{k}</p>
                      <p className="text-5xl font-bold serif-italic" style={{ color: "var(--lympha-amber)" }}>
                        {v.toFixed(1)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed"
                  style={{ borderColor: "#C9A22730" }}
                >
                  <Activity className="w-10 h-10 mb-3" style={{ color: "#C9A22740" }} />
                  <p className="text-sm font-medium" style={{ color: "#0F172A50" }}>
                    Sin lecturas descargadas hoy
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ONLINE: smart recommendations */}
          {isOnline && (
            <div
              className="rounded-2xl p-6 md:p-8 shadow-sm border h-full"
              style={{ backgroundColor: "var(--lympha-cream)", borderColor: "#4A7C5928" }}
            >
              <h2 className="text-2xl font-bold serif-italic mb-1" style={{ color: "var(--lympha-walnut)" }}>
                Diagnóstico del cenote
              </h2>
              <p className="text-sm font-medium mb-6" style={{ color: "#0F172A60" }}>
                Análisis automático basado en la última lectura registrada
              </p>

              {!lastRead ? (
                <div
                  className="p-5 rounded-2xl border flex items-start gap-3"
                  style={{ backgroundColor: "#0EA5E910", borderColor: "#0EA5E925" }}
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--lympha-iot)" }} />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--lympha-slate)" }}>
                      En espera de datos
                    </p>
                    <p className="text-sm mt-1" style={{ color: "#0F172A70" }}>
                      Conecta la boya o usa "Simular dato" para activar el diagnóstico.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations(lastRead).map((rec, i) => (
                    <div
                      key={i}
                      className="p-4 md:p-5 rounded-2xl border flex items-start gap-4"
                      style={{ backgroundColor: rec.bg, borderColor: `${rec.color}28` }}
                    >
                      <span className="text-2xl leading-none flex-shrink-0">{rec.icon}</span>
                      <div>
                        <p className="font-semibold text-sm mb-1" style={{ color: rec.color }}>
                          {rec.title}
                        </p>
                        <p className="text-sm leading-relaxed" style={{ color: "#0F172A80" }}>
                          {rec.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recommendations(lastRead).length === 0 && (
                    <div
                      className="p-5 rounded-2xl border flex items-start gap-3"
                      style={{ backgroundColor: "#4A7C5912", borderColor: "#4A7C5928" }}
                    >
                      <Droplets className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#4A7C59" }} />
                      <p className="text-sm font-medium" style={{ color: "#4A7C59" }}>
                        Todos los parámetros son normales. El cenote está en buen estado.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── FOOTER ── */}
      <footer className="px-8 py-4 mt-4 text-center border-t" style={{ borderColor: "#C9A22715" }}>
        <p className="text-xs font-medium" style={{ color: "#0F172A40" }}>
          Lympha · Cenote Water Intelligence · Modo {isOnline ? "Online" : "Offline"}
        </p>
      </footer>
    </div>
  );
}

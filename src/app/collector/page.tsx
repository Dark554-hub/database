/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Bluetooth, 
  BluetoothOff, 
  LayoutDashboard, 
  RefreshCw, 
  Zap, 
  Database,
  Search,
  CheckCircle2,
  AlertCircle,
  Terminal
} from "lucide-react";
import Link from "next/link";

interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: "info" | "success" | "error" | "data";
}

export default function BluetoothCollector() {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<"disconnected" | "connected" | "syncing">("disconnected");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastData, setLastData] = useState<any>(null);
  const [isWebBluetoothSupported, setIsWebBluetoothSupported] = useState(true);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsWebBluetoothSupported(typeof navigator !== 'undefined' && !!navigator.bluetooth);
    addLog("Sistema iniciado. Listo para recolectar datos.", "info");
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (message: string, type: LogEntry["type"]) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message,
      type
    };
    setLogs(prev => [...prev.slice(-49), newLog]);
  };

  const connectBluetooth = async () => {
    if (!isWebBluetoothSupported) {
      addLog("Web Bluetooth no es compatible con este navegador.", "error");
      return;
    }

    setIsConnecting(true);
    addLog("Iniciando escaneo de dispositivos Bluetooth...", "info");

    try {
      // Intentamos aceptar todos los dispositivos para máxima compatibilidad
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        // Algunos servicios comunes que suelen usar los ESP32 (UART, Generic)
        optionalServices: [
          '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10
          '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
        ]
      });

      setDevice(device);
      addLog(`Dispositivo encontrado: ${device.name || "Sin nombre"}`, "success");

      device.addEventListener('gattserverdisconnected', onDisconnected);

      addLog("Conectando al servidor GATT...", "info");
      const server = await device.gatt?.connect();
      
      setStatus("connected");
      addLog("Conexión establecida correctamente.", "success");

      // Buscar servicios disponibles
      const services = await server?.getPrimaryServices();
      addLog(`Servicios encontrados: ${services?.length || 0}`, "info");

      for (const service of services || []) {
        addLog(`Explorando servicio: ${service.uuid}`, "info");
        const characteristics = await service.getCharacteristics();
        
        for (const characteristic of characteristics) {
          if (characteristic.properties.notify || characteristic.properties.indicate) {
            addLog(`Suscrito a notificaciones: ${characteristic.uuid}`, "success");
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', handleBluetoothData);
          }
        }
      }

    } catch (error: any) {
      addLog(`Error: ${error.message}`, "error");
      setIsConnecting(false);
    }
  };

  const onDisconnected = () => {
    setDevice(null);
    setStatus("disconnected");
    setIsConnecting(false);
    addLog("Dispositivo desconectado.", "error");
  };

  const handleBluetoothData = (event: any) => {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const csvString = decoder.decode(value).trim();
    
    if (csvString) {
      addLog(`Dato recibido (Raw): ${csvString}`, "data");
      processCSVData(csvString);
    }
  };

  const processCSVData = (csv: string) => {
    // Ejemplo esperado: pH,Temp,Turbidez -> "7.2,25.5,10.1"
    const parts = csv.split(',').map(p => parseFloat(p.trim()));
    
    if (parts.length >= 2 && !parts.some(isNaN)) {
      const payload: any = {
        ph: parts[0],
        temperatura: parts[1],
      };
      
      if (parts[2] !== undefined) payload.turbidez = parts[2];
      if (parts[3] !== undefined) payload.nitratos = parts[3];

      setLastData(payload);
      syncToDatabase(payload);
    } else {
      addLog("Formato CSV inválido o incompleto.", "error");
    }
  };

  const syncToDatabase = async (payload: any) => {
    setStatus("syncing");
    try {
      const res = await fetch("/api/sensors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        addLog("Sincronizado con Vercel/Supabase con éxito.", "success");
      } else {
        addLog("Error al sincronizar con la API.", "error");
      }
    } catch (err) {
      addLog("Error de red al intentar sincronizar.", "error");
    } finally {
      setStatus("connected");
    }
  };

  const simulateData = () => {
    const ph = 7 + (Math.random() * 0.4 - 0.2);
    const temp = 24 + (Math.random() * 2);
    const turb = 10 + (Math.random() * 5);
    const csv = `${ph.toFixed(2)},${temp.toFixed(1)},${turb.toFixed(1)}`;
    
    addLog(`Simulando recepción CSV: ${csv}`, "info");
    processCSVData(csv);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <Link 
            href="/"
            className="p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-white/5 transition-colors"
          >
            <LayoutDashboard className="w-6 h-6 text-neutral-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              Recolector de Datos
            </h1>
            <p className="text-sm text-neutral-400 flex items-center gap-2 mt-1">
              <Bluetooth className="w-4 h-4" /> Enlace vía Web Bluetooth API
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isWebBluetoothSupported && (
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Navegador no compatible
            </div>
          )}
          <div className={`px-4 py-2 rounded-full text-xs font-medium border flex items-center gap-2 transition-all ${
            status === "disconnected" ? "bg-neutral-900 border-white/5 text-neutral-500" :
            status === "connected" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
            "bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse"
          }`}>
            <span className={`h-2 w-2 rounded-full ${
              status === "disconnected" ? "bg-neutral-600" :
              status === "connected" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
              "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            }`} />
            {status === "disconnected" ? "Desconectado" :
             status === "connected" ? "Boya Conectada" : "Sincronizando..."}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panel Izquierdo: Acciones y Estado */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-neutral-900 rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500" />
            
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-400" /> Control de Enlace
            </h2>

            <div className="space-y-4">
              <button
                onClick={connectBluetooth}
                disabled={isConnecting || status !== "disconnected" || !isWebBluetoothSupported}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 active:scale-95"
              >
                {isConnecting ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <Search className="w-6 h-6" />
                )}
                {isConnecting ? "Buscando..." : "Escanear Boya"}
              </button>

              <button
                onClick={simulateData}
                className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-2xl font-medium transition-all flex items-center justify-center gap-2 border border-white/5 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Simular Dato (Prueba)
              </button>

              {device && (
                <div className="mt-6 p-4 bg-neutral-800/50 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-xs text-neutral-500 uppercase tracking-widest mb-2">Dispositivo Vinculado</p>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Bluetooth className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-emerald-100">{device.name || "ESP32 Sensor Node"}</h4>
                      <p className="text-xs text-neutral-400">ID: {device.id}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta de último dato */}
          <div className="bg-neutral-900 rounded-3xl border border-white/5 p-8">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" /> Última Lectura
            </h2>
            
            {lastData ? (
              <div className="space-y-4">
                {Object.entries(lastData).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex justify-between items-center p-3 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-neutral-400 capitalize">{key}</span>
                    <span className="text-white font-mono font-bold text-lg">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 border border-dashed border-white/10 rounded-2xl text-neutral-500 italic text-sm">
                Esperando datos...
              </div>
            )}
          </div>
        </div>

        {/* Panel Derecho: Consola de Logs */}
        <div className="lg:col-span-2">
          <div className="bg-neutral-900 rounded-3xl border border-white/5 h-full flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 bg-neutral-900/50 flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Terminal className="w-5 h-5 text-neutral-400" /> Consola de Operación
              </h2>
              <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-1 rounded border border-white/10 uppercase tracking-wider">
                Real-Time Stream
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-xs scrollbar-hide min-h-[400px] max-h-[600px]">
              {logs.length === 0 && (
                <p className="text-neutral-600 italic">No hay actividad registrada...</p>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2 transition-all">
                  <span className="text-neutral-600 whitespace-nowrap">
                    [{formatTimestamp(log.timestamp)}]
                  </span>
                  <div className="flex items-start gap-2">
                    {log.type === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />}
                    {log.type === "error" && <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5" />}
                    {log.type === "data" && <Database className="w-3.5 h-3.5 text-blue-500 mt-0.5" />}
                    
                    <span className={`
                      ${log.type === "success" ? "text-emerald-400" : ""}
                      ${log.type === "error" ? "text-red-400 font-bold" : ""}
                      ${log.type === "data" ? "text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded" : ""}
                      ${log.type === "info" ? "text-neutral-400" : ""}
                    `}>
                      {log.message}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            <div className="p-4 bg-black/20 border-t border-white/5 flex justify-end">
              <button 
                onClick={() => setLogs([])}
                className="text-[10px] text-neutral-500 hover:text-neutral-300 uppercase tracking-widest transition-colors"
              >
                Limpiar Consola
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(date: Date) {
  return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

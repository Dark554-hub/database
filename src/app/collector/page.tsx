/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { 
  Bluetooth, 
  LayoutDashboard, 
  RefreshCw, 
  Database,
  Search,
  Wifi,
  WifiOff,
  CloudUpload,
  Activity,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

interface PendingRead {
  id: string;
  data: any;
  timestamp: string;
}

export default function MobileCollectorPWA() {
  const [device, setDevice] = useState<any | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSync, setPendingSync] = useState<PendingRead[]>([]);
  const [isWebBluetoothSupported, setIsWebBluetoothSupported] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load Initial Network & Cache State
  useEffect(() => {
    setIsWebBluetoothSupported(typeof navigator !== 'undefined' && !!(navigator as any).bluetooth);
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cargar cola de pendiente desde LocalStorage (Modo Offline)
    const stored = localStorage.getItem('cenote_offline_queue');
    if (stored) {
      try {
         setPendingSync(JSON.parse(stored));
      } catch (e) {
         console.error("Cache corrupted");
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Guarda en caché cada vez que hay cambios en la cola
  useEffect(() => {
    localStorage.setItem('cenote_offline_queue', JSON.stringify(pendingSync));
  }, [pendingSync]);

  // Si se vuelve a conectar a internet y hay datos pendientes, Sincronizar automáticamente.
  useEffect(() => {
    if (isOnline && pendingSync.length > 0 && !isSyncing) {
      syncPendingData();
    }
  }, [isOnline, pendingSync.length]);

  const connectBluetooth = async () => {
    if (!isWebBluetoothSupported) {
      alert("Navegador no soporta Bluetooth Web. Usa Chrome para Android/PC.");
      return;
    }

    setIsConnecting(true);

    try {
      const bDevice = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
        ]
      });

      setDevice(bDevice);
      bDevice.addEventListener('gattserverdisconnected', () => setDevice(null));

      const server = await bDevice.gatt?.connect();
      const services = await server?.getPrimaryServices();

      for (const service of services || []) {
        const characteristics = await service.getCharacteristics();
        for (const characteristic of characteristics) {
          if (characteristic.properties.notify || characteristic.properties.indicate) {
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', handleBluetoothData);
          }
        }
      }
    } catch (error: any) {
      console.warn(`Operación cancelada o fallida: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBluetoothData = (event: any) => {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const csvString = decoder.decode(value).trim();
    if (csvString) processCSVData(csvString);
  };

  const processCSVData = (csv: string) => {
    // Expected incoming CSV format: pH, turbidity, temp
    const parts = csv.split(',').map(p => parseFloat(p.trim()));
    if (parts.length >= 3 && !parts.some(isNaN)) {
      const payload = {
        ph: parts[0],
        turbidez: parts[1],
        temperatura: parts[2]
      };
      
      const newRead: PendingRead = {
        id: Math.random().toString(36).substr(2, 9),
        data: payload,
        timestamp: new Date().toISOString()
      };

      setPendingSync(prev => [newRead, ...prev]);
    }
  };

  const simulateData = () => {
    const csv = `${(Math.random() * 2 + 6.5).toFixed(2)},${(Math.random() * 3 + 1).toFixed(2)},${(Math.random() * 5 + 24).toFixed(1)}`;
    processCSVData(csv);
  };

  const syncPendingData = async () => {
    setIsSyncing(true);
    for (const item of pendingSync) {
      try {
        const res = await fetch("/api/sensors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.data)
        });

        if (res.ok) {
           // Si se guardó, lo sacamos de la cola
           setPendingSync(prev => prev.filter(p => p.id !== item.id));
        }
      } catch (e) {
        console.error("Fallo de red en plena subida, guardando en caché restante");
        break; 
      }
    }
    setIsSyncing(false);
  };

  // UI helpers
  const clearCache = () => {
    if (confirm("¿Estás seguro de que quieres borrar todos los datos no sincronizados localmente? No se recuperarán.")) {
      setPendingSync([]);
    }
  };

  // --- RENDERING ---
  const lastRead = pendingSync.length > 0 ? pendingSync[0].data : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-200 p-4 md:p-8">
      
      {/* HEADER START */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/"
            className="p-3 bg-white shadow-sm border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <LayoutDashboard className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              {isOnline ? "Panel de Recomendaciones" : "Consola de Extracción (Offline)"}
            </h1>
            <p className="text-sm text-slate-500 font-medium">Boya de Monitoreo Cenote</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm border ${
            isOnline ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-orange-50 border-orange-200 text-orange-700"
          }`}>
             {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
             {isOnline ? "ONLINE" : "MODO OFF-THE-GRID"}
          </div>
        </div>
      </header>

      {/* CORE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* BLUETOOTH & SYNC CARD (Col 4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Bluetooth className="w-5 h-5 text-blue-500" /> Vínculo de Campo
            </h2>

            <div className="space-y-4">
              <button
                onClick={connectBluetooth}
                disabled={isConnecting || !isWebBluetoothSupported}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isConnecting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {isConnecting ? "Buscando BLE..." : "Conectar Boya"}
              </button>

              <button
                onClick={simulateData}
                className="w-full py-3 bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                Simular Inyección Local
              </button>
            </div>

            {device && (
              <div className="mt-4 p-4 border border-blue-100 bg-blue-50 rounded-xl flex items-center gap-3">
                <Bluetooth className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-bold text-blue-900">{device.name || "ESP32 Conectado"}</span>
              </div>
            )}
          </div>

          {/* CACHE METRICS */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" /> Memoria Caché
              </h3>
              <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md">
                {pendingSync.length} registros
              </span>
            </div>
            
            {pendingSync.length > 0 ? (
              <div className="space-y-4">
                 <button 
                  onClick={clearCache}
                  className="w-full text-sm font-bold text-red-500 py-2 bg-red-50 hover:bg-red-100 rounded-xl transition"
                 >
                   Purgar Caché Local
                 </button>
                 
                 {isOnline && (
                   <button 
                    onClick={syncPendingData}
                    disabled={isSyncing}
                    className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white py-3 bg-slate-800 hover:bg-slate-900 rounded-xl transition shadow-md"
                   >
                     {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                     {isSyncing ? "Subiendo..." : "Forzar Sincronización"}
                   </button>
                 )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 font-medium text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Todo está subido a la nube.
              </p>
            )}
          </div>
        </div>

        {/* DATA & DASHBOARD AREA (Col 8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* OFFLINE ONLY: Last local read details */}
          {!isOnline && (
            <div className="bg-white rounded-3xl shadow-sm border border-orange-200 p-8 h-full flex flex-col justify-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl" />
               <div className="relative z-10">
                 <h2 className="text-xl font-bold flex items-center gap-2 mb-2 text-slate-800">
                    <Activity className="w-6 h-6 text-orange-500" /> Última Extracción de Campo
                 </h2>
                 <p className="text-slate-500 text-sm mb-8 font-medium">Buscando datos localmente vía Caché. Conéctate a WiFi para el análisis inteligente.</p>

                 {lastRead ? (
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="p-6 border border-slate-100 bg-slate-50 rounded-2xl shadow-sm">
                       <p className="text-sm font-bold text-slate-400 mb-1">pH Registrado</p>
                       <p className="text-4xl font-black text-slate-800">{lastRead.ph}</p>
                     </div>
                     <div className="p-6 border border-slate-100 bg-slate-50 rounded-2xl shadow-sm">
                       <p className="text-sm font-bold text-slate-400 mb-1">Turbidez</p>
                       <p className="text-4xl font-black text-slate-800">{lastRead.turbidez}</p>
                     </div>
                     <div className="p-6 border border-slate-100 bg-slate-50 rounded-2xl shadow-sm">
                       <p className="text-sm font-bold text-slate-400 mb-1">Temperatura</p>
                       <p className="text-4xl font-black text-slate-800">{lastRead.temperatura}°C</p>
                     </div>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center p-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold">
                     Ningún dato descargado hoy
                   </div>
                 )}
               </div>
            </div>
          )}

          {/* ONLINE ONLY: Smart Dashboard Recommendations */}
          {isOnline && (
            <div className="bg-white rounded-3xl shadow-sm border border-emerald-200 p-8 h-full">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 mb-6 border-b border-slate-100 pb-4">
                💡 Base de Datos Inteligente — Recomendaciones Actionables
              </h2>
              
              <div className="space-y-4">
                {!lastRead ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
                     <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0" />
                     <div>
                       <h4 className="font-bold text-blue-900 text-lg">En Espera de Datos Locales</h4>
                       <p className="text-blue-700 text-sm mt-1">Conéctate a la boya o descarga datos del caché para que la nube pueda generar una lectura situacional. Ve al menú principal para usar los simuladores predictivos.</p>
                     </div>
                  </div>
                ) : (
                  <>
                     {/* Dynamic Recommendations based on Last Read */}
                     {lastRead.ph > 8.0 && (
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex items-start gap-4">
                           <AlertCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
                           <div>
                             <h4 className="font-bold text-rose-900 text-lg">Alerta: Nivel Alcalino Alto (pH {lastRead.ph})</h4>
                             <p className="text-rose-700 text-sm mt-1 font-medium">El pH ha superado el límite sano. Recomendación civil: Restringir acceso al cenote. Causa probable: Exceso de turistas utilizando cremas, jabones corporales o bloqueadores solares de alto impacto.</p>
                           </div>
                        </div>
                     )}

                     {lastRead.ph <= 8.0 && lastRead.ph >= 6.5 && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-start gap-4">
                           <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                           <div>
                             <h4 className="font-bold text-emerald-900 text-lg">Acidez Óptima (pH {lastRead.ph})</h4>
                             <p className="text-emerald-700 text-sm mt-1 font-medium">El agua se mantiene en un espectro purificado y neutro. Excelente salud biológica.</p>
                           </div>
                        </div>
                     )}

                     {lastRead.turbidez > 4.0 && (
                       <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4">
                           <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                           <div>
                             <h4 className="font-bold text-amber-900 text-lg">Visibilidad Crítica (Turbidez {lastRead.turbidez} NTU)</h4>
                             <p className="text-amber-700 text-sm mt-1 font-medium">El cenote sufre de agua embarrada. Recomendación ecológica: Revisar deslaves recientes o construcciones masivas cavando cerca del manto freático subterráneo.</p>
                           </div>
                        </div>
                     )}

                     {lastRead.temperatura > 26.5 && (
                       <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 flex items-start gap-4">
                           <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0" />
                           <div>
                             <h4 className="font-bold text-orange-900 text-lg">Calentamiento Acuoso (Temp {lastRead.temperatura} °C)</h4>
                             <p className="text-orange-700 text-sm mt-1 font-medium">Cuidado con la proliferación de algas nocivas. Temperaturas encima de 26°C disparan la biomasa verde asfixiando a la fauna endémica del cenote.</p>
                           </div>
                        </div>
                     )}
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

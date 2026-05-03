// simulador-datos.js — Inyector de datos de prueba para Flotaya
// Elige a cuál servidor enviar los datos:
const URL_LOCAL  = "http://localhost:3000/api/lecturas";
const URL_VERCEL = "https://database-ebon-kappa.vercel.app/api/lecturas"; // Servidor en producción

// Elige cuál de las dos usar editando esta variable (URL_LOCAL o URL_VERCEL)
const URL_OBJETIVO = URL_VERCEL; 

const enviarDatos = async () => {
  // Estos son números inventados para la prueba usando el método "fetch"
  const datosFalsos = {
    ph: parseFloat((Math.random() * 2 + 6.5).toFixed(2)),         // Ej: 6.5 - 8.5
    turbidez: parseFloat((Math.random() * 3 + 1).toFixed(2)),     // Ej: 1.0 - 4.0
    temperatura: parseFloat((Math.random() * 5 + 24).toFixed(1))  // Ej: 24 - 29
  };

  try {
    const respuesta = await fetch(URL_OBJETIVO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datosFalsos)
    });

    if(respuesta.ok) {
       console.log(`✅ [Éxito] Se enviaron datos a ${URL_OBJETIVO}`, datosFalsos);
    } else {
       console.log(`❌ [Fallo] El servidor respondió con error: ${respuesta.status}`);
    }
  } catch (error) {
    console.error("❌ [Error] No se pudo conectar (¿Está prendido el servidor?):", error.message);
  }
};

console.log("📡 Encendiendo Sensor Falso... Enviará datos cada 3 segundos. Para apagar presiona Ctrl+C");
setInterval(enviarDatos, 3000);

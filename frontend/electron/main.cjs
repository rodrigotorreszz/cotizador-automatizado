
const { app, BrowserWindow } = require("electron");
const express = require("express");
const path = require("node:path");

const PORT = 4173;

let servidor;
let ventana;

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    title: "A&S Aluminio y Vidrio",

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  ventana.loadURL(`http://127.0.0.1:${PORT}`);

  ventana.on("closed", () => {
    ventana = null;
  });
}

app.whenReady().then(() => {
  const servidorApp = express();

  // Carpeta generada por Vite
  const carpetaDist = path.join(__dirname, "..", "dist");

  // Servir archivos estáticos de React
  servidorApp.use(express.static(carpetaDist));

  // Permitir que React Router maneje las rutas
  servidorApp.use((req, res) => {
    res.sendFile(path.join(carpetaDist, "index.html"));
  });

  servidor = servidorApp.listen(PORT, "127.0.0.1", () => {
    console.log(`Aplicación disponible en http://127.0.0.1:${PORT}`);

    crearVentana();
  });

  servidor.on("error", (error) => {
    console.error("Error iniciando servidor local:", error);
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && servidor) {
    crearVentana();
  }
});

app.on("before-quit", () => {
  if (servidor) {
    servidor.close();
  }
});


const {
  app,
  BrowserWindow,
  protocol,
  net,
} = require("electron");

const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

// ========================================
// REGISTRAR PROTOCOLO PERSONALIZADO
// ========================================

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

let ventana;

// Carpeta de archivos compilados de React
const carpetaDist = path.join(__dirname, "..", "dist");

// ========================================
// CONFIGURAR PROTOCOLO APP
// ========================================

function configurarProtocolo() {
  protocol.handle("app", async (request) => {
    try {
      const url = new URL(request.url);
      const rutaSolicitada = decodeURIComponent(url.pathname);

      let archivo = path.resolve(
        carpetaDist,
        `.${rutaSolicitada}`
      );

      // Evitar acceso fuera de la carpeta dist
      if (
        archivo !== carpetaDist &&
        !archivo.startsWith(carpetaDist + path.sep)
      ) {
        return new Response("Acceso denegado", {
          status: 403,
        });
      }

      // Comprobar si existe el archivo
      // Si no existe, cargar index.html para React Router
      if (
        !fs.existsSync(archivo) ||
        fs.statSync(archivo).isDirectory()
      ) {
        archivo = path.join(carpetaDist, "index.html");
      }

      return net.fetch(pathToFileURL(archivo).toString());

    } catch (error) {
      console.error("Error cargando archivo:", error);

      return new Response("No se pudo cargar la aplicación", {
        status: 500,
      });
    }
  });
}

// ========================================
// CREAR VENTANA PRINCIPAL
// ========================================

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 650,

    title: "AS Aluminio y Vidrio",

    autoHideMenuBar: true,
    show: false,
    backgroundColor: "#ffffff",

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Mostrar ventana cuando esté lista
  ventana.once("ready-to-show", () => {
    ventana.show();
  });

  // Cargar aplicación mediante protocolo personalizado
  ventana.loadURL("app://localhost/");

  // Detectar errores de carga
  ventana.webContents.on(
    "did-fail-load",
    (_, code, description) => {
      console.error(
        "Error cargando aplicación:",
        code,
        description
      );
    }
  );

  // Limpiar referencia al cerrar
  ventana.on("closed", () => {
    ventana = null;
  });
}

// ========================================
// INICIO DE ELECTRON
// ========================================

app.whenReady().then(() => {
  configurarProtocolo();

  crearVentana();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      crearVentana();
    }
  });
});

// ========================================
// CERRAR APLICACIÓN
// ========================================

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

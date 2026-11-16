
const {
  app,
  BrowserWindow,
  protocol,
  net,
} = require("electron");

const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

// Registrar el protocolo antes de iniciar Electron.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

let ventana;

const carpetaDist = path.join(__dirname, "..", "dist");

function configurarProtocolo() {
  protocol.handle("app", async (request) => {
    try {
      const url = new URL(request.url);
      const rutaSolicitada = decodeURIComponent(url.pathname);

      let archivo = path.resolve(
        carpetaDist,
        `.${rutaSolicitada}`
      );

      // Evitar que se acceda a archivos fuera de dist.
      if (
        archivo !== carpetaDist &&
        !archivo.startsWith(carpetaDist + path.sep)
      ) {
        return new Response("Acceso denegado", {
          status: 403
        });
      }

      // Si no existe el archivo, cargar index.html.
      // Esto permite mantener las rutas de React Router.
      if (!fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
        archivo = path.join(carpetaDist, "index.html");
      }

      return net.fetch(pathToFileURL(archivo).toString());

    } catch (error) {
      console.error("Error cargando archivo:", error);

      return new Response("No se pudo cargar la aplicación", {
        status: 500
      });
    }
  });
}

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
      sandbox: true
    }
  });

  ventana.once("ready-to-show", () => {
    ventana.show();
  });

  ventana.loadURL("app://localhost/");

  ventana.webContents.on("did-fail-load", (_, code, description) => {
    console.error("Error cargando aplicación:", code, description);
  });

  ventana.on("closed", () => {
    ventana = null;
  });
}

app.whenReady().then(() => {
  configurarProtocolo();

  crearVentana();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      crearVentana();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

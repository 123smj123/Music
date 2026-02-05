const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(express.static(process.cwd() + '/client'));

// Configuración de Multer
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// Servir archivos estáticos
app.use(express.static("public"));
app.use("/music", express.static("uploads"));

// Subir música
app.post("/upload", upload.single("song"), (req, res) => {
  res.redirect("/");
});

// Listar canciones
app.get("/songs", (req, res) => {
  fs.readdir("uploads", (err, files) => {
    res.json(files);
  });
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});

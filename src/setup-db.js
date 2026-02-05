const db = require("./db");

async function setup() {
  console.log("🔧 Configurando base de datos MySQL...\n");

  try {
    await db.initDB();
    console.log("\n✅ Base de datos configurada correctamente");
    console.log("📊 Puedes conectarte desde HeidiSQL con estos datos:");
    console.log(`   Host: ${process.env.DB_HOST || "localhost"}`);
    console.log(`   Puerto: ${process.env.DB_PORT || 3306}`);
    console.log(`   Usuario: ${process.env.DB_USER || "root"}`);
    console.log(`   Base de datos: ${process.env.DB_NAME || "music_db"}`);

    // Mostrar estructura de la tabla
    console.log("\n📋 Estructura de la tabla 'songs':");
    console.log("   - id (INT, AUTO_INCREMENT, PRIMARY KEY)");
    console.log("   - filename (VARCHAR(255), UNIQUE)");
    console.log("   - original_name (VARCHAR(255))");
    console.log("   - title (VARCHAR(255))");
    console.log("   - artist (VARCHAR(255))");
    console.log("   - album (VARCHAR(255))");
    console.log("   - duration (INT, nullable)");
    console.log("   - size (BIGINT)");
    console.log("   - upload_date (TIMESTAMP)");
    console.log("   - updated_at (TIMESTAMP)");

    await db.closePool();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error durante la configuración:", error.message);
    console.error("\n💡 Asegúrate de que:");
    console.error("   1. MySQL está instalado y ejecutándose");
    console.error("   2. Las credenciales en .env son correctas");
    console.error("   3. El usuario tiene permisos para crear bases de datos");
    process.exit(1);
  }
}

setup();
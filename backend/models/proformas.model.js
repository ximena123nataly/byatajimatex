const { v4: uuidv4 } = require("uuid"); // ID único para proforma_id
const db = require("../db");            // conexión MySQL

// Genera un código visible para la proforma (se guarda en proforma_ref)
function makeRef() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `PF-${y}${m}${day}-${rand}`;
}

// Convierte a número seguro (evita NaN)
function toNumberSafe(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * CONTROLLER: Crear Proforma
 * Endpoint: POST /proformas/add
 *
 * Recibe del frontend:
 *  - fecha, cliente, celular, items,
 *  - total_general, anticipo, saldo, estado
 *
 * Guarda en MySQL:
 *  - proforma_id (UUID) [PK]
 *  - proforma_ref (PF-YYYYMMDD-XXX)
 *  - items como JSON string
 *  - totales y estado
 */
exports.addProforma = (req, res) => {
  try {
    //  Alineado a tu frontend y a tu tabla SQL
    const {
      fecha,
      cliente,
      celular,
      items,
      total_general,
      anticipo,
      saldo,
      estado,
    } = req.body;

    // Validación mínima de datos
    if (!fecha || !cliente || !Array.isArray(items) || items.length === 0) {
      return res.json({
        operation: "failed",
        message: "Datos incompletos (fecha, cliente, items)",
      });
    }

    // ID interno único (PRIMARY KEY en tu tabla)
    const proforma_id = uuidv4();

    // Código visible (varchar(50))
    const proforma_ref = makeRef();

    // SQL INSERT (nota: NO insertamos `id` porque es AUTO_INCREMENT)
    const sql = `
      INSERT INTO proformas
      (
        proforma_id,
        proforma_ref,
        fecha,
        cliente,
        celular,
        items,
        total_general,
        anticipo,
        saldo,
        estado
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Ejecuta el INSERT
    db.query(
      sql,
      [
        proforma_id,
        proforma_ref,
        fecha,
        cliente,
        celular || "",

        // items se guarda como texto JSON (tu tabla valida json_valid(items))
        JSON.stringify(items),

        // totales en 2 decimales
        toNumberSafe(total_general).toFixed(2),
        toNumberSafe(anticipo).toFixed(2),
        toNumberSafe(saldo).toFixed(2),

        // estado por defecto
        estado || "ACTIVA",
      ],
      (err) => {
        if (err) {
          console.error("DB ERROR addProforma:", err);
          return res.json({
            operation: "failed",
            message: "Error al guardar proforma",
          });
        }

        // Respuesta exitosa al frontend
        return res.json({
          operation: "success",
          message: "Proforma guardada correctamente",
          proforma_id,
          proforma_ref,
        });
      }
    );
  } catch (error) {
    console.error("INTERNAL ERROR addProforma:", error);
    return res.json({
      operation: "failed",
      message: "Error interno",
    });
  }
};

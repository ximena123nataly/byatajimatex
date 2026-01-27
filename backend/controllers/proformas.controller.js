// =========================
// IMPORTS
// =========================
const { v4: uuidv4 } = require("uuid");          // ID único interno
const db = require("../db/conn");                // tu conexión real: backend/db/conn.js

// =========================
// HELPERS
// =========================

// Ref visible de la proforma (ej: PF-20260127-123)
function makeRef() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `PF-${y}${m}${day}-${rand}`;
}

function toNumberSafe(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// =========================
// GET /proformas
// Lista todas las proformas
// =========================
exports.getProformas = (req, res) => {
  const sql = `
    SELECT 
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
    FROM proformas
    ORDER BY fecha DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("DB ERROR getProformas:", err);
      return res.status(500).json({ operation: "failed", message: "Error al listar proformas" });
    }

    // items viene como texto JSON -> lo devolvemos como array real al frontend
    const data = (rows || []).map(r => ({
      ...r,
      items: (() => {
        try { return JSON.parse(r.items || "[]"); } catch { return []; }
      })(),
    }));

    return res.json(data);
  });
};

// =========================
// GET /proformas/:id
// Trae 1 proforma para editar/ver
// =========================
exports.getProformaById = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
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
    FROM proformas
    WHERE proforma_id = ?
    LIMIT 1
  `;

  db.query(sql, [id], (err, rows) => {
    if (err) {
      console.error("DB ERROR getProformaById:", err);
      return res.status(500).json({ operation: "failed", message: "Error al cargar proforma" });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ operation: "failed", message: "No existe la proforma" });
    }

    const p = rows[0];
    return res.json({
      ...p,
      items: (() => {
        try { return JSON.parse(p.items || "[]"); } catch { return []; }
      })(),
    });
  });
};

// =========================
// POST /proformas/add
// Crea una proforma (lo que usa tu formulario)
// =========================
exports.addProforma = (req, res) => {
  try {
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

    if (!fecha || !cliente || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        operation: "failed",
        message: "Datos incompletos (fecha, cliente, items)",
      });
    }

    const proforma_id = uuidv4();
    const proforma_ref = makeRef();

    const sql = `
      INSERT INTO proformas
      (proforma_id, proforma_ref, fecha, cliente, celular, items, total_general, anticipo, saldo, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        proforma_id,
        proforma_ref,
        fecha,
        cliente,
        celular || "",
        JSON.stringify(items),
        toNumberSafe(total_general).toFixed(2),
        toNumberSafe(anticipo).toFixed(2),
        toNumberSafe(saldo).toFixed(2),
        estado || "ACTIVA",
      ],
      (err) => {
        if (err) {
          console.error("DB ERROR addProforma:", err);
          return res.status(500).json({
            operation: "failed",
            message: "Error al guardar proforma",
          });
        }

        return res.json({
          operation: "success",
          message: "Proforma guardada correctamente",
          proforma_id,
          proforma_ref,
        });
      }
    );
  } catch (e) {
    console.error("INTERNAL ERROR addProforma:", e);
    return res.status(500).json({ operation: "failed", message: "Error interno" });
  }
};

// =========================
// PUT /proformas/:id
// Actualiza una proforma (editar)
// =========================
exports.updateProforma = (req, res) => {
  const { id } = req.params;

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

  const sql = `
    UPDATE proformas
    SET
      fecha = ?,
      cliente = ?,
      celular = ?,
      items = ?,
      total_general = ?,
      anticipo = ?,
      saldo = ?,
      estado = ?
    WHERE proforma_id = ?
  `;

  db.query(
    sql,
    [
      fecha,
      cliente,
      celular || "",
      JSON.stringify(Array.isArray(items) ? items : []),
      toNumberSafe(total_general).toFixed(2),
      toNumberSafe(anticipo).toFixed(2),
      toNumberSafe(saldo).toFixed(2),
      estado || "ACTIVA",
      id,
    ],
    (err, result) => {
      if (err) {
        console.error("DB ERROR updateProforma:", err);
        return res.status(500).json({ operation: "failed", message: "Error al actualizar" });
      }

      if (!result || result.affectedRows === 0) {
        return res.status(404).json({ operation: "failed", message: "No existe la proforma" });
      }

      return res.json({ operation: "success", message: "Proforma actualizada" });
    }
  );
};

// =========================
// DELETE /proformas/:id
// Elimina una proforma
// =========================
exports.deleteProforma = (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM proformas WHERE proforma_id = ?", [id], (err, result) => {
    if (err) {
      console.error("DB ERROR deleteProforma:", err);
      return res.status(500).json({ operation: "failed", message: "Error al eliminar" });
    }

    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ operation: "failed", message: "No existe la proforma" });
    }

    return res.json({ operation: "success", message: "Proforma eliminada" });
  });
};

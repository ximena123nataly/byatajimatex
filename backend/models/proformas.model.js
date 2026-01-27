const db = require("../db/conn");
const crypto = require("crypto");

// ✅ LISTAR TODAS
exports.getAll = (req, res) => {
  const q = `
    SELECT id, proforma_id, proforma_ref, fecha, cliente, celular,
           total_general, anticipo, saldo, estado, timeStamp
    FROM proformas
    ORDER BY id DESC
  `;

  db.query(q, (err, data) => {
    if (err) return res.status(500).json(err);
    return res.status(200).json(data);
  });
};

// ✅ OBTENER 1 (para Ver/Editar) - por proforma_id (UUID)
exports.getOne = (req, res) => {
  const { id } = req.params;

  const q = `
    SELECT id, proforma_id, proforma_ref, fecha, cliente, celular,
           items, total_general, anticipo, saldo, estado, timeStamp
    FROM proformas
    WHERE proforma_id = ?
    LIMIT 1
  `;

  db.query(q, [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Proforma no encontrada" });
    }
    return res.status(200).json(rows[0]);
  });
};

// ✅ CREAR (proforma_ref basado en id AUTO_INCREMENT)
exports.add = (req, res) => {
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

    if (!cliente || !celular || !fecha) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    const proforma_id = crypto.randomUUID();

    // 1) INSERT sin proforma_ref (se calcula con insertId)
    const qInsert = `
      INSERT INTO proformas
      (proforma_id, fecha, cliente, celular, items, total_general, anticipo, saldo, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      proforma_id,
      fecha,
      cliente,
      celular,
      JSON.stringify(items || []),
      Number(total_general || 0),
      Number(anticipo || 0),
      Number(saldo || 0),
      estado || "ACTIVA",
    ];

    db.query(qInsert, values, (err, result) => {
      if (err) return res.status(500).json(err);

      // ✅ insertId es el "id" AUTO_INCREMENT
      const ref = String(result.insertId).padStart(7, "0");

      // 2) UPDATE para guardar el proforma_ref
      const qUpdate = `
        UPDATE proformas
        SET proforma_ref = ?
        WHERE id = ?
      `;

      db.query(qUpdate, [ref, result.insertId], (err2) => {
        if (err2) return res.status(500).json(err2);

        return res.status(201).json({
          message: "Proforma guardada",
          proforma_id,
          proforma_ref: ref,
          id: result.insertId,
        });
      });
    });
  } catch (e) {
    return res.status(500).json({ message: "Error interno", error: String(e) });
  }
};

// ✅ ACTUALIZAR (Guardar edición) - por proforma_id (UUID)
exports.update = (req, res) => {
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

  if (!cliente || !celular || !fecha) {
    return res.status(400).json({ message: "Faltan datos obligatorios" });
  }

  const q = `
    UPDATE proformas
    SET fecha = ?, cliente = ?, celular = ?, items = ?, total_general = ?, anticipo = ?, saldo = ?, estado = ?
    WHERE proforma_id = ?
  `;

  const values = [
    fecha,
    cliente,
    celular,
    JSON.stringify(items || []),
    Number(total_general || 0),
    Number(anticipo || 0),
    Number(saldo || 0),
    estado || "ACTIVA",
    id,
  ];

  db.query(q, values, (err, result) => {
    if (err) return res.status(500).json(err);
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Proforma no encontrada" });
    }
    return res.status(200).json({ message: "Proforma actualizada" });
  });
};

// ✅ ELIMINAR - por proforma_id (UUID)
exports.remove = (req, res) => {
  const { id } = req.params;

  const q = `DELETE FROM proformas WHERE proforma_id = ?`;

  db.query(q, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Proforma no encontrada" });
    }
    return res.status(200).json({ message: "Proforma eliminada" });
  });
};




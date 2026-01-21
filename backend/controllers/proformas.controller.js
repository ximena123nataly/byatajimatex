const { v4: uuidv4 } = require("uuid");
const db = require("../db");

function makeRef() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `PF-${y}${m}${day}-${rand}`;
}

exports.addProforma = (req, res) => {
  try {
    const { fecha, cliente, celular, items, total } = req.body;

    if (!fecha || !cliente || !items) {
      return res.json({
        operation: "failed",
        message: "Datos incompletos",
      });
    }

    const proforma_id = uuidv4();
    const proforma_ref = makeRef();

    const sql = `
      INSERT INTO proformas
      (proforma_id, proforma_ref, fecha, cliente, celular, items, total)
      VALUES (?, ?, ?, ?, ?, ?, ?)
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
        Number(total).toFixed(2),
      ],
      (err) => {
        if (err) {
          console.error(err);
          return res.json({
            operation: "failed",
            message: "Error al guardar proforma",
          });
        }

        res.json({
          operation: "success",
          message: "Proforma guardada correctamente",
          proforma_ref,
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.json({
      operation: "failed",
      message: "Error interno",
    });
  }
};

const db = require("../db/conn.js");
const jwt = require("jsonwebtoken");
const uniqid = require("uniqid");

class Proforma {
  constructor() { }

  // GET PROFORMAS (tabla)
  getProformas = (req, res) => {
    try {
      jwt.decode(req.cookies.accessToken, { complete: true });

      new Promise((resolve, reject) => {
        let tsa = "";

        if (req.body.search_value && req.body.search_value !== "") {
          const sv = req.body.search_value;
          tsa = `
            WHERE CAST(id AS CHAR) LIKE "%${sv}%"
               OR cliente LIKE "%${sv}%"
               OR celular LIKE "%${sv}%"
          `;
        }

        let tso = "";
        if (req.body.sort_column && req.body.sort_order) {
          tso = `ORDER BY ${req.body.sort_column} ${req.body.sort_order}`;
        } else {
          tso = "ORDER BY id DESC";
        }

        const q = `
          SELECT
            id,
            proforma_id,
            fecha,
            hora,
            fecha_entrega,
            hora_entrega,
            customer_id,
            cliente,
            celular,
            notas,          -- AÑADIDO
            detalle,
            total_general,
            anticipo,
            saldo,
            estado,
            entregado
          FROM proformas
          ${tsa}
          ${tso}
          LIMIT ?, 10
        `;

        db.query(q, [req.body.start_value], (err, result) => {
          if (err) return reject(err);

          if (req.body.search_value && req.body.search_value !== "") {
            return resolve({
              operation: "success",
              message: "search proformas got",
              info: { proformas: result, count: result.length },
            });
          }

          const q2 = "SELECT COUNT(*) AS val FROM proformas";
          db.query(q2, (err2, result2) => {
            if (err2) return reject(err2);

            resolve({
              operation: "success",
              message: "10 proformas got",
              info: { proformas: result, count: result2[0].val },
            });
          });
        });
      })
        .then((value) => res.send(value))
        .catch((err) => {
          console.log(err);
          res.send({ operation: "error", message: "Something went wrong" });
        });
    } catch (error) {
      console.log(error);
      res.send({ operation: "error", message: "Something went wrong" });
    }
  };

  // ADD PROFORMA
  addProforma = (req, res) => {
    try {
      let d = jwt.decode(req.cookies.accessToken, { complete: true });

      const user_id = d?.payload?.user_id || d?.payload?.id || null;

      new Promise((resolve, reject) => {
        const rawDetalle = req.body.detalle ?? req.body.items ?? [];
        const detalleStr =
          typeof rawDetalle === "string" ? rawDetalle : JSON.stringify(rawDetalle || []);

        const total = req.body.total_general ?? 0;
        const anticipo = req.body.anticipo ?? 0;
        const saldo = req.body.saldo ?? (Number(total) - Number(anticipo));

        const qInsert = `
          INSERT INTO proformas
          (proforma_id, fecha, hora, fecha_entrega, hora_entrega, customer_id,
           cliente, celular, notas, detalle, total_general, anticipo, saldo, estado, entregado, user_id)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `;

        db.query(
          qInsert,
          [
            "",
            req.body.fecha || null,
            req.body.hora || null,
            req.body.fecha_entrega || null,
            req.body.hora_entrega || null,
            req.body.customer_id || null,
            req.body.cliente,
            req.body.celular || null,

            // ✅ NOTAS
            req.body.notas ? String(req.body.notas) : null,

            detalleStr,
            total,
            anticipo,
            saldo,
            req.body.estado || "ACTIVA",
            req.body.entregado ?? 0,
            user_id,
          ],
          (err, result) => {
            if (err) return reject(err);

            const newId = result.insertId;
            const proforma_id = String(newId).padStart(7, "0");

            const qUpdate = "UPDATE proformas SET proforma_id = ? WHERE id = ?";
            db.query(qUpdate, [proforma_id, newId], (err2) => {
              if (err2) return reject(err2);

              resolve({
                operation: "success",
                message: "Proforma added successfully",
                info: { id: newId, proforma_id },
              });
            });
          }
        );
      })
        .then((value) => res.send(value))
        .catch((err) => {
          console.log(err);
          res.send({ operation: "error", message: "Something went wrong" });
        });
    } catch (error) {
      console.log(error);
      res.send({ operation: "error", message: "Something went wrong" });
    }
  };

  // ENTREGAR PROFORMA (entregado = 1)
  entregarProforma = (req, res) => {
    try {
      jwt.decode(req.cookies.accessToken, { complete: true });

      new Promise((resolve, reject) => {
        const { id } = req.body;

        if (!id) {
          return resolve({
            operation: "failed",
            message: "ID de proforma requerido",
          });
        }

        const q = "UPDATE proformas SET entregado = 1 WHERE id = ?";
        db.query(q, [id], (err, result) => {
          if (err) return reject(err);

          if (result.affectedRows === 0) {
            return resolve({
              operation: "failed",
              message: "No se encontró la proforma",
            });
          }

          resolve({
            operation: "success",
            message: "Proforma marcada como entregada",
          });
        });
      })
        .then((value) => res.send(value))
        .catch((err) => {
          console.log(err);
          res.send({ operation: "error", message: "Something went wrong" });
        });
    } catch (error) {
      console.log(error);
      res.send({ operation: "error", message: "Something went wrong" });
    }
  };

  // COBRAR PROFORMA
  cobrarProforma = (req, res) => {
    try {
      jwt.decode(req.cookies.accessToken, { complete: true });

      const id = req.body?.id;
      const monto = Number(req.body?.monto);

      if (!id) return res.send({ operation: "error", message: "Falta id" });
      if (!Number.isFinite(monto) || monto <= 0)
        return res.send({ operation: "error", message: "Monto inválido" });

      new Promise((resolve, reject) => {
        const qGet = `
          SELECT total_general, anticipo, saldo
          FROM proformas
          WHERE id = ?
          LIMIT 1
        `;

        db.query(qGet, [id], (err, rows) => {
          if (err) return reject(err);
          if (!rows || rows.length === 0) {
            return resolve({ operation: "error", message: "Proforma no encontrada" });
          }

          const p = rows[0];
          const total = Number(p.total_general) || 0;
          const anticipoActual = Number(p.anticipo) || 0;
          const saldoActual = Number(p.saldo) || 0;

          if (saldoActual <= 0) {
            return resolve({ operation: "error", message: "Esta proforma ya está pagada" });
          }

          if (monto > saldoActual) {
            return resolve({
              operation: "error",
              message: `El monto excede el saldo. Saldo actual: ${saldoActual}`,
            });
          }
          //  NUEVO: obligar pago completo
          // si monto es menor al saldo => no permitido
          if (monto < saldoActual) {
            return resolve({
              operation: "error",
              message: "Debes pagar el saldo completo",
            });
          }

          const nuevoAnticipo = anticipoActual + monto;
          let nuevoSaldo = total - nuevoAnticipo;
          if (nuevoSaldo < 0) nuevoSaldo = 0;

          const qUpd = `
            UPDATE proformas
            SET anticipo = ?, saldo = ?
            WHERE id = ?
          `;

          db.query(qUpd, [nuevoAnticipo, nuevoSaldo, id], (err2) => {
            if (err2) return reject(err2);

            resolve({
              operation: "success",
              message: "Pago registrado",
              info: { anticipo: nuevoAnticipo, saldo: nuevoSaldo },
            });
          });
        });
      })
        .then((value) => res.send(value))
        .catch((err) => {
          console.log(err);
          res.send({ operation: "error", message: "Something went wrong" });
        });
    } catch (error) {
      console.log(error);
      res.send({ operation: "error", message: "Something went wrong" });
    }
  };

  // DELETE PROFORMA
  deleteProforma = (req, res) => {
    try {
      jwt.decode(req.cookies.accessToken, { complete: true });

      new Promise((resolve, reject) => {
        const q = "DELETE FROM proformas WHERE id = ?";
        db.query(q, [req.body.id], (err) => {
          if (err) return reject(err);
          resolve({
            operation: "success",
            message: "Proforma deleted successfully",
          });
        });
      })
        .then((value) => res.send(value))
        .catch((err) => {
          console.log(err);
          res.send({ operation: "error", message: "Something went wrong" });
        });
    } catch (error) {
      console.log(error);
      res.send({ operation: "error", message: "Something went wrong" });
    }
  };
}

module.exports = Proforma;

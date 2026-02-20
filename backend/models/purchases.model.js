const db = require("../db/conn.js");
const jwt = require("jsonwebtoken");

function nowDateTimeTZ(tz = "America/La_Paz") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (t) => parts.find((p) => p.type === t)?.value;

  return {
    fecha: `${get("year")}-${get("month")}-${get("day")}`,
    hora: `${get("hour")}:${get("minute")}:${get("second")}`,
  };
}

function getUserIdFromCookie(req) {
  try {
    const decoded = jwt.decode(req.cookies.accessToken, { complete: true });
    const p = decoded?.payload || {};
    return p.user_id || p.id_usuario || p.id || null;
  } catch (e) {
    return null;
  }
}

class Purchase {
  constructor() {}

  //  Obtener compras
  getPurchases = (req, res) => {
    const q =
      "SELECT p.*, s.name as supplier_name FROM purchases p " +
      "INNER JOIN suppliers s ON p.supplier_id = s.supplier_id " +
      "ORDER BY p.timeStamp DESC";

    db.query(q, (err, result) => {
      if (err) {
        return res.send({ operation: "error", message: err.message });
      }

      res.send({
        operation: "success",
        purchases: result,
      });
    });
  };

  //  Agregar compra
  addPurchase = (req, res) => {
    const id_usuario = getUserIdFromCookie(req);
    if (!id_usuario) {
      return res.send({ operation: "error", message: "No autorizado" });
    }

    const grandTotal = Number(req.body.grand_total);
    if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
      return res.send({ operation: "error", message: "grand_total inválido" });
    }

    if (!Array.isArray(req.body.item_array) || req.body.item_array.length === 0) {
      return res.send({ operation: "error", message: "items vacío" });
    }

    const { fecha, hora } = nowDateTimeTZ();

    db.beginTransaction((txErr) => {
      if (txErr)
        return res.send({ operation: "error", message: txErr.message });

      const q1 =
        "INSERT INTO purchases (supplier_id, due_date, items, tax, descuento, grand_total, user_id) VALUES (?,?,?,?,?,?,?)";

      db.query(
        q1,
        [
          req.body.supplier_id,
          req.body.due_date,
          JSON.stringify(req.body.item_array),
          req.body.tax || 0,
          req.body.descuento || 0,
          grandTotal,
          id_usuario,
        ],
        (err1, result) => {
          if (err1) {
            return db.rollback(() =>
              res.send({ operation: "error", message: err1.message })
            );
          }

          const purchase_id = result.insertId;

          //  SUMAR STOCK
          const stockTasks = req.body.item_array.map((prod) => {
            return new Promise((resolve, reject) => {
              const q2 =
                "UPDATE products SET product_stock = product_stock + ? WHERE product_id = ?";
              db.query(q2, [prod.quantity, prod.product_id], (e2) => {
                if (e2) return reject(e2);
                resolve();
              });
            });
          });

          Promise.all(stockTasks)
            .then(() => {
              //  CAJA → EGRESO
              const qcaja =
                "SELECT id_caja FROM caja WHERE id_usuario=? LIMIT 1";
              db.query(qcaja, [id_usuario], (errCaja, cajaRes) => {
                if (errCaja) {
                  return db.rollback(() =>
                    res.send({ operation: "error", message: errCaja.message })
                  );
                }

                if (!cajaRes || cajaRes.length === 0) {
                  return db.commit(() =>
                    res.send({
                      operation: "success",
                      message: "Compra agregada (sin caja)",
                    })
                  );
                }

                const id_caja = cajaRes[0].id_caja;

                const qtx = `
                  INSERT INTO caja_transacciones
                  (id_caja, id_usuario, tipo, origen, nro_registro, monto, fecha, hora)
                  VALUES (?,?,?,?,?,?,?,?)
                `;

                db.query(
                  qtx,
                  [
                    id_caja,
                    id_usuario,
                    "EGRESO",
                    "COMPRA",
                    purchase_id,
                    grandTotal,
                    fecha,
                    hora,
                  ],
                  (errTx) => {
                    if (errTx) {
                      return db.rollback(() =>
                        res.send({ operation: "error", message: errTx.message })
                      );
                    }

                    const qup =
                      "UPDATE caja SET saldo = saldo - ? WHERE id_caja=?";
                    db.query(qup, [grandTotal, id_caja], (errUp) => {
                      if (errUp) {
                        return db.rollback(() =>
                          res.send({ operation: "error", message: errUp.message })
                        );
                      }

                      db.commit(() =>
                        res.send({
                          operation: "success",
                          message: "Compra agregada correctamente",
                        })
                      );
                    });
                  }
                );
              });
            })
            .catch((e) => {
              db.rollback(() =>
                res.send({ operation: "error", message: e.message })
              );
            });
        }
      );
    });
  };
}

module.exports = Purchase;
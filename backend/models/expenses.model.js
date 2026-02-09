const db = require("../db/conn.js");
const jwt = require("jsonwebtoken");
const uniqid = require("uniqid");


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

  const get = (type) => parts.find((p) => p.type === type)?.value;

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
  } catch {
    return null;
  }
}

class Expense {
  constructor() {}

  getExpenses = (req, res) => {
    try {
      const sv = req.body.search_value || "";
      const sortCol = req.body.sort_column || "";
      const sortOrd = req.body.sort_order || "";
      const startVal = Number(req.body.start_value || 0);

      let where = "";
      const params = [];

      if (sv.trim() !== "") {
        where = `WHERE (s.name LIKE ? OR e.expense_ref LIKE ?)`;
        params.push(`%${sv}%`, `%${sv}%`);
      }

      const allowedSort = new Set(["expense_ref", "due_date", "grand_total", "timeStamp"]);
      let orderBy = "";
      if (allowedSort.has(sortCol) && (sortOrd === "ASC" || sortOrd === "DESC")) {
        orderBy = `ORDER BY e.${sortCol} ${sortOrd}`;
      } else {
        orderBy = `ORDER BY e.timeStamp DESC`;
      }

      const q = `
        SELECT e.*, s.name as supplier_name
        FROM expenses e
        LEFT JOIN suppliers s ON e.supplier_id=s.supplier_id
        ${where}
        ${orderBy}
        LIMIT ?,10
      `;
      const qParams = [...params, startVal];

      db.query(q, qParams, (err, result) => {
        if (err) return res.send({ operation: "error", message: err.message });

        const q2 = `
          SELECT COUNT(*) AS val
          FROM expenses e
          LEFT JOIN suppliers s ON e.supplier_id=s.supplier_id
          ${where}
        `;

        db.query(q2, params, (err2, result2) => {
          if (err2) return res.send({ operation: "error", message: err2.message });

          res.send({
            operation: "success",
            info: {
              expenses: result,
              count: result2[0].val,
            },
          });
        });
      });
    } catch (e) {
      res.send({ operation: "error", message: e?.message || "Error cargando gastos" });
    }
  };

  addExpense = (req, res) => {
    try {
      const id_usuario = getUserIdFromCookie(req);
      if (!id_usuario) return res.send({ operation: "error", message: "No autorizado" });

      if (!req.body.expense_reference || !req.body.supplier_id || !req.body.due_date) {
        return res.send({
          operation: "error",
          message: "Faltan datos: expense_reference / supplier_id / due_date",
        });
      }

      if (!Array.isArray(req.body.item_array) || req.body.item_array.length === 0) {
        return res.send({ operation: "error", message: "items vacío" });
      }

      const grandTotal = Number(req.body.grand_total);
      if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
        return res.send({ operation: "error", message: "grand_total inválido" });
      }

      const expense_id = uniqid();

    
      const { fecha, hora } = nowDateTimeTZ("America/La_Paz");

      db.beginTransaction((txErr) => {
        if (txErr) return res.send({ operation: "error", message: txErr.message });

        
        const q = `
          INSERT INTO expenses
          (expense_id, expense_ref, supplier_id, due_date, items, tax, grand_total, user_id)
          VALUES (?,?,?,?,?,?,?,?)
        `;

        db.query(
          q,
          [
            expense_id,
            req.body.expense_reference,
            req.body.supplier_id,
            req.body.due_date,
            JSON.stringify(req.body.item_array),
            req.body.tax || 0,
            grandTotal,
            id_usuario,
          ],
          (err) => {
            if (err) return db.rollback(() => res.send({ operation: "error", message: err.message }));

          
            const tasks = req.body.item_array.map((prod) => {
              return new Promise((resolve, reject) => {
                db.query(
                  `UPDATE products SET product_stock = product_stock + ? WHERE product_id = ?`,
                  [prod.quantity, prod.product_id],
                  (e2) => (e2 ? reject(e2) : resolve())
                );
              });
            });

            Promise.all(tasks)
              .then(() => {
                
                db.query(
                  `SELECT id_caja FROM caja WHERE id_usuario=? LIMIT 1`,
                  [id_usuario],
                  (errCaja, cajaRes) => {
                    if (errCaja) {
                      return db.rollback(() =>
                        res.send({ operation: "error", message: errCaja.message })
                      );
                    }

                    if (!cajaRes || cajaRes.length === 0) {
                      return db.commit(() =>
                        res.send({
                          operation: "success",
                          message: "Expense added (sin caja asignada)",
                          expense_id,
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
                      [id_caja, id_usuario, "EGRESO", "GASTO", expense_id, grandTotal, fecha, hora],
                      (errTx) => {
                        if (errTx) {
                          return db.rollback(() =>
                            res.send({ operation: "error", message: errTx.message })
                          );
                        }

                      
                        db.query(
                          `UPDATE caja SET saldo = saldo - ? WHERE id_caja = ?`,
                          [grandTotal, id_caja],
                          (errUp) => {
                            if (errUp) {
                              return db.rollback(() =>
                                res.send({ operation: "error", message: errUp.message })
                              );
                            }

                            db.commit(() =>
                              res.send({
                                operation: "success",
                                message: "Expense added successfully",
                                expense_id,
                              })
                            );
                          }
                        );
                      }
                    );
                  }
                );
              })
              .catch((e) => db.rollback(() => res.send({ operation: "error", message: e.message })));
          }
        );
      });
    } catch (e) {
      res.send({ operation: "error", message: e?.message || "Error al guardar gasto" });
    }
  };

  deleteExpense = (req, res) => {
    try {
      const expense_id = req.body.expense_id;
      if (!expense_id) return res.send({ operation: "error", message: "expense_id requerido" });

      db.query("SELECT * FROM expenses WHERE expense_id=?", [expense_id], (err, rows) => {
        if (err) return res.send({ operation: "error", message: err.message });
        if (!rows || rows.length === 0) return res.send({ operation: "error", message: "Gasto no encontrado" });

        const expense = rows[0];
        let items = [];
        try { items = JSON.parse(expense.items || "[]"); } catch { items = []; }

        db.beginTransaction((txErr) => {
          if (txErr) return res.send({ operation: "error", message: txErr.message });

          
          const tasks = items.map((p) => {
            return new Promise((resolve, reject) => {
              db.query(
                "UPDATE products SET product_stock = product_stock - ? WHERE product_id=?",
                [p.quantity, p.product_id],
                (e) => (e ? reject(e) : resolve())
              );
            });
          });

          Promise.all(tasks)
            .then(() => new Promise((resolve, reject) => {
              db.query(
                "SELECT id_caja, monto FROM caja_transacciones WHERE origen='GASTO' AND nro_registro=? LIMIT 1",
                [expense_id],
                (e, tRows) => {
                  if (e) return reject(e);
                  resolve(tRows && tRows.length ? tRows[0] : null);
                }
              );
            }))
            .then((txRow) => new Promise((resolve, reject) => {
              if (!txRow) return resolve(null);

              db.query(
                "DELETE FROM caja_transacciones WHERE origen='GASTO' AND nro_registro=?",
                [expense_id],
                (e) => {
                  if (e) return reject(e);

                  db.query(
                    "UPDATE caja SET saldo = saldo + ? WHERE id_caja=?",
                    [txRow.monto, txRow.id_caja],
                    (e2) => (e2 ? reject(e2) : resolve(null))
                  );
                }
              );
            }))
            .then(() => new Promise((resolve, reject) => {
              db.query("DELETE FROM expenses WHERE expense_id=?", [expense_id], (e) => (e ? reject(e) : resolve()));
            }))
            .then(() => db.commit(() => res.send({ operation: "success", message: "Gasto eliminado" })))
            .catch((e) => db.rollback(() => res.send({ operation: "error", message: e.message })));
        });
      });
    } catch (e) {
      res.send({ operation: "error", message: e?.message || "Error eliminando gasto" });
    }
  };
}

module.exports = Expense;

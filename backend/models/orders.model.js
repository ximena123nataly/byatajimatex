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

class Order {
  constructor() {}

  getOrders = (req, res) => {
    try {
      jwt.decode(req.cookies.accessToken, { complete: true });

      new Promise((resolve, reject) => {
        let tsa = "";
        if (req.body.search_value != "") {
          tsa = `WHERE c.name LIKE "%${req.body.search_value}%"
                 OR o.order_ref LIKE "%${req.body.search_value}%"`
        }

        let tso = "";
        if (req.body.sort_column != "" && req.body.sort_order != "") {
          tso = `ORDER BY ${req.body.sort_column} ${req.body.sort_order}`;
        }

        let q =
          "SELECT o.*, c.name as customer_name FROM orders o " +
          "INNER JOIN customers c ON o.customer_id=c.customer_id " +
          tsa +
          " " +
          tso +
          " LIMIT ?, 10";

        db.query(q, [req.body.start_value], (err, result) => {
          if (err) return reject(err);

          if (req.body.search_value != "") {
            return resolve({
              operation: "success",
              message: "search orders got",
              info: { orders: result, count: result.length },
            });
          }

          let q2 = "SELECT COUNT(*) AS val FROM `orders`";
          db.query(q2, (err2, result2) => {
            if (err2) return reject(err2);

            resolve({
              operation: "success",
              message: "10 orders got",
              info: { orders: result, count: result2[0].val },
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

  
  addOrder = (req, res) => {
    try {
      const id_usuario = getUserIdFromCookie(req);
      if (!id_usuario) {
        return res.send({ operation: "error", message: "No autorizado" });
      }

      const order_id = uniqid();
      const grandTotal = Number(req.body.grand_total);
      if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
        return res.send({ operation: "error", message: "grand_total inválido" });
      }

      if (!Array.isArray(req.body.item_array) || req.body.item_array.length === 0) {
        return res.send({ operation: "error", message: "items vacío" });
      }

      const { fecha, hora } = nowDateTimeTZ();

      db.beginTransaction((txErr) => {
        if (txErr) return res.send({ operation: "error", message: txErr.message });

        
        const q1 =
          "INSERT INTO `orders`(`order_id`, `order_ref`, `customer_id`, `due_date`, `items`, `tax`, `grand_total`, `user_id`) " +
          "VALUES (?,?,?,?,?,?,?,?)";

        db.query(
          q1,
          [
            order_id,
            req.body.order_reference,
            req.body.customer_id,
            req.body.due_date,
            JSON.stringify(req.body.item_array),
            req.body.tax || 0,
            grandTotal,
            id_usuario,
          ],
          (err1) => {
            if (err1) {
              return db.rollback(() =>
                res.send({ operation: "error", message: err1.message })
              );
            }

            
            const parr = req.body.item_array.map((prod) => {
              return new Promise((resolve, reject) => {
                const q2 = "UPDATE `products` SET product_stock = product_stock - ? WHERE `product_id`= ?";
                db.query(q2, [prod.quantity, prod.product_id], (e2) => {
                  if (e2) return reject(e2);
                  resolve();
                });
              });
            });

            Promise.all(parr)
              .then(() => {
                
                const qcaja = "SELECT id_caja FROM caja WHERE id_usuario=? LIMIT 1";
                db.query(qcaja, [id_usuario], (errCaja, cajaRes) => {
                  if (errCaja) {
                    return db.rollback(() =>
                      res.send({ operation: "error", message: errCaja.message })
                    );
                  }

                  
                  if (!cajaRes || cajaRes.length === 0) {
                    return db.commit(() =>
                      res.send({ operation: "success", message: "Order added (sin caja)" })
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
                    [id_caja, id_usuario, "INGRESO", "VENTA", order_id, grandTotal, fecha, hora],
                    (errTx) => {
                      if (errTx) {
                        return db.rollback(() =>
                          res.send({ operation: "error", message: errTx.message })
                        );
                      }

                  
                      const qup = "UPDATE caja SET saldo = saldo + ? WHERE id_caja=?";
                      db.query(qup, [grandTotal, id_caja], (errUp) => {
                        if (errUp) {
                          return db.rollback(() =>
                            res.send({ operation: "error", message: errUp.message })
                          );
                        }

                        db.commit(() =>
                          res.send({ operation: "success", message: "Order added successfully" })
                        );
                      });
                    }
                  );
                });
              })
              .catch((e) => {
                console.log(e);
                db.rollback(() =>
                  res.send({ operation: "error", message: e.message || "Stock update error" })
                );
              });
          }
        );
      });
    } catch (error) {
      console.log(error);
      res.send({ operation: "error", message: "Something went wrong" });
    }
  };

  
  deleteOrder = (req, res) => {
    try {
      const id_usuario = getUserIdFromCookie(req);
      if (!id_usuario) {
        return res.send({ operation: "error", message: "No autorizado" });
      }

      const order_id = req.body.order_id;
      if (!order_id) {
        return res.send({ operation: "error", message: "order_id requerido" });
      }

      db.beginTransaction((txErr) => {
        if (txErr) return res.send({ operation: "error", message: txErr.message });

        
        db.query("SELECT * FROM orders WHERE order_id=?", [order_id], (e1, rows) => {
          if (e1) {
            return db.rollback(() => res.send({ operation: "error", message: e1.message }));
          }
          if (!rows || rows.length === 0) {
            return db.rollback(() =>
              res.send({ operation: "error", message: "Venta no encontrada" })
            );
          }

          let items = [];
          try {
            items = JSON.parse(rows[0].items || "[]");
          } catch (e) {
            items = [];
          }

         
          const stockTasks = items.map((p) => {
            return new Promise((resolve, reject) => {
              db.query(
                "UPDATE products SET product_stock = product_stock + ? WHERE product_id=?",
                [p.quantity, p.product_id],
                (e) => (e ? reject(e) : resolve())
              );
            });
          });

          Promise.all(stockTasks)
            .then(() => {
              
              db.query(
                "SELECT id_caja, monto FROM caja_transacciones WHERE origen='VENTA' AND nro_registro=? LIMIT 1",
                [order_id],
                (e2, txRows) => {
                  if (e2) {
                    return db.rollback(() =>
                      res.send({ operation: "error", message: e2.message })
                    );
                  }

                  const hasTx = txRows && txRows.length > 0;

                  const proceedDeleteOrder = () => {
                   
                    db.query("DELETE FROM orders WHERE order_id=?", [order_id], (e4) => {
                      if (e4) {
                        return db.rollback(() =>
                          res.send({ operation: "error", message: e4.message })
                        );
                      }

                      db.commit(() =>
                        res.send({ operation: "success", message: "Venta eliminada con éxito" })
                      );
                    });
                  };

                  if (!hasTx) return proceedDeleteOrder();

                  const { id_caja, monto } = txRows[0];

                  
                  db.query(
                    "DELETE FROM caja_transacciones WHERE origen='VENTA' AND nro_registro=?",
                    [order_id],
                    (e3) => {
                      if (e3) {
                        return db.rollback(() =>
                          res.send({ operation: "error", message: e3.message })
                        );
                      }

                  
                      db.query(
                        "UPDATE caja SET saldo = saldo - ? WHERE id_caja=?",
                        [monto, id_caja],
                        (eSaldo) => {
                          if (eSaldo) {
                            return db.rollback(() =>
                              res.send({ operation: "error", message: eSaldo.message })
                            );
                          }

                          proceedDeleteOrder();
                        }
                      );
                    }
                  );
                }
              );
            })
            .catch((e) => {
              db.rollback(() => res.send({ operation: "error", message: e.message }));
            });
        });
      });
    } catch (error) {
      console.log(error);
      res.send({ operation: "error", message: "Something went wrong" });
    }
  };
}

module.exports = Order;

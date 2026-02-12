const db = require("../db/conn.js");
const jwt = require("jsonwebtoken");
const uniqid = require("uniqid");

// ===== Helpers fecha/hora Bolivia (sin tocar docker) =====
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

class Proforma {
  constructor() { }

  // GET PROFORMAS (tabla)
  getProformas = (req, res) => {
    try {
      jwt.decode(req.cookies.accessToken, { complete: true });

      new Promise((resolve, reject) => {
        let whereParts = [];
       
        if (req.body.desde && req.body.hasta) {
          whereParts.push(`DATE(fecha) BETWEEN "${req.body.desde}" AND "${req.body.hasta}"`);
        } else if (req.body.desde) {
          whereParts.push(`DATE(fecha) >= "${req.body.desde}"`);
        } else if (req.body.hasta) {
          whereParts.push(`DATE(fecha) <= "${req.body.hasta}"`);
        }

        if (req.body.only_pendientes) {
          whereParts.push(`entregado = 0`);
        }


        if (req.body.search_value && req.body.search_value !== "") {
          const sv = req.body.search_value;
          whereParts.push(`
    (CAST(id AS CHAR) LIKE "%${sv}%"
      OR cliente LIKE "%${sv}%"
      OR celular LIKE "%${sv}%")
  `);
        }

        const tsa = whereParts.length
          ? `WHERE ${whereParts.join(" AND ")}`
          : "";



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
            notas,
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


          const q2 = `
  SELECT COUNT(*) AS val
  FROM proformas
  ${tsa}
`;

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

  // ADD PROFORMA (si anticipo > 0 => mueve caja)
  addProforma = (req, res) => {
    try {
      const user_id = getUserIdFromCookie(req);

      const rawDetalle = req.body.detalle ?? req.body.items ?? [];
      const detalleStr =
        typeof rawDetalle === "string" ? rawDetalle : JSON.stringify(rawDetalle || []);

      const total = Number(req.body.total_general ?? 0);
      const anticipo = Number(req.body.anticipo ?? 0);
      const saldo = Number(req.body.saldo ?? (total - anticipo));

      db.beginTransaction((txErr) => {
        if (txErr) return res.send({ operation: "error", message: txErr.message });

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
            if (err) {
              return db.rollback(() =>
                res.send({ operation: "error", message: err.message })
              );
            }

            const newId = result.insertId;
            const proforma_id = String(newId).padStart(7, "0");

            const qUpdate = "UPDATE proformas SET proforma_id = ? WHERE id = ?";
            db.query(qUpdate, [proforma_id, newId], (err2) => {
              if (err2) {
                return db.rollback(() =>
                  res.send({ operation: "error", message: err2.message })
                );
              }

              // ✅ Si anticipo > 0 => registrar en caja
              if (anticipo > 0 && user_id) {
                db.query(
                  "SELECT id_caja FROM caja WHERE id_usuario=? LIMIT 1",
                  [user_id],
                  (errCaja, cajaRes) => {
                    if (errCaja) {
                      return db.rollback(() =>
                        res.send({ operation: "error", message: errCaja.message })
                      );
                    }

                    // si no tiene caja, igual guardamos la proforma
                    if (!cajaRes || cajaRes.length === 0) {
                      return db.commit(() =>
                        res.send({
                          operation: "success",
                          message: "Proforma added (sin caja)",
                          info: { id: newId, proforma_id },
                        })
                      );
                    }

                    const id_caja = cajaRes[0].id_caja;
                    const { fecha, hora } = nowDateTimeTZ();

                    // ✅ origen según tu regla:
                    // anticipo==total o saldo==0 => PAGADO_TOTAL
                    // anticipo>0 y saldo>0 => ANTICIPO
                    const origen = (saldo === 0 || anticipo === total)
                      ? "PROFORMA_PAGADO_TOTAL"
                      : "PROFORMA_ANTICIPO";

                    db.query(
                      `INSERT INTO caja_transacciones
                       (id_caja, id_usuario, tipo, origen, nro_registro, monto, fecha, hora)
                       VALUES (?,?,?,?,?,?,?,?)`,
                      [id_caja, user_id, "INGRESO", origen, proforma_id, anticipo, fecha, hora],
                      (errTx) => {
                        if (errTx) {
                          return db.rollback(() =>
                            res.send({ operation: "error", message: errTx.message })
                          );
                        }

                        db.query(
                          "UPDATE caja SET saldo = saldo + ? WHERE id_caja=?",
                          [anticipo, id_caja],
                          (errUp) => {
                            if (errUp) {
                              return db.rollback(() =>
                                res.send({ operation: "error", message: errUp.message })
                              );
                            }

                            db.commit(() =>
                              res.send({
                                operation: "success",
                                message: "Proforma added successfully",
                                info: { id: newId, proforma_id },
                              })
                            );
                          }
                        );
                      }
                    );
                  }
                );
              } else {
                // ✅ sin anticipo => no mueve caja
                db.commit(() =>
                  res.send({
                    operation: "success",
                    message: "Proforma added successfully",
                    info: { id: newId, proforma_id },
                  })
                );
              }
            });
          }
        );
      });
    } catch (error) {
      console.log(error);
      res.send({ operation: "error", message: "Something went wrong" });
    }
  };

  // ENTREGAR PROFORMA
  entregarProforma = (req, res) => {
    try {
      jwt.decode(req.cookies.accessToken, { complete: true });

      const { id } = req.body;
      if (!id) {
        return res.send({ operation: "failed", message: "ID de proforma requerido" });
      }

      const q = `
        UPDATE proformas
        SET entregado = 1,
            delivered_at = COALESCE(delivered_at, NOW())
        WHERE id = ?
          AND entregado <> 1
      `;

      db.query(q, [id], (err, result) => {
        if (err) {
          console.log(err);
          return res.send({ operation: "error", message: "Something went wrong" });
        }

        if (result.affectedRows > 0) {
          return res.send({
            operation: "success",
            message: "Proforma marcada como entregada",
          });
        }

        const q2 = "SELECT id, entregado, delivered_at FROM proformas WHERE id = ? LIMIT 1";
        db.query(q2, [id], (err2, rows) => {
          if (err2) {
            console.log(err2);
            return res.send({ operation: "error", message: "Something went wrong" });
          }
          if (!rows || rows.length === 0) {
            return res.send({ operation: "failed", message: "No se encontró la proforma" });
          }
          return res.send({
            operation: "success",
            message: "Esta proforma ya estaba entregada",
            info: { delivered_at: rows[0].delivered_at },
          });
        });
      });
    } catch (error) {
      console.log(error);
      res.send({ operation: "error", message: "Something went wrong" });
    }
  };

  // COBRAR PROFORMA (PAGO SALDO => movimiento SALDO_PAGADO)
  cobrarProforma = (req, res) => {
    try {
      const user_id = getUserIdFromCookie(req);
      if (!user_id) return res.send({ operation: "error", message: "No autorizado" });

      const id = req.body?.id;
      const monto = Number(req.body?.monto);

      if (!id) return res.send({ operation: "error", message: "Falta id" });
      if (!Number.isFinite(monto) || monto <= 0)
        return res.send({ operation: "error", message: "Monto inválido" });

      db.beginTransaction((txErr) => {
        if (txErr) return res.send({ operation: "error", message: txErr.message });

        const qGet = `
          SELECT id, proforma_id, total_general, anticipo, saldo
          FROM proformas
          WHERE id = ?
          LIMIT 1
        `;

        db.query(qGet, [id], (err, rows) => {
          if (err) {
            return db.rollback(() => res.send({ operation: "error", message: err.message }));
          }
          if (!rows || rows.length === 0) {
            return db.rollback(() =>
              res.send({ operation: "error", message: "Proforma no encontrada" })
            );
          }

          const p = rows[0];
          const total = Number(p.total_general) || 0;
          const anticipoActual = Number(p.anticipo) || 0;
          const saldoActual = Number(p.saldo) || 0;

          if (saldoActual <= 0) {
            return db.rollback(() =>
              res.send({ operation: "error", message: "Esta proforma ya está pagada" })
            );
          }

          // ✅ Tu regla: debe pagar saldo completo
          if (monto !== saldoActual) {
            return db.rollback(() =>
              res.send({ operation: "error", message: "Debes pagar el saldo completo" })
            );
          }

          const nuevoAnticipo = anticipoActual + monto;
          const nuevoSaldo = 0;

          const qUpd = `
            UPDATE proformas
            SET anticipo = ?, saldo = ?
            WHERE id = ?
          `;

          db.query(qUpd, [nuevoAnticipo, nuevoSaldo, id], (err2) => {
            if (err2) {
              return db.rollback(() =>
                res.send({ operation: "error", message: err2.message })
              );
            }

            // buscar caja
            db.query(
              "SELECT id_caja FROM caja WHERE id_usuario=? LIMIT 1",
              [user_id],
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
                      message: "Pago registrado (sin caja)",
                      info: { anticipo: nuevoAnticipo, saldo: nuevoSaldo },
                    })
                  );
                }

                const id_caja = cajaRes[0].id_caja;
                const { fecha, hora } = nowDateTimeTZ();

                db.query(
                  `INSERT INTO caja_transacciones
                   (id_caja, id_usuario, tipo, origen, nro_registro, monto, fecha, hora)
                   VALUES (?,?,?,?,?,?,?,?)`,
                  [id_caja, user_id, "INGRESO", "PROFORMA_SALDO_PAGADO", p.proforma_id, monto, fecha, hora],
                  (errTx) => {
                    if (errTx) {
                      return db.rollback(() =>
                        res.send({ operation: "error", message: errTx.message })
                      );
                    }

                    db.query(
                      "UPDATE caja SET saldo = saldo + ? WHERE id_caja=?",
                      [monto, id_caja],
                      (errUp) => {
                        if (errUp) {
                          return db.rollback(() =>
                            res.send({ operation: "error", message: errUp.message })
                          );
                        }

                        db.commit(() =>
                          res.send({
                            operation: "success",
                            message: "Pago registrado",
                            info: { anticipo: nuevoAnticipo, saldo: nuevoSaldo },
                          })
                        );
                      }
                    );
                  }
                );
              }
            );
          });
        });
      });
    } catch (error) {
      console.log(error);
      res.send({ operation: "error", message: "Something went wrong" });
    }
  };

  // DELETE PROFORMA (no toca caja por ahora, lo hacemos si quieres)
  deleteProforma = (req, res) => {
    try {
      jwt.decode(req.cookies.accessToken, { complete: true });

      new Promise((resolve, reject) => {
        const q = "DELETE FROM proformas WHERE id = ?";
        db.query(q, [req.body.id], (err) => {
          if (err) return reject(err);
          resolve({
            operation: "success",
            message: "Proforma eliminada con éxito",
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

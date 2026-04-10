const { parse } = require("dotenv");
const db = require("../db/conn.js");
const jwt = require("jsonwebtoken");
const uniqid = require("uniqid");

class Caja {
  constructor() { }

  test = (req, res) => {
    return res.send({ ok: true, msg: "Caja funcionando" });
  };

  getUserIdFromToken = (req) => {
    const d = jwt.decode(req.cookies.accessToken, { complete: true });
    return d?.payload?.user_id || null;
  };

  getRoleFromToken = (req) => {
    const d = jwt.decode(req.cookies.accessToken, { complete: true });
    const role = d?.payload?.role || "";
    return String(role).toLowerCase();
  };

  isAdmin = (req) => {
    const role = this.getRoleFromToken(req);
    return role === "admin" || role === "administrador";
  };

  ensureCaja = (user_id, nombreCaja = "Caja EFECTIVO") => {
    return new Promise((resolve, reject) => {
      if (!user_id) return reject(new Error("user_id no encontrado"));

      db.query(
        "SELECT id_caja, id_usuario, nombre_caja, saldo FROM caja WHERE id_usuario=? AND nombre_caja=? LIMIT 1",
        [user_id, nombreCaja],
        (err, rows) => {
          if (err) return reject(err);

          if (rows && rows.length) return resolve(rows[0]);

          db.query(
            "INSERT INTO caja (id_usuario, nombre_caja, saldo) VALUES (?, ?, 0.00)",
            [user_id, nombreCaja],
            (err2, result2) => {
              if (err2) return reject(err2);

              resolve({
                id_caja: result2.insertId,
                id_usuario: user_id,
                nombre_caja: nombreCaja,
                saldo: 0.0,
              });
            }
          );
        }
      );
    });
  };
  getCaja = async (req, res) => {
    try {
      const user_id = this.getUserIdFromToken(req);
      if (!user_id) return res.send({ ok: false, msg: "No autorizado" });

      const nombreCaja = req.body?.nombre_caja || "Caja EFECTIVO";
      const caja = await this.ensureCaja(user_id, nombreCaja);
      return res.send({ ok: true, caja });
    } catch (e) {
      console.log(e);
      return res.send({ ok: false, msg: "Error cargando caja" });
    }
  };

  getTransacciones = async (req, res) => {
    try {
      const user_id = this.getUserIdFromToken(req);
      if (!user_id) return res.send({ ok: false, msg: "No autorizado" });

      const nombreCaja = req.body?.nombre_caja || "Caja EFECTIVO";
      const caja = await this.ensureCaja(user_id, nombreCaja);

      db.query(
        `SELECT id_transaccion, id_caja, id_usuario, detalle, tipo, origen, nro_registro, monto, fecha, hora
         FROM caja_transacciones
         WHERE id_caja=?
         ORDER BY id_transaccion DESC
         LIMIT 100`,
        [caja.id_caja],
        (err, rows) => {
          if (err) {
            console.log(err);
            return res.send({ ok: false, msg: "Error cargando movimientos" });
          }
          return res.send({ ok: true, transacciones: rows || [] });
        }
      );
    } catch (e) {
      console.log(e);
      return res.send({ ok: false, msg: "Error cargando movimientos" });
    }
  };

  getCajas = async (req, res) => {
    try {
      if (!this.isAdmin(req)) return res.send({ ok: false, msg: "Solo admin" });

      const q = `
        SELECT c.id_caja, c.id_usuario, c.nombre_caja, c.saldo,
               u.user_name AS usuario_nombre,
               u.email AS usuario_email
        FROM caja c
        LEFT JOIN \`user\` u ON u.user_id = c.id_usuario
        ORDER BY c.id_caja ASC
      `;

      db.query(q, (err, rows) => {
        if (err) {
          console.log("getCajas SQL error:", err);
          return res.send({ ok: false, msg: "Error cargando cajas" });
        }
        return res.send({ ok: true, cajas: rows || [] });
      });
    } catch (e) {
      console.log(e);
      return res.send({ ok: false, msg: "Error cargando cajas" });
    }
  };

  getCajaById = async (req, res) => {
    try {
      if (!this.isAdmin(req)) return res.send({ ok: false, msg: "Solo admin" });

      const { id_caja } = req.body;
      if (!id_caja) return res.send({ ok: false, msg: "Falta id_caja" });

      db.query(
        `SELECT id_caja, id_usuario, nombre_caja, saldo
         FROM caja
         WHERE id_caja=?
         LIMIT 1`,
        [id_caja],
        (err, rows) => {
          if (err) {
            console.log(err);
            return res.send({ ok: false, msg: "Error cargando caja" });
          }
          if (!rows || rows.length === 0) {
            return res.send({ ok: false, msg: "Caja no encontrada" });
          }
          return res.send({ ok: true, caja: rows[0] });
        }
      );
    } catch (e) {
      console.log(e);
      return res.send({ ok: false, msg: "Error cargando caja" });
    }
  };

  getTransaccionesByCaja = async (req, res) => {
    try {
      if (!this.isAdmin(req)) return res.send({ ok: false, msg: "Solo admin" });

      const { id_caja } = req.body;
      if (!id_caja) return res.send({ ok: false, msg: "Falta id_caja" });

      db.query(
        `SELECT id_transaccion, id_caja, id_usuario, detalle, tipo, origen, nro_registro, monto, fecha, hora
         FROM caja_transacciones
         WHERE id_caja=?
         ORDER BY id_transaccion DESC
         LIMIT 200`,
        [id_caja],
        (err, rows) => {
          if (err) {
            console.log(err);
            return res.send({ ok: false, msg: "Error cargando movimientos" });
          }
          return res.send({ ok: true, transacciones: rows || [] });
        }
      );
    } catch (e) {
      console.log(e);
      return res.send({ ok: false, msg: "Error cargando movimientos" });
    }
  };

  getDestinosTraspaso = async (req, res) => {
    try {
      const user_id = this.getUserIdFromToken(req);
      if (!user_id) return res.send({ ok: false, msg: "No autorizado" });

      db.query(
        `SELECT 
           u.user_id,
           u.user_name,
           u.email,
           IFNULL(c.id_caja, '') AS id_caja
         FROM \`user\` u
         LEFT JOIN caja c ON c.id_usuario = u.user_id
         WHERE u.user_id <> ?
         ORDER BY u.user_name ASC`,
        [user_id],
        (err, rows) => {
          if (err) {
            console.log(err);
            return res.send({ ok: false, msg: "Error cargando usuarios" });
          }
          return res.send({ ok: true, usuarios: rows || [] });
        }
      );
    } catch (e) {
      console.log(e);
      return res.send({ ok: false, msg: "Error cargando usuarios" });
    }
  };

  traspasoSaldo = async (req, res) => {
    try {
      const id_usuario_origen = this.getUserIdFromToken(req);
      if (!id_usuario_origen) return res.send({ ok: false, msg: "No autorizado" });

      const { id_usuario_destino, monto, detalle } = req.body;
      const montoNum = parseFloat(monto);
      const detalleTrasp = detalle;

      if (!detalle) return res.send({ ok: false, msg: "Ingrese un detalle para el traspaso" });
      if (!id_usuario_destino) return res.send({ ok: false, msg: "Falta usuario destino" });
      if (!monto || isNaN(montoNum) || montoNum <= 0) {
        return res.send({ ok: false, msg: "Monto inválido" });
      }
      if (String(id_usuario_origen) === String(id_usuario_destino)) {
        return res.send({ ok: false, msg: "No puedes traspasarte a ti mismo" });
      }

      const cajaOrigen = await this.ensureCaja(id_usuario_origen);
      const cajaDestino = await this.ensureCaja(id_usuario_destino);

      const saldoOrigen = parseFloat(cajaOrigen.saldo || 0);
      if (saldoOrigen < montoNum) {
        return res.send({ ok: false, msg: "Saldo insuficiente" });
      }

      const nro = "trp_" + uniqid();

      const d = new Date();
      const fecha = d.toISOString().slice(0, 10);
      const hora = d.toTimeString().slice(0, 8);

      db.beginTransaction((err0) => {
        if (err0) {
          console.log(err0);
          return res.send({ ok: false, msg: "Error iniciando transacción" });
        }

        db.query(
          `INSERT INTO caja_transacciones
           (id_caja, id_usuario, detalle, tipo, origen, nro_registro, monto, fecha, hora)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [cajaOrigen.id_caja, id_usuario_origen, detalleTrasp, "EGRESO", "TRASPASO", nro, montoNum, fecha, hora],
          (err1) => {
            if (err1) {
              console.log(err1);
              return db.rollback(() =>
                res.send({ ok: false, msg: "Error registrando egreso" })
              );
            }

            db.query(
              `INSERT INTO caja_transacciones
               (id_caja, id_usuario, detalle, tipo, origen, nro_registro, monto, fecha, hora)
               VALUES (?,?,?,?,?,?,?,?,?)`,
              [cajaDestino.id_caja, id_usuario_destino, detalleTrasp, "INGRESO", "TRASPASO", nro, montoNum, fecha, hora],
              (err2) => {
                if (err2) {
                  console.log(err2);
                  return db.rollback(() =>
                    res.send({ ok: false, msg: "Error registrando ingreso" })
                  );
                }

                db.query(
                  `UPDATE caja SET saldo = saldo - ? WHERE id_caja=?`,
                  [montoNum, cajaOrigen.id_caja],
                  (err3) => {
                    if (err3) {
                      console.log(err3);
                      return db.rollback(() =>
                        res.send({ ok: false, msg: "Error actualizando saldo origen" })
                      );
                    }

                    db.query(
                      `UPDATE caja SET saldo = saldo + ? WHERE id_caja=?`,
                      [montoNum, cajaDestino.id_caja],
                      (err4) => {
                        if (err4) {
                          console.log(err4);
                          return db.rollback(() =>
                            res.send({ ok: false, msg: "Error actualizando saldo destino" })
                          );
                        }

                        db.commit((err5) => {
                          if (err5) {
                            console.log(err5);
                            return db.rollback(() =>
                              res.send({ ok: false, msg: "Error confirmando traspaso" })
                            );
                          }
                          return res.send({
                            ok: true,
                            msg: "Traspaso realizado",
                            nro_registro: nro,
                          });
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    } catch (e) {
      console.log(e);
      return res.send({ ok: false, msg: "Error servidor" });
    }
  };

  // ✅ ESTE MÉTODO YA ESTÁ DENTRO DE LA CLASE (IMPORTANTE)
  getMovimientoDetalle = async (req, res) => {
    try {
      const user_id = this.getUserIdFromToken(req);
      if (!user_id) return res.send({ ok: false, msg: "No autorizado" });

      const { id_transaccion } = req.body;
      if (!id_transaccion) return res.send({ ok: false, msg: "Falta id_transaccion" });

      db.query(
        `SELECT id_transaccion, id_caja, detalle, id_usuario, tipo, origen, nro_registro, monto, fecha, hora
         FROM caja_transacciones
         WHERE id_transaccion=? LIMIT 1`,
        [id_transaccion],
        async (err, rows) => {
          if (err) {
            console.log(err);
            return res.send({ ok: false, msg: "Error leyendo movimiento" });
          }
          if (!rows || rows.length === 0) {
            return res.send({ ok: false, msg: "Movimiento no encontrado" });
          }

          const mov = rows[0];

          // Seguridad: si NO es admin, solo puede ver su caja
          if (!this.isAdmin(req)) {
            const cajaMiaEf = await this.ensureCaja(user_id, "Caja EFECTIVO");
            const cajaMiaQr = await this.ensureCaja(user_id, "Caja QR");

            const puedeVer =
              String(cajaMiaEf?.id_caja) === String(mov.id_caja) ||
              String(cajaMiaQr?.id_caja) === String(mov.id_caja);

            if (!puedeVer) {
              return res.send({ ok: false, msg: "No autorizado a ver este movimiento" });
            }
            
          }

          const ref = mov.nro_registro || "";

          // TRASPASO: devuelve los 2 movimientos (egreso e ingreso)
          if (mov.origen === "TRASPASO") {
            return db.query(
              `SELECT ct.id_transaccion, ct.id_caja, ct.id_usuario, ct.detalle, ct.tipo, ct.origen, ct.nro_registro, ct.monto, ct.fecha, ct.hora,
                      c.nombre_caja,
                      u.user_name
               FROM caja_transacciones ct
               LEFT JOIN caja c ON c.id_caja = ct.id_caja
               LEFT JOIN \`user\` u ON u.user_id = ct.id_usuario
               WHERE ct.origen='TRASPASO' AND ct.nro_registro=?
               ORDER BY ct.tipo DESC`,
              [ref],
              (e2, det) => {
                if (e2) {
                  console.log(e2);
                  return res.send({ ok: false, msg: "Error detalle traspaso" });
                }
                return res.send({ ok: true, mov, tipo_detalle: "TRASPASO", detalle: det || [] });
              }
            );
          }

          // PROFORMA
          if (String(mov.origen || "").startsWith("PROFORMA")) {
            return db.query(
              `SELECT *
               FROM proformas
               WHERE proforma_id=? OR CAST(id AS CHAR)=?
               LIMIT 1`,
              [ref, ref],
              (e2, prows) => {
                if (e2) {
                  console.log(e2);
                  return res.send({ ok: false, msg: "Error detalle proforma" });
                }
                return res.send({
                  ok: true,
                  mov,
                  tipo_detalle: "PROFORMA",
                  detalle: (prows && prows[0]) ? prows[0] : null,
                });
              }
            );
          }

          // VENTA
          if (mov.origen === "VENTA") {
            return db.query(
              `SELECT o.*,
                      c.name AS customer_name, c.email AS customer_email
               FROM orders o
               LEFT JOIN customers c ON c.customer_id = o.customer_id
               WHERE o.order_id=? OR o.order_ref=?
               LIMIT 1`,
              [ref, ref],
              (e2, orows) => {
                if (e2) {
                  console.log(e2);
                  return res.send({ ok: false, msg: "Error detalle venta" });
                }
                return res.send({
                  ok: true,
                  mov,
                  tipo_detalle: "VENTA",
                  detalle: (orows && orows[0]) ? orows[0] : null,
                });
              }
            );
          }

          // GASTO
          if (mov.origen === "GASTO") {
            return db.query(
              `SELECT e.*,
                      s.name AS supplier_name
               FROM expenses e
               LEFT JOIN suppliers s ON s.supplier_id = e.supplier_id
               WHERE e.expense_id=? OR e.expense_ref=?
               LIMIT 1`,
              [ref, ref],
              (e2, erows) => {
                if (e2) {
                  console.log(e2);
                  return res.send({ ok: false, msg: "Error detalle gasto" });
                }
                return res.send({
                  ok: true,
                  mov,
                  tipo_detalle: "GASTO",
                  detalle: (erows && erows[0]) ? erows[0] : null,
                });
              }
            );
          }

          // Default
          return res.send({ ok: true, mov, tipo_detalle: "BASICO", detalle: null });
        }
      );
    } catch (e) {
      console.log(e);
      return res.send({ ok: false, msg: "Error servidor" });
    }
  };
}

module.exports = Caja;

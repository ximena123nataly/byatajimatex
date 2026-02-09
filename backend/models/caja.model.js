const db = require("../db/conn.js");
const jwt = require("jsonwebtoken");

class Caja {
  constructor() {}

  test = (req, res) => {
    return res.send({ ok: true, msg: "Caja funcionando" });
  };

  // ✅ sacar user_id del token
  getUserIdFromToken = (req) => {
    const d = jwt.decode(req.cookies.accessToken, { complete: true });
    return d?.payload?.user_id || null;
  };

  // ✅ sacar role del token
  getRoleFromToken = (req) => {
    const d = jwt.decode(req.cookies.accessToken, { complete: true });
    return d?.payload?.role || null;
  };

  // ✅ crear caja si no existe
  ensureCaja = (user_id) => {
    return new Promise((resolve, reject) => {
      if (!user_id) return reject(new Error("user_id no encontrado"));

      db.query(
        "SELECT id_caja, id_usuario, nombre_caja, saldo FROM caja WHERE id_usuario=? LIMIT 1",
        [user_id],
        (err, rows) => {
          if (err) return reject(err);

          if (rows && rows.length) return resolve(rows[0]);

          db.query(
            "INSERT INTO caja (id_usuario, nombre_caja, saldo) VALUES (?, '', 0.00)",
            [user_id],
            (err2, result2) => {
              if (err2) return reject(err2);

              const id_caja = result2.insertId;
              const nombre_caja = `Caja ${id_caja}`;

              db.query(
                "UPDATE caja SET nombre_caja=? WHERE id_caja=?",
                [nombre_caja, id_caja],
                (err3) => {
                  if (err3) return reject(err3);

                  resolve({
                    id_caja,
                    id_usuario: user_id,
                    nombre_caja,
                    saldo: 0.0,
                  });
                }
              );
            }
          );
        }
      );
    });
  };

  // =========================================
  // ✅ CAJA DEL USUARIO (como ya lo tenías)
  // =========================================
  getCaja = async (req, res) => {
    try {
      const user_id = this.getUserIdFromToken(req);
      if (!user_id) return res.send({ ok: false, msg: "No autorizado" });

      const caja = await this.ensureCaja(user_id);
      return res.send({ ok: true, caja });
    } catch (e) {
      console.log(e);
      return res.send({ ok: false, msg: "Error cargando caja" });
    }
  };

  // =========================================
  // ✅ TRANSACCIONES DEL USUARIO (como ya lo tenías)
  // =========================================
  getTransacciones = async (req, res) => {
    try {
      const user_id = this.getUserIdFromToken(req);
      if (!user_id) return res.send({ ok: false, msg: "No autorizado" });

      const caja = await this.ensureCaja(user_id);

      db.query(
        `SELECT id_transaccion, id_caja, id_usuario, tipo, origen, nro_registro, monto, fecha, hora
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

  // =========================================
  // ✅ ADMIN: LISTAR TODAS LAS CAJAS
  // endpoint: POST /api/caja/get_cajas
  // =========================================
  getCajas = async (req, res) => {
    try {
      const role = this.getRoleFromToken(req);
      if (role !== "admin") {
        return res.send({ ok: false, msg: "Solo admin" });
      }

      const q = `
        SELECT c.id_caja, c.id_usuario, c.nombre_caja, c.saldo,
               u.name as usuario_nombre, u.email as usuario_email
        FROM caja c
        LEFT JOIN user u ON u.id_usuario = c.id_usuario
        ORDER BY c.id_caja ASC
      `;

      db.query(q, (err, rows) => {
        if (err) {
          console.log(err);
          return res.send({ ok: false, msg: "Error cargando cajas" });
        }
        return res.send({ ok: true, cajas: rows || [] });
      });
    } catch (e) {
      console.log(e);
      return res.send({ ok: false, msg: "Error cargando cajas" });
    }
  };

  // =========================================
  // ✅ ADMIN: TRAER UNA CAJA POR ID
  // endpoint: POST /api/caja/get_caja_by_id
  // body: { id_caja }
  // =========================================
  getCajaById = async (req, res) => {
    try {
      const role = this.getRoleFromToken(req);
      if (role !== "admin") {
        return res.send({ ok: false, msg: "Solo admin" });
      }

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

  // =========================================
  // ✅ ADMIN: TRANSACCIONES POR CAJA
  // endpoint: POST /api/caja/get_transacciones_by_caja
  // body: { id_caja }
  // =========================================
  getTransaccionesByCaja = async (req, res) => {
    try {
      const role = this.getRoleFromToken(req);
      if (role !== "admin") {
        return res.send({ ok: false, msg: "Solo admin" });
      }

      const { id_caja } = req.body;
      if (!id_caja) return res.send({ ok: false, msg: "Falta id_caja" });

      db.query(
        `SELECT id_transaccion, id_caja, id_usuario, tipo, origen, nro_registro, monto, fecha, hora
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
}

module.exports = Caja;

const db = require("../db/conn.js");
const jwt = require("jsonwebtoken");

class Caja {
  constructor() {}

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

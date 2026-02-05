const db = require("../db/conn.js");
const jwt = require("jsonwebtoken");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function nowDateTime() {
  const d = new Date();
  return {
    fecha: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    hora: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,
  };
}

class Caja {
  constructor() {}

  
  _getUserIdFromCookie(req) {
    try {
      const decoded = jwt.decode(req.cookies.accessToken, { complete: true });
      const payload = decoded?.payload || {};

      
      return payload.user_id || payload.id_usuario || payload.id || null;
    } catch (e) {
      return null;
    }
  }


  getCaja = (req, res) => {
    const id_caja = req.body.id_caja || 1;

    const q = "SELECT * FROM caja WHERE id_caja = ? LIMIT 1";
    db.query(q, [id_caja], (err, rows) => {
      if (err) return res.status(500).send({ ok: false, msg: "Error DB", err: String(err) });
      if (!rows || rows.length === 0) return res.status(404).send({ ok: false, msg: "Caja no existe" });
      return res.send({ ok: true, caja: rows[0] });
    });
  };

  
  getTransacciones = (req, res) => {
    const { id_caja, limit } = req.body;

    if (!id_caja) return res.status(400).send({ ok: false, msg: "Falta id_caja" });

    const lim = Number(limit) > 0 ? Number(limit) : 200;

    const q = `
      SELECT *
      FROM caja_transacciones
      WHERE id_caja = ?
      ORDER BY fecha DESC, hora DESC, id_transaccion DESC
      LIMIT ${lim}
    `;

    db.query(q, [id_caja], (err, rows) => {
      if (err) return res.status(500).send({ ok: false, msg: "Error DB", err: String(err) });
      return res.send({ ok: true, transacciones: rows || [] });
    });
  };

  
  registrarTransaccion = (req, res) => {
    const { id_caja, tipo, monto, nro_registro } = req.body;

    if (!id_caja || !tipo || monto === undefined) {
      return res.status(400).send({ ok: false, msg: "Faltan campos: id_caja, tipo, monto" });
    }

    const tipoUp = String(tipo).toUpperCase().trim();
    if (tipoUp !== "INGRESO" && tipoUp !== "EGRESO") {
      return res.status(400).send({ ok: false, msg: "tipo debe ser INGRESO o EGRESO" });
    }

    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      return res.status(400).send({ ok: false, msg: "Monto inválido" });
    }

    const id_usuario = this._getUserIdFromCookie(req); 
    const { fecha, hora } = nowDateTime();

   
    db.beginTransaction((err) => {
      if (err) return res.status(500).send({ ok: false, msg: "Error iniciando transacción", err: String(err) });

      
      db.query("SELECT saldo FROM caja WHERE id_caja = ? FOR UPDATE", [id_caja], (err, rows) => {
        if (err) return db.rollback(() => res.status(500).send({ ok: false, msg: "Error DB", err: String(err) }));
        if (!rows || rows.length === 0) return db.rollback(() => res.status(404).send({ ok: false, msg: "Caja no existe" }));

        const saldoActual = Number(rows[0].saldo || 0);
        const saldoNuevo = tipoUp === "INGRESO" ? saldoActual + montoNum : saldoActual - montoNum;

      
        db.query(
          `INSERT INTO caja_transacciones
           (id_caja, id_usuario, tipo, nro_registro, monto, fecha, hora)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id_caja, id_usuario, tipoUp, nro_registro || null, montoNum, fecha, hora],
          (err, result) => {
            if (err) {
              return db.rollback(() =>
                res.status(500).send({ ok: false, msg: "Error insertando transacción", err: String(err) })
              );
            }

   
            db.query("UPDATE caja SET saldo = ? WHERE id_caja = ?", [saldoNuevo, id_caja], (err) => {
              if (err) {
                return db.rollback(() =>
                  res.status(500).send({ ok: false, msg: "Error actualizando saldo", err: String(err) })
                );
              }

              db.commit((err) => {
                if (err) {
                  return db.rollback(() => res.status(500).send({ ok: false, msg: "Error commit", err: String(err) }));
                }

                return res.send({
                  ok: true,
                  msg: "Transacción registrada",
                  id_transaccion: result.insertId,
                  saldo_anterior: saldoActual,
                  saldo_nuevo: saldoNuevo,
                });
              });
            });
          }
        );
      });
    });
  };
}

module.exports = Caja;

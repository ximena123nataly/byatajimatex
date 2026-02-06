const db = require("../db/conn.js");
const jwt = require("jsonwebtoken");

class Caja {

  registrarMovimiento = (req, res) => {
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.decode(req.cookies.accessToken, { complete: true });
      const user_id = decoded?.payload?.user_id;

      if (!user_id) return res.send({ ok: false, msg: "Usuario no identificado" });

      const { tipo, origen, nro_registro, monto } = req.body;

      if (!tipo || !origen || monto === undefined) {
        return res.send({ ok: false, msg: "Faltan datos: tipo, origen, monto" });
      }

      const tipoUp = String(tipo).toUpperCase();
      const origenUp = String(origen).toUpperCase();
      const montoNum = Number(monto);

      if (!["INGRESO", "EGRESO"].includes(tipoUp)) {
        return res.send({ ok: false, msg: "tipo debe ser INGRESO o EGRESO" });
      }
      if (!["VENTA", "GASTO", "PROFORMA"].includes(origenUp)) {
        return res.send({ ok: false, msg: "origen debe ser VENTA, GASTO o PROFORMA" });
      }
      if (!Number.isFinite(montoNum) || montoNum <= 0) {
        return res.send({ ok: false, msg: "monto inválido" });
      }

      // 1) obtener id_caja del usuario
      db.query("SELECT id_caja, saldo FROM caja WHERE id_usuario=? LIMIT 1", [user_id], (err, cajas) => {
        if (err) return res.send({ ok: false, msg: "Error DB", err: String(err) });

        // si no existe caja, la creamos (igual que ya lo haces en get_caja)
        const crearCaja = (cb) => {
          db.query("INSERT INTO caja (id_usuario, nombre_caja, saldo) VALUES (?, '', 0)", [user_id], (e2, r2) => {
            if (e2) return res.send({ ok: false, msg: "Error creando caja", err: String(e2) });

            const id_caja = r2.insertId;
            db.query("UPDATE caja SET nombre_caja=? WHERE id_caja=?", [`Caja ${id_caja}`, id_caja]);

            cb({ id_caja, saldo: 0 });
          });
        };

        const continuar = (cajaRow) => {
          const id_caja = cajaRow.id_caja;
          const saldoActual = Number(cajaRow.saldo || 0);

          const now = new Date();
          const fecha = now.toISOString().slice(0, 10);
          const hora = now.toTimeString().slice(0, 8);

          const nuevoSaldo = tipoUp === "INGRESO"
            ? saldoActual + montoNum
            : saldoActual - montoNum;

          // 2) insertar transacción
          const q1 = `
          INSERT INTO caja_transacciones
          (id_caja, id_usuario, tipo, origen, nro_registro, monto, fecha, hora)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

          db.query(q1, [id_caja, user_id, tipoUp, origenUp, nro_registro || null, montoNum, fecha, hora], (e3, r3) => {
            if (e3) return res.send({ ok: false, msg: "Error insert transacción", err: String(e3) });

            // 3) actualizar saldo en caja
            db.query("UPDATE caja SET saldo=? WHERE id_caja=?", [nuevoSaldo, id_caja], (e4) => {
              if (e4) return res.send({ ok: false, msg: "Error update saldo", err: String(e4) });

              return res.send({
                ok: true,
                msg: "Movimiento registrado",
                id_transaccion: r3.insertId,
                id_caja,
                saldo_anterior: saldoActual,
                saldo_nuevo: nuevoSaldo,
              });
            });
          });
        };

        if (!cajas.length) {
          crearCaja(continuar);
        } else {
          continuar(cajas[0]);
        }
      });

    } catch (e) {
      return res.send({ ok: false, msg: "Error servidor", err: String(e) });
    }
  };

  getCaja = (req, res) => {
    try {

      // 1 obtener user_id del token
      const decoded = jwt.decode(req.cookies.accessToken, { complete: true });
      const user_id = decoded?.payload?.user_id;

      if (!user_id) {
        return res.send({ ok: false, msg: "Usuario no identificado" });
      }

      // 2 buscar caja del usuario
      let q = "SELECT * FROM caja WHERE id_usuario = ? LIMIT 1";

      db.query(q, [user_id], (err, result) => {
        if (err) {
          console.log(err);
          return res.send({ ok: false, msg: "Error DB" });
        }

        //  caja ya existe
        if (result.length > 0) {
          return res.send({
            ok: true,
            caja: result[0]
          });
        }

        // 3 si no existe -> crear caja
        let insertCaja = `
                    INSERT INTO caja (id_usuario, nombre_caja, saldo)
                    VALUES (?, '', 0)
                `;

        db.query(insertCaja, [user_id], (err2, result2) => {
          if (err2) {
            console.log(err2);
            return res.send({ ok: false, msg: "Error creando caja" });
          }

          const newIdCaja = result2.insertId;

          // 4 actualizar nombre "Caja X"
          let updateName = `
                        UPDATE caja
                        SET nombre_caja = ?
                        WHERE id_caja = ?
                    `;

          db.query(updateName, [`Caja ${newIdCaja}`, newIdCaja]);

          // devolver caja creada
          res.send({
            ok: true,
            caja: {
              id_caja: newIdCaja,
              id_usuario: user_id,
              nombre_caja: `Caja ${newIdCaja}`,
              saldo: 0
            }
          });
        });
      });

    } catch (error) {
      console.log(error);
      res.send({ ok: false, msg: "Error servidor" });
    }
  }

}

module.exports = Caja;

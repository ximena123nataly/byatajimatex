addExpense = (req, res) => {
  try {
    let d = jwt.decode(req.cookies.accessToken, { complete: true });
    const user_id = d?.payload?.user_id;

    new Promise((resolve, reject) => {
      const expense_id = uniqid();
      const montoGasto = Number(req.body.grand_total || 0);

      const q =
        "INSERT INTO `expenses`(`expense_id`, `expense_ref`, `supplier_id`, `due_date`, `items`, `tax`, `grand_total`) VALUES (?,?,?,?,?,?,?)";

      db.query(
        q,
        [
          expense_id,
          req.body.expense_reference,
          req.body.supplier_id,
          req.body.due_date,
          JSON.stringify(req.body.item_array),
          req.body.tax,
          req.body.grand_total,
        ],
        (err, result) => {
          if (err) return reject(err);

          // actualizar stock
          const parr = req.body.item_array.map((prod) => {
            return new Promise((res2, rej2) => {
              const q2 =
                "UPDATE `products` SET product_stock = product_stock + ? WHERE `product_id`= ?";
              db.query(q2, [prod.quantity, prod.product_id], (err2) => {
                if (err2) return rej2(err2);
                res2();
              });
            });
          });

          Promise.all(parr)
            .then(() => {
              // Si no hay user_id o monto inválido, no tocamos caja (pero gasto sí queda)
              if (!user_id || !Number.isFinite(montoGasto) || montoGasto <= 0) {
                return resolve({
                  operation: "success",
                  message: "Expense added successfully",
                });
              }

              
              db.query(
                "SELECT id_caja FROM caja WHERE id_usuario=? LIMIT 1",
                [user_id],
                (e1, r1) => {
                  if (e1 || !r1.length) {
                    console.log("Caja no encontrada o error:", e1);
                    return resolve({
                      operation: "success",
                      message: "Expense added successfully",
                    });
                  }

                  const id_caja = r1[0].id_caja;

                 
                  const now = new Date();
                  const fechaBO = now.toLocaleDateString("en-CA", {
                    timeZone: "America/La_Paz",
                  }); // YYYY-MM-DD
                  const horaBO = now.toLocaleTimeString("en-GB", {
                    timeZone: "America/La_Paz",
                    hour12: false,
                  }); // HH:mm:ss

                  
                  const qTx = `
                    INSERT INTO caja_transacciones
                    (id_caja, id_usuario, tipo, origen, nro_registro, monto, fecha, hora)
                    VALUES (?, ?, 'EGRESO', 'GASTO', ?, ?, ?, ?)
                  `;

                  db.query(
                    qTx,
                    [id_caja, user_id, expense_id, montoGasto, fechaBO, horaBO],
                    (eTx) => {
                      if (eTx) {
                        console.log("Error tx caja:", eTx);
                        return resolve({
                          operation: "success",
                          message: "Expense added successfully",
                        });
                      }

                   
                      db.query(
                        "UPDATE caja SET saldo = saldo - ? WHERE id_caja=?",
                        [montoGasto, id_caja],
                        (eUp) => {
                          if (eUp) console.log("Error saldo caja:", eUp);

                          return resolve({
                            operation: "success",
                            message: "Expense added successfully",
                          });
                        }
                      );
                    }
                  );
                }
              );
            })
            .catch((error) => {
              console.log(error);
              reject(error);
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
module.exports = {
  addExpense,
};
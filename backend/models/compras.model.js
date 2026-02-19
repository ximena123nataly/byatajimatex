const db = require("../db/conn.js");

//obtener
exports.getCompras = (req, res) => {

  const q = `
    SELECT 
  c.id,
  c.fecha,
  c.proveedor,
  c.metodo_pago,
  c.referencia,
  IFNULL(SUM(cd.cantidad * cd.precio),0) AS total

    FROM compras c
    LEFT JOIN compras_detalle cd ON c.id = cd.compra_id
    GROUP BY c.id
    ORDER BY c.id DESC
  `;

  db.query(q, (err, data) => {
    if (err) return res.status(500).json(err);
    return res.json(data);
  });
};


//obtener por id
exports.getCompraById = (req, res) => {

  const q = `
    SELECT 
      c.*,
      IFNULL(SUM(cd.cantidad * cd.precio),0) AS total
    FROM compras c
    LEFT JOIN compras_detalle cd ON c.id = cd.compra_id
    WHERE c.id = ?
    GROUP BY c.id
  `;

  db.query(q, [req.params.id], (err, data) => {
    if (err) return res.status(500).json(err);
    return res.json(data[0]);
  });
};


//crear una compra
exports.createCompra = (req, res) => {

  const { proveedor, metodo_pago, referencia, fecha, hora, productos } = req.body;

  const insertCompra = `
    INSERT INTO compras
    (proveedor, metodo_pago, referencia, fecha, hora)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(insertCompra, [proveedor, metodo_pago, referencia, fecha, hora], (err, result) => {

    if (err) return res.status(500).json(err);

    const compraId = result.insertId;

    // Si no hay productos
    if (!productos || productos.length === 0) {
      return res.json({
        message: "Compra creada sin productos",
        compra_id: compraId
      });
    }

    // Preparar inserción múltiple
    const insertDetalle = `
      INSERT INTO compras_detalle
      (compra_id, descripcion, cantidad, precio)
      VALUES ?
    `;

    const valoresDetalle = productos.map(prod => [
      compraId,
      prod.descripcion,
      prod.cantidad,
      prod.precio
    ]);

    db.query(insertDetalle, [valoresDetalle], (err2) => {
      if (err2) return res.status(500).json(err2);

      return res.json({
        message: "Compra creada correctamente",
        compra_id: compraId
      });
    });

  });
};


//actualizar compra
exports.updateCompra = (req, res) => {

  const q = `
    UPDATE compras SET
      proveedor = ?,
      metodo_pago = ?,
      referencia = ?,
      fecha = ?,
      hora = ?
    WHERE id = ?
  `;

  const values = [
    req.body.proveedor,
    req.body.metodo_pago,
    req.body.referencia,
    req.body.fecha,
    req.body.hora,
    req.params.id
  ];

  db.query(q, values, (err, data) => {
    if (err) return res.status(500).json(err);
    return res.json({ message: "Compra actualizada correctamente" });
  });
};


//eliminar compra
exports.deleteCompra = (req, res) => {

  const q = "DELETE FROM compras WHERE id = ?";

  db.query(q, [req.params.id], (err, data) => {
    if (err) return res.status(500).json(err);
    return res.json({ message: "Compra eliminada correctamente" });
  });
};

const db = require("../db/conn");

// Obtener todas las compras
exports.getCompras = (req, res) => {
  const q = "SELECT * FROM compras ORDER BY id DESC";

  db.query(q, (err, data) => {
    if (err) return res.status(500).json(err);
    return res.json(data);
  });
};

// Obtener una compra por ID
exports.getCompraById = (req, res) => {
  const q = "SELECT * FROM compras WHERE id = ?";

  db.query(q, [req.params.id], (err, data) => {
    if (err) return res.status(500).json(err);
    return res.json(data[0]);
  });
};

// Crear nueva compra
exports.createCompra = (req, res) => {
  const q = `
    INSERT INTO compras
    (proveedor, descripcion, total, pagado, saldo,
     metodo_pago, referencia, fecha, hora, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  const values = [
    req.body.proveedor,
    req.body.descripcion,
    req.body.total,
    req.body.pagado,
    req.body.saldo,
    req.body.metodo_pago,
    req.body.referencia,
    req.body.fecha,
    req.body.hora
  ];

  db.query(q, values, (err, data) => {
    if (err) return res.status(500).json(err);
    return res.json({ message: "Compra creada correctamente" });
  });
};

// Actualizar compra
exports.updateCompra = (req, res) => {
  const q = `
    UPDATE compras SET
    proveedor = ?,
    descripcion = ?,
    total = ?,
    pagado = ?,
    saldo = ?,
    metodo_pago = ?,
    referencia = ?,
    fecha = ?,
    hora = ?
    WHERE id = ?
  `;

  const values = [
    req.body.proveedor,
    req.body.descripcion,
    req.body.total,
    req.body.pagado,
    req.body.saldo,
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

// Eliminar compra
exports.deleteCompra = (req, res) => {
  const q = "DELETE FROM compras WHERE id = ?";

  db.query(q, [req.params.id], (err, data) => {
    if (err) return res.status(500).json(err);
    return res.json({ message: "Compra eliminada correctamente" });
  });
};

const express = require("express");
const router = express.Router();
const comprasController = require("../models/compras.model");

// GET
router.get("/compras", comprasController.getCompras);
router.get("/compras/:id", comprasController.getCompraById);

// POST
router.post("/compras", comprasController.createCompra);

// PUT
router.put("/compras/:id", comprasController.updateCompra);

// DELETE
router.delete("/compras/:id", comprasController.deleteCompra);

module.exports = router;

const express = require("express");
const router = express.Router();

const verifyJwt = require("../middlewares/verifyJwt.js");
const Proforma = require("../models/proformas.model.js");

const proforma = new Proforma();

// Crear
router.post("/add_proforma", verifyJwt, proforma.addProforma);

// Eliminar 
router.post("/delete_proforma", verifyJwt, proforma.deleteProforma);

// Listado
router.post("/get_proformas", verifyJwt, proforma.getProformas);

module.exports = router;






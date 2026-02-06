const express = require("express");
const router = express.Router();

const verifyJwt = require("../middlewares/verifyJwt.js");
const Caja = require("../models/caja.model.js");

const caja = new Caja();

// 👇 prueba sin token
router.get("/api/caja/test", caja.test);

// 👇 con token
router.post("/api/caja/get_caja", verifyJwt, caja.getCaja);
router.post("/api/caja/get_transacciones", verifyJwt, caja.getTransacciones);

module.exports = router;




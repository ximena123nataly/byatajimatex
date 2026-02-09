const express = require("express");
const router = express.Router();
const verifyJwt = require("../middlewares/verifyJwt.js");
const Caja = require("../models/caja.model.js");
const caja = new Caja();


router.get("/api/caja/test", caja.test);
router.post("/api/caja/get_caja", verifyJwt, caja.getCaja);
router.post("/api/caja/get_transacciones", verifyJwt, caja.getTransacciones);
router.post("/api/caja/get_cajas", verifyJwt, caja.getCajas);
router.post("/api/caja/get_caja_by_id", verifyJwt, caja.getCajaById);
router.post("/api/caja/get_transacciones_by_caja", verifyJwt, caja.getTransaccionesByCaja);

module.exports = router;



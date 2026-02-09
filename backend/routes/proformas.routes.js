const express = require("express");
const router = express.Router();
const verifyJwt = require("../middlewares/verifyJwt.js");
const Proforma = require("../models/proformas.model.js");
const proforma = new Proforma();


router.post("/add_proforma", verifyJwt, proforma.addProforma);
router.post("/delete_proforma", verifyJwt, proforma.deleteProforma);
router.post("/get_proformas", verifyJwt, proforma.getProformas);
router.post("/entregar_proforma", verifyJwt, proforma.entregarProforma);
router.post("/cobrar_proforma", verifyJwt, proforma.cobrarProforma);


module.exports = router;






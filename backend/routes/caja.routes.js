const express = require("express");
const router = express.Router();

const verifyJwt = require("../middlewares/verifyJwt.js");
const Caja = require("../models/caja.model.js");

const caja = new Caja();

router.post("/get_caja", verifyJwt, caja.getCaja);

module.exports = router;




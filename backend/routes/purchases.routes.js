const express = require("express");
const router = express.Router();
const verifyJwt = require("../middlewares/verifyJwt.js");
const Purchase = require("../models/purchases.model.js");

const purchase = new Purchase();

// routes/purchases.js
router.post("/getPurchases",verifyJwt, purchase.getPurchases);
router.post("/addPurchase", verifyJwt,purchase.addPurchase);

module.exports = router;
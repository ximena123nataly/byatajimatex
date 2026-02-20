const express = require("express");
const router = express.Router();
const Purchase = require("../models/purchases.model");

const purchase = new Purchase();

router.post("/api/purchases/get", purchase.getPurchases);
router.post("/api/purchases/add", purchase.addPurchase);

module.exports = router;
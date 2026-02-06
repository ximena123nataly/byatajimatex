const express = require("express");
const router = express.Router();
const verifyJwt = require("../middlewares/verifyJwt.js");

const expense = require("../models/expenses.model.js");

// solo si los otros endpoints existen (si no, coméntalos)
router.post("/add_expense", verifyJwt, expense.addExpense);

module.exports = router;

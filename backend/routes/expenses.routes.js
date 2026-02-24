const express = require("express");
const router = express.Router();
const verifyJwt = require("../middlewares/verifyJwt.js");
const Expense = require('../models/expenses.model.js');

const expense = new Expense();

router.post('/get_expenses', verifyJwt, expense.getExpenses)
router.post('/add_expense', verifyJwt, expense.addExpense)
router.post('/delete_expense', verifyJwt, expense.deleteExpense)

// Rutas GET adicionales
router.get('/expenses', verifyJwt, (req, res) => {
  // Convertir query params a body para usar la misma función
  req.body = {
    search_value: req.query.search || "",
    sort_column: req.query.sort || "",
    sort_order: req.query.order || "",
    start_value: parseInt(req.query.start) || 0,
    date_from: req.query.date_from || "",
    date_to: req.query.date_to || "",
    export_all: req.query.export_all === 'true'
  };
  
  // ✅ Usamos la instancia, no la clase
  expenseInstance.getExpenses(req, res);
});

module.exports = router
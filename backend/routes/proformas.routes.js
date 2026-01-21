const router = require("express").Router();

// DEMO: guarda proforma (por ahora solo responde OK)
router.post("/add", async (req, res) => {
  try {
    console.log("✅ PROFORMA RECIBIDA:", req.body);

    // aquí luego irá INSERT a la BD
    return res.status(200).json({
      operation: "success",
      proforma_id: "DEMO-" + Date.now(),
    });
  } catch (err) {
    console.error("❌ ERROR add proforma:", err);
    return res.status(500).json({
      operation: "error",
      message: "Error interno",
    });
  }
});

module.exports = router;

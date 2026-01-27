const router = require("express").Router();
const proformas = require("../controllers/proformas.controller");

// ✅ LISTAR
router.get("/", proformas.getProformas);

// ✅ TRAER 1 (para editar/ver)
router.get("/:id", proformas.getProformaById);

// ✅ CREAR (lo usa tu frontend: POST /proformas/add)
router.post("/add", proformas.addProforma);

// ✅ ACTUALIZAR
router.put("/:id", proformas.updateProforma);

// ✅ ELIMINAR
router.delete("/:id", proformas.deleteProforma);

module.exports = router;





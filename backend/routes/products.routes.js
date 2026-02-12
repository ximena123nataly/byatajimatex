const express = require("express");
const router = express.Router();

const verifyJwt = require("../middlewares/verifyJwt.js");
const Product = require('../models/products.model.js');
const upload = require("../middlewares/upload.js");

const product = new Product();


router.post('/add_product', 
    verifyJwt,                          
    upload('/uploads').single('image'), 
    product.addProduct                  
);
router.post('/delete_product', verifyJwt, product.deleteProduct)
router.post('/get_products', verifyJwt, product.getProducts)
router.post('/get_products_search', verifyJwt, product.getProductsSearch)
router.post('/get_products_details_by_id', verifyJwt, product.getProductsDetailsById)
router.post('/update_product', verifyJwt, upload("/uploads").single("image"), product.updateProduct)
router.post('/delete_product_image', verifyJwt, product.deleteProductImage)

// Rutas GET adicionales
router.get('/products', verifyJwt, (req, res) => {
  // Convertir query params a body para usar la misma función
  req.body = {
    search_value: req.query.search || "",
    sort_column: req.query.sort || "",
    sort_order: req.query.order || "",
    start_value: parseInt(req.query.start) || 0
  };
  product.getProducts(req, res);
});

module.exports = router
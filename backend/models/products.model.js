const db = require('../db/conn.js');
const jwt = require('jsonwebtoken');
const uniqid = require("uniqid")
const fs = require("fs")
const path = require("path")

class Product {
	constructor() {

	}

	getProducts = (req, res) => {
		try {
			jwt.decode(req.cookies.accessToken, { complete: true });

			new Promise((resolve, reject) => {
				const searchValue = String(req.body.search_value || "").trim();
				const startValue = parseInt(req.body.start_value || 0, 10);

				let whereClause = "";
				let params = [];

				if (searchValue !== "") {
					whereClause = `
					WHERE
						name LIKE ?
						OR description LIKE ?
						OR category LIKE ?
						OR material LIKE ?
						OR gender LIKE ?
						OR size LIKE ?
				`;
					const likeValue = `%${searchValue}%`;
					params.push(likeValue, likeValue, likeValue, likeValue, likeValue, likeValue);
				}

				let orderClause = "";
				const allowedSortColumns = ["name", "gender", "category", "product_stock", "timeStamp"];
				const allowedSortOrders = ["ASC", "DESC"];

				if (
					allowedSortColumns.includes(req.body.sort_column) &&
					allowedSortOrders.includes(String(req.body.sort_order || "").toUpperCase())
				) {
					orderClause = ` ORDER BY ${req.body.sort_column} ${String(req.body.sort_order).toUpperCase()} `;
				}

				let qData = `
  SELECT *
  FROM products
  ${whereClause}
  ${orderClause}
`;

				let dataParams = [...params];

				if (searchValue === "") {
					qData += ` LIMIT ?, 10 `;
					dataParams.push(startValue);
				}

				db.query(qData, dataParams, (err, result) => {
					if (err) return reject(err);

					const qCount = `
					SELECT COUNT(*) AS val
					FROM products
					${whereClause}
				`;

					db.query(qCount, params, (err2, result2) => {
						if (err2) return reject(err2);

						resolve({
							operation: "success",
							message: "products got",
							info: {
								products: result,
								count: result2[0].val
							}
						});
					});
				});
			})
				.then((value) => {
					res.send(value);
				})
				.catch((err) => {
					console.log(err);
					res.send({ operation: "error", message: "Something went wrong" });
				});
		} catch (error) {
			console.log(error);
			res.send({ operation: "error", message: "Something went wrong" });
		}
	}

	getProductsSearch = (req, res) => {
		try {
			let d = jwt.decode(req.cookies.accessToken, { complete: true });

			new Promise((resolve, reject) => {
				const searchValue = (req.body.search_value || "").trim();

				let q = `
				SELECT * 
				FROM products
				WHERE
					name LIKE ?
					OR category LIKE ?
					OR description LIKE ?
					OR material LIKE ?
				ORDER BY name ASC
				LIMIT 50
			`;

				const likeValue = `%${searchValue}%`;

				db.query(q, [likeValue, likeValue, likeValue, likeValue], (err, result) => {
					if (err) {
						return reject(err);
					}

					resolve({
						operation: "success",
						message: "Products found",
						info: { products: result }
					});
				});
			})
				.then((value) => {
					res.send(value);
				})
				.catch((err) => {
					console.log(err);
					res.send({ operation: "error", message: 'Something went wrong' });
				});
		} catch (error) {
			console.log(error);
			res.send({ operation: "error", message: 'Something went wrong' });
		}
	}

	getProductsDetailsById = (req, res) => {
		try {
			let d = jwt.decode(req.cookies.accessToken, { complete: true });
			let email = d.payload.email;
			let role = d.payload.role;

			new Promise((resolve, reject) => {
				let q = `SELECT * FROM products WHERE product_id IN (?)`
				db.query(q, [req.body.product_id_list], (err, result) => {
					if (err) {
						return reject(err);
					}

					resolve({ operation: "success", message: 'Success', info: { products: result } });
				})
			})
				.then((value) => {
					res.send(value);
				})
				.catch((err) => {
					console.log(err);
					res.send({ operation: "error", message: 'Something went wrong' });
				})
		} catch (error) {
			console.log(error);
			res.send({ operation: "error", message: 'Something went wrong' });
		}
	}
	getProductsReport = (req, res) => {
		try {
			new Promise((resolve, reject) => {
				const q = `
        SELECT 
          product_id,
          name,
          category,
          product_stock,
          selling_price,
          image
        FROM products
        ORDER BY category ASC, name ASC
      `;

				db.query(q, (err, result) => {
					if (err) return reject(err);

					const totalProducts = result.length;
					const totalStock = result.reduce((sum, item) => {
						return sum + (parseInt(item.product_stock) || 0);
					}, 0);

					resolve({
						operation: "success",
						message: "Reporte de productos obtenido",
						info: {
							products: result,
							total_products: totalProducts,
							total_stock: totalStock
						}
					});
				});
			})
				.then((value) => res.send(value))
				.catch((err) => {
					console.log(err);
					res.send({
						operation: "error",
						message: "Error al obtener el reporte de productos"
					});
				});
		} catch (error) {
			console.log(error);
			res.send({
				operation: "error",
				message: "Error al obtener el reporte de productos"
			});
		}
	}
	addProduct = (req, res) => {
		try {
			let d = jwt.decode(req.cookies.accessToken, { complete: true });
			let email = d.payload.email;
			let role = d.payload.role;

			new Promise((resolve, reject) => {
				let q = "INSERT INTO `products`(`product_id`, `name`, `gender`, `size`, `material`, `category`, `description`, `product_stock`, `image`, `selling_price`, `purchase_price`) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
				db.query(q, [uniqid(), req.body.name, req.body.gender, req.body.size, req.body.material, req.body.category, req.body.description, req.body.product_stock, req.body.f_name, req.body.selling_price, req.body.purchase_price], (err, result) => {
					if (err) {
						return reject(err);
					}
					resolve({ operation: "success", message: 'Product added successfully' });
				})
			})
				.then((value) => {
					res.send(value);
				})
				.catch((err) => {
					console.log(err);
					res.send({ operation: "error", message: 'Something went wrong' });
				})
		} catch (error) {
			console.log(error);
			res.send({ operation: "error", message: 'Something went wrong' });
		}
	}

	updateProduct = (req, res) => {
		try {
			let d = jwt.decode(req.cookies.accessToken, { complete: true });
			let email = d.payload.email;
			let role = d.payload.role;

			new Promise((resolve, reject) => {
				let ts = ""
				if (req.body.f_name) {
					ts = `image="${req.body.f_name}",`
				}
				let q = "UPDATE `products` SET `name`=?,`gender`=?,`size`=?,`material`=?,`category`=?,`description`=?,`product_stock`=?," + ts + "`selling_price`=?,`purchase_price`=? WHERE product_id=?"
				db.query(q, [req.body.name, req.body.gender, req.body.size, req.body.material, req.body.category, req.body.description, req.body.product_stock, req.body.selling_price, req.body.purchase_price, req.body.product_id], (err, result) => {
					if (err) {
						return reject(err);
					}
					resolve({ operation: "success", message: 'Product updated successfully' });
				})
			})
				.then((value) => {
					res.send(value);
				})
				.catch((err) => {
					console.log(err);
					res.send({ operation: "error", message: 'Something went wrong' });
				})
		} catch (error) {
			console.log(error);
			res.send({ operation: "error", message: 'Something went wrong' });
		}
	}

	deleteProduct = (req, res) => {
		try {
			let d = jwt.decode(req.cookies.accessToken, { complete: true });
			let email = d.payload.email;
			let role = d.payload.role;

			new Promise((resolve, reject) => {
				let q = "SELECT * FROM `products` WHERE product_id = ?"
				db.query(q, [req.body.product_id], (err, result) => {
					if (err) {
						return reject(err);
					}

					let p
					if (result[0].image != null) {
						p = new Promise((res, rej) => {
							let pathToFile = path.resolve("./") + "/public/uploads/" + result[0].image

							fs.unlink(pathToFile, function (ferr) {
								if (ferr) {
									rej(ferr);
								}
								res();
							})
						})
					}
					else {
						p = Promise.resolve();
					}

					p.then(() => {
						let q2 = "DELETE FROM `products` WHERE product_id = ?"
						db.query(q2, [req.body.product_id], (err2, result2) => {
							if (err2) {
								return reject(err2);
							}
							resolve({ operation: "success", message: 'product deleted successfully' });
						})
					})
						.catch((err3) => {
							reject(err3)
						})
				})
			})
				.then((value) => {
					res.send(value);
				})
				.catch((err) => {
					console.log(err);
					res.send({ operation: "error", message: 'Something went wrong' });
				})
		} catch (error) {
			console.log(error);
			res.send({ operation: "error", message: 'Something went wrong' });
		}
	}

	deleteProductImage = (req, res) => {
		try {
			let d = jwt.decode(req.cookies.accessToken, { complete: true });
			let email = d.payload.email;
			let role = d.payload.role;

			new Promise((resolve, reject) => {
				let q = "SELECT * FROM `products` WHERE product_id = ?"
				db.query(q, [req.body.product_id], (err, result) => {
					if (err) {
						return reject(err);
					}

					let pathToFile = path.resolve("./") + "/public/uploads/" + result[0].image

					fs.unlink(pathToFile, function (err) {
						if (err) {
							return reject(err);
						}

						let q2 = "UPDATE `products` SET image = NULL WHERE product_id = ?"
						db.query(q2, [req.body.product_id], (err, result2) => {
							if (err) {
								return reject(err);
							}
							resolve({ operation: "success", message: 'product image deleted successfully' });
						})
					})
				})
			})
				.then((value) => {
					res.send(value);
				})
				.catch((err) => {
					console.log(err);
					res.send({ operation: "error", message: 'Something went wrong' });
				})
		} catch (error) {
			console.log(error);
			res.send({ operation: "error", message: 'Something went wrong' });
		}
	}
}

module.exports = Product;
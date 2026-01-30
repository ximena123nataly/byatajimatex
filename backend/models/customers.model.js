const db = require('../db/conn.js');
const jwt = require('jsonwebtoken');
const uniqid = require("uniqid")

class Customer {
	constructor() {
		//console.log('Customer object initialized');
	}

	getCustomers = (req, res) => {
		try {
			let d = jwt.decode(req.cookies.accessToken, { complete: true });
			let email = d.payload.email;
			let role = d.payload.role;

			new Promise((resolve, reject) => {

				let tsa = ""


				// CAMBIO: incluir celular en la búsqueda del listado
				if (req.body.search_value != "") {
					tsa = `WHERE name LIKE "%${req.body.search_value}%"
      OR address LIKE "%${req.body.search_value}%"
      OR email LIKE "%${req.body.search_value}%"
      OR celular LIKE "%${req.body.search_value}%"`
				}


				let tso = ""
				if ((req.body.sort_column != "") && (req.body.sort_order != "")) {
					tso = `ORDER BY ${req.body.sort_column} ${req.body.sort_order}`
				}

				let q = "SELECT * FROM `customers` " + tsa + tso + " LIMIT ?, 10"
				db.query(q, [req.body.start_value], (err, result) => {
					if (err) {
						return reject(err);
					}

					if (req.body.search_value != "") {
						return resolve({ operation: "success", message: 'search customers got', info: { customers: result, count: result.length } });
					}
					let q = "SELECT COUNT(*) AS val FROM `customers`"
					db.query(q, (err, result2) => {
						if (err) {
							return reject(err);
						}
						// console.log(result2)
						resolve({ operation: "success", message: '10 customers got', info: { customers: result, count: result2[0].val } });
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
//----------------------------------
	addCustomer = (req, res) => {
		try {
			const d = jwt.decode(req.cookies.accessToken, { complete: true });

			//usuario que crea el cliente (interno)
			const user_id =
				d?.payload?.user_id ||
				d?.payload?.employee_id ||
				d?.payload?.id ||
				null;

			const customerId = uniqid();

			let q2 = `
      INSERT INTO customers
      (customer_id, user_id, name, address, email, celular)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

			db.query(
				q2,
				[
					customerId,
					user_id,
					req.body.name,
					req.body.address,
					req.body.email,
					req.body.celular || null
				],
				(err) => {
					if (err) {
						console.log(err);
						return res.send({ operation: "error", message: "Something went wrong" });
					}

					res.send({
						operation: "success",
						message: "Customer added successfully",
						info: { customer_id: customerId }
					});
				}
			);
		} catch (error) {
			console.log(error);
			res.send({ operation: "error", message: "Something went wrong" });
		}
	};

//--------------------------------------
	updateCustomer = (req, res) => {
		try {
			let d = jwt.decode(req.cookies.accessToken, { complete: true });
			let email = d.payload.email;
			let role = d.payload.role;

			new Promise((resolve, reject) => {
				let q1 = "SELECT * FROM `customers` WHERE email = ?"
				db.query(q1, [req.body.email], (err1, result1) => {
					if (err1) {
						return reject(err1);
					}

					if ((result1.length > 0) && (result1[0].customer_id != req.body.customer_id)) {
						resolve({ operation: "error", message: 'Duplicate customer email' });
					}
					else {
						//CAMBIO: actualizar también `celular`
						let q2 = "UPDATE `customers` SET `name`=?,`address`=?,`email`=?,`celular`=? WHERE `customer_id`=?"
						db.query(q2, [req.body.name, req.body.address, req.body.email, req.body.celular, req.body.customer_id], (err2, result2) => {
							if (err2) {
								return reject(err2);
							}
							resolve({ operation: "success", message: 'Customer updated successfully' });
						})
					}
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

	getCustomersSearch = (req, res) => {
		try {
			jwt.decode(req.cookies.accessToken, { complete: true });

			new Promise((resolve, reject) => {
				const search = (req.body.search_value || "").trim();
				const like = `${search}%`;

				const q = `
        SELECT *
        FROM customers
        WHERE name LIKE ? OR celular LIKE ?
        ORDER BY timeStamp DESC
        LIMIT 10
      `;

				db.query(q, [like, like], (err, result) => {
					if (err) return reject(err);
					resolve({ operation: "success", message: "10 customers got", info: { customers: result } });
				});
			})
				.then(value => res.send(value))
				.catch(err => {
					console.log(err);
					res.send({ operation: "error", message: "Something went wrong" });
				});

		} catch (error) {
			console.log(error);
			res.send({ operation: "error", message: "Something went wrong" });
		}
	}



	deleteCustomer = (req, res) => {
		try {
			let d = jwt.decode(req.cookies.accessToken, { complete: true });
			let email = d.payload.email;
			let role = d.payload.role;

			new Promise((resolve, reject) => {
				let q = "DELETE FROM `customers` WHERE customer_id = ?"
				db.query(q, [req.body.customer_id], (err, result) => {
					if (err) {
						return reject(err);
					}
					resolve({ operation: "success", message: 'customer deleted successfully' });
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

module.exports = Customer;

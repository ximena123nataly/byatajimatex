const db = require('../db/conn.js');
const jwt = require('jsonwebtoken');
const uniqid = require("uniqid")

class Expense {

	constructor() {}


	getExpenses = (req, res) => {
		try {

			new Promise((resolve, reject) => {

				let tsa = ""
				if(req.body.search_value!="")
				{
					tsa = `WHERE s.name LIKE "%${req.body.search_value}%"
						   OR e.expense_ref LIKE "%${req.body.search_value}%"`
				}

				let tso = ""
				if((req.body.sort_column!="") && (req.body.sort_order!=""))
				{
					tso = `ORDER BY ${req.body.sort_column} ${req.body.sort_order}`
				}

				let q = `
					SELECT e.*, s.name as supplier_name
					FROM expenses e
					LEFT JOIN suppliers s ON e.supplier_id=s.supplier_id
					${tsa}
					${tso}
					LIMIT ?,10
				`;

				db.query(q, [req.body.start_value], (err, result) => {
					if (err) return reject(err);

					let q2 = "SELECT COUNT(*) AS val FROM expenses";
					db.query(q2, (err2, result2) => {
						if (err2) return reject(err2);

						resolve({
							operation: "success",
							info: {
								expenses: result,
								count: result2[0].val
							}
						});
					})
				})

			})
			.then(v => res.send(v))
			.catch(err => {
				console.log(err);
				res.send({ operation:"error" });
			})

		} catch (e) {
			console.log(e);
			res.send({ operation:"error" });
		}
	}


	
	addExpense = (req, res) => {

		try {

			let d = jwt.decode(req.cookies.accessToken, { complete: true });
			let id_usuario = d.payload.user_id;

			new Promise((resolve, reject) => {

				const expense_id = uniqid();

				let q = `
					INSERT INTO expenses
					(expense_id, expense_ref, supplier_id, due_date, items, tax, grand_total)
					VALUES (?,?,?,?,?,?,?)
				`;

				db.query(q, [
					expense_id,
					req.body.expense_reference,
					req.body.supplier_id,
					req.body.due_date,
					JSON.stringify(req.body.item_array),
					req.body.tax,
					req.body.grand_total
				], (err) => {

					if(err) return reject(err);

				
					let parr = req.body.item_array.map((prod) => {
						return new Promise((res2, rej2) => {
							let q2 = `
								UPDATE products
								SET product_stock = product_stock + ?
								WHERE product_id = ?
							`;
							db.query(q2,[prod.quantity, prod.product_id], (e2)=>{
								if(e2) return rej2(e2);
								res2();
							});
						});
					});

					Promise.all(parr)
					.then(()=>{

						

						let qcaja = `
							SELECT id_caja
							FROM caja
							WHERE id_usuario = ?
							LIMIT 1
						`;

						db.query(qcaja,[id_usuario], (errCaja, cajaRes)=>{

							if(errCaja) return reject(errCaja);
							if(cajaRes.length === 0)
								return resolve({operation:"success"});

							let id_caja = cajaRes[0].id_caja;

							let qtx = `
								INSERT INTO caja_transacciones
								(id_transaccion,id_usuario,id_caja,tipo,origen,nro_registro,monto,fecha,hora)
								VALUES (?,?,?,?,?,?,?,CURDATE(),CURTIME())
							`;

							db.query(qtx,[
								uniqid(),
								id_usuario,
								id_caja,
								'EGRESO',
								'GASTO',
								expense_id,
								req.body.grand_total
							], (errTx)=>{

								if(errTx) return reject(errTx);

								let qup = `
									UPDATE caja
									SET saldo = saldo - ?
									WHERE id_caja = ?
								`;

								db.query(qup,[req.body.grand_total,id_caja], ()=>{
									resolve({
										operation:"success",
										message:"Expense added successfully"
									});
								});

							});

						});

					})
					.catch(reject);

				});

			})
			.then(v => res.send(v))
			.catch(err=>{
				console.log(err);
				res.send({operation:"error"});
			});

		} catch(e) {
			console.log(e);
			res.send({operation:"error"});
		}
	}


	deleteExpense = (req,res)=>{
		db.query(
			"DELETE FROM expenses WHERE expense_id=?",
			[req.body.expense_id],
			()=> res.send({operation:"success"})
		);
	}

}

module.exports = Expense;

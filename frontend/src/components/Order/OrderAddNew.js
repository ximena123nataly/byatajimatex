import React, { useEffect, useState } from 'react'
import './OrderAddNew.scss'

import Select from 'react-select'
import swal from 'sweetalert';
import Loader from '../PageStates/Loader';
import Error from '../PageStates/Error';

function OrderAddNew() {
	const [pageState, setPageState] = useState(1)
	const [permission, setPermission] = useState(null)

	const [customerList, setCustomerList] = useState([])
	const [productList, setProductList] = useState([])

	const [orderRef, setOrderRef] = useState('')
	const [selectedCustomer, setSelectedCustomer] = useState(null)

	// CAMBIO: estados para el Modal "Nuevo cliente"
	const [showCustomerModal, setShowCustomerModal] = useState(false);
	const [newCustomerName, setNewCustomerName] = useState("");
	const [newCustomerEmail, setNewCustomerEmail] = useState("");
	const [newCustomerAddress, setNewCustomerAddress] = useState("");
	const [savingCustomer, setSavingCustomer] = useState(false);
	const [newCustomerCelular, setNewCustomerCelular] = useState("");

	const today = new Date().toISOString().slice(0, 10);
	const [dueDate, setDueDate] = useState(today);

	const [itemArray, setItemArray] = useState([{ product_id: null, product_name: null, quantity: 0, rate: 0, max_stock: 0 }])
	const [tax, setTax] = useState(0)
	const [grandTotal, setGrandTotal] = useState(0)

	const [submitButtonState, setSubmitButtonState] = useState(false)

	useEffect(() => {
		//moment.locale("es");
		fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/verifiy_token`, {
			method: 'POST',
			credentials: 'include'
		})
			.then(res => res.json())
			.then(body => {
				if (body.operation === 'success') {
					fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_permission`, {
						method: 'POST',
						credentials: 'include'
					})
						.then(res => res.json())
						.then(body => {
							const p = body.permissions?.find(x => x.page === 'orders'); // o 'sales'

							if (p?.view && p?.create) {
								setPermission(p);
							} else {
								window.location.href = '/unauthorized';
							}
						});
				} else {
					window.location.href = '/login';
				}
			})
			.catch(console.log);
	}, [])

	const getProducts = async (value) => {
		let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_products_search`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json; charset=UTF-8'
			},
			body: JSON.stringify({ search_value: value }),
			credentials: 'include'
		})

		let body = await result.json()
		setProductList(body.info.products)
	}

	const getCustomers = async (value) => {
		let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_customers_search`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json; charset=UTF-8'
			},
			body: JSON.stringify({ search_value: value }),
			credentials: 'include'
		})

		let body = await result.json()
		setCustomerList(body.info.customers)
	}

	useEffect(() => {
		if (permission !== null) {
			setPageState(2);
		}
	}, [permission])

	useEffect(() => {
		let temp = itemArray.reduce((p, o) => { return p + (o.quantity * o.rate) }, 0)
		setGrandTotal(temp + (temp * tax / 100))
	}, [itemArray, tax])


	const insertOrder = async () => {
		if (orderRef === "") {
			swal("Oops!", "La referencia del pedido no puede estar vacía", "error")
			return;
		}
		if (selectedCustomer === null) {
			swal("Oops!", "Por favor selecciona un cliente", "error")
			return;
		}
		if (dueDate === "") {
			swal("Oops!", "Por favor selecciona una fecha de vencimiento", "error")
			return;
		}

		let flag2 = false
		for (let i = 0; i < itemArray.length; i++) {
			if (itemArray[i].quantity > itemArray[i].max_stock) {
				swal("Oops!", `El stock máximo disponible de "${itemArray[i].product_name}" es ${itemArray[i].max_stock} unidades`, "error")
				flag2 = true
				break;
			}
		}
		if (flag2) {
			return
		}

		let flag = false;
		itemArray.forEach(obj => {
			if (obj.product_id === null || obj.product_name === null || obj.quantity < 1 || obj.rate < 1) {
				flag = true;
			}
		});
		if (flag) {
			swal("Oops!", "Por favor ingresa correctamente todos los detalles del ítem! [selecciona un producto, revisa cantidad y tarifa]", "error")
			return;
		}

		if (tax < 0) {
			swal("Oops!", "El impuesto no puede ser negativo!", "error")
			return;
		}

		let obj = {}
		obj.order_reference = orderRef;
		obj.customer_id = selectedCustomer.value;
		obj.due_date = dueDate;

		let t = itemArray.map(obj => {
			let { max_stock, ...objSpread } = obj
			return objSpread
		})

		obj.item_array = t
		obj.tax = tax
		obj.grand_total = grandTotal

		setSubmitButtonState(true)

		let response = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/add_order`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json; charset=UTF-8',
			},
			body: JSON.stringify(obj),
			credentials: 'include'
		})
		let body = await response.json()

		setSubmitButtonState(false)
		//console.log(body)

		if (body.operation === 'success') {
			console.log('Pedido creado exitosamente')
			swal("¡Éxito!", "Venta creada exitosamente", "success")

			setOrderRef('')
			setSelectedCustomer(null)

			// CAMBIO: al guardar, la fecha vuelve a HOY
			setDueDate(today)

			setItemArray([{ product_id: null, product_name: null, quantity: 0, rate: 0, max_stock: 0 }])

			setTax(0)
			setGrandTotal(0)
		} else {
			swal("Oops!", body.message, "error")
		}
	}

	// CAMBIO: función para crear cliente 
	const createCustomer = async () => {
		if (!newCustomerName.trim()) {
			swal("¡Ups!", "El nombre es obligatorio", "error");
			return;
		}

		setSavingCustomer(true);

		try {
			const res = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/add_customer`, {
				method: "POST",
				headers: { "Content-type": "application/json; charset=UTF-8" },
				credentials: "include",
				body: JSON.stringify({
					name: newCustomerName,
					email: newCustomerEmail,
					address: newCustomerAddress,
					celular: newCustomerCelular,
				}),
			});

			const body = await res.json();
			setSavingCustomer(false);

			if (body.operation === "success") {
				const customerId = body.info?.customer_id ?? body.customer_id;

				setSelectedCustomer({ label: newCustomerName, value: customerId });

				setShowCustomerModal(false);
				setNewCustomerName("");
				setNewCustomerEmail("");
				setNewCustomerAddress("");
				setNewCustomerCelular("");


				swal("Éxito", "Cliente creado y seleccionado", "success");
			} else {
				swal("¡Ups!", body.message || "No se pudo crear el cliente", "error");
			}
		} catch (e) {
			setSavingCustomer(false);
			swal("¡Ups!", "Error de conexión al crear cliente", "error");
		}
	};

	return (
		<div className='orderaddnew'>
			<div style={{ overflow: "scroll", height: "100%" }} >
				<div className='order-header'>
					<div className='title'>Añadir nueva venta</div>
					{/* breadcrumb */}
				</div>

				{
					pageState === 1 ?
						<Loader />
						: pageState === 2 ?
							<div className="card">
								<div className="container" style={{ display: "flex", flexDirection: "column" }}>
									<h3 style={{ marginLeft: "10px", marginTop: "5px", color: "darkseagreen" }}>Detalles básicos de la venta</h3>
									<div style={{ display: "flex", marginTop: "5px" }}>
										<div style={{ flexGrow: "1", textAlign: "center" }}>
											<input className='my_input' type='text' value={orderRef} onChange={(e) => { setOrderRef(e.target.value) }} placeholder='Referencia del pedido' />
										</div>

										{/*  CAMBIO: Select + botón “+ Nuevo” (abre Modal) */}
										<div style={{ flexGrow: "1", display: "flex", gap: "10px", alignItems: "center" }}>
											<div style={{ flexGrow: 1 }}>
												<Select
													options={customerList.map(x => ({ label: x.name, value: x.customer_id }))}
													value={selectedCustomer}
													placeholder='Selecciona un cliente...'
													onChange={(val) => setSelectedCustomer(val)}
													onMenuOpen={() => getCustomers("")}
													onInputChange={(val) => {
														getCustomers(val || "");
														return val;
													}}
													classNamePrefix="react-dropdown-dark"
												/>
											</div>

											<button
												type="button"
												className="btn info"
												onClick={() => setShowCustomerModal(true)}
												style={{ whiteSpace: "nowrap" }}
											>
												+ Nuevo
											</button>
										</div>

										<div style={{ flexGrow: "1", textAlign: "center" }}>
											<input className='my_input' type='date' value={dueDate} onChange={(e) => { setDueDate(e.target.value) }} />
										</div>
									</div>

									<h3 style={{ marginLeft: "10px", marginTop: "5px", color: "darkseagreen" }}>Lista de productos</h3>
									<div style={{ margin: "0 15px" }}>
										<div style={{ display: "flex", textAlign: "center" }}>
											<div style={{ minWidth: "30%", color: "#626664", fontWeight: "bold" }}>Producto</div>
											<div style={{ minWidth: "20%", color: "#626664", fontWeight: "bold" }}>Cantidad</div>
											<div style={{ minWidth: "20%", color: "#626664", fontWeight: "bold" }}>Tarifa</div>
											<div style={{ minWidth: "20%", color: "#626664", fontWeight: "bold" }}>Total</div>
											<div style={{ minWidth: "10%", color: "#626664", fontWeight: "bold" }}></div>
										</div>

										{
											itemArray.map((obj, ind) => {
												return (
													<div key={ind} style={{ display: "flex", textAlign: "center", alignItems: "center", height: "2.5rem", margin: "0.3rem 0" }}>
														<div style={{ minWidth: "30%", height: "100%" }}>
															<Select
																options={productList.map(x => { return { label: x.name, value: x.product_id } })}
																value={(obj.product_name !== null && obj.product_id !== null) ? { label: obj.product_name, value: obj.product_id } : null}
																placeholder='Selecciona un producto...'
																onChange={(val) => {
																	let t = itemArray.map(x => { return { ...x } })
																	t[ind].product_id = val.value
																	t[ind].product_name = val.label
																	t[ind].quantity = 1
																	t[ind].rate = parseFloat(productList.find(x => x.product_id === val.value).selling_price)
																	t[ind].max_stock = parseInt(productList.find(x => x.product_id === val.value).product_stock)
																	setItemArray(t)
																}}
																onMenuOpen={() => getProducts("")}
																onInputChange={(val) => {
																	getProducts(val || "");
																	return val;
																}}
																classNamePrefix="react-dropdown-dark"
															/>
														</div>
														<div style={{ minWidth: "20%", height: "100%" }}>
															<input className='my_input' style={{ width: "90%", height: "100%", marginLeft: "10%" }} type="number" max={obj.max_stock} value={obj.quantity.toString()}
																onChange={(e) => {
																	let t = itemArray.map(x => { return { ...x } })
																	t[ind].quantity = e.target.value === "" ? 0 : parseFloat(e.target.value)
																	setItemArray(t)
																}}
															/>
														</div>
														<div style={{ minWidth: "20%", height: "100%" }}>
															<input className='my_input' style={{ width: "90%", height: "100%", marginLeft: "10%" }} type="number" value={obj.rate.toString()}
																onChange={(e) => {
																	let t = itemArray.map(x => { return { ...x } })
																	t[ind].rate = e.target.value === "" ? 0 : parseFloat(e.target.value)
																	setItemArray(t)
																}}
															/>
														</div>
														<div style={{ minWidth: "20%", height: "100%" }}>
															<p className='my_input' style={{ width: "90%", height: "100%", marginLeft: "10%" }} >{obj.quantity * obj.rate}</p>
														</div>
														<div style={{ minWidth: "10%", height: "100%" }}>
															{
																itemArray.length > 1 &&
																<button className='btn danger' style={{ borderRadius: "3rem", width: "3rem" }}
																	onClick={() => {
																		let t = itemArray.map(x => { return { ...x } })
																		t.splice(ind, 1)
																		setItemArray(t)
																	}}
																>&#10006;</button>
															}
														</div>
													</div>
												)
											})
										}
									</div>

									<button className='btn info' style={{ maxWidth: "15%", margin: "0 15px" }}
										onClick={() => {
											let t = itemArray.map(x => { return { ...x } })
											t.push({ product_id: null, product_name: null, quantity: 0, rate: 0, max_stock: 0 })
											setItemArray(t)
										}}
									>Sumar +</button>

									<div style={{ margin: "0 15px" }}>
										<div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", margin: "0.2rem 0" }}>
											<div style={{ marginRight: "1rem", color: "rgb(98, 102, 100)" }} ><h4>Subtotal</h4></div>
											<div style={{ width: "20%", marginRight: "8%" }}><p className='my_input' >{itemArray.reduce((p, o) => { return p + (o.quantity * o.rate) }, 0)}</p></div>
										</div>
										<div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", margin: "0.2rem 0" }}>
											<div style={{ marginRight: "1rem", color: "rgb(98, 102, 100)" }} ><h4>Impuestos (%)</h4></div>
											<div style={{ width: "20%", marginRight: "8%" }}><input className='my_input' style={{ width: "90%", height: "100%" }} type="number" value={tax.toString()} onChange={(e) => { setTax(e.target.value === "" ? 0 : parseFloat(e.target.value)) }} /></div>
										</div>
										<hr style={{ width: "50%", marginLeft: "auto" }} />
										<div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", margin: "0.2rem 0" }}>
											<div style={{ marginRight: "1rem", color: "rgb(98, 102, 100)" }} ><h3>Total general</h3></div>
											<div style={{ width: "20%", marginRight: "8%" }}><p className='my_input'>{grandTotal}</p></div>
										</div>
									</div>

									{
										permission.create &&
										<button className='btn success' style={{ alignSelf: "center" }} disabled={submitButtonState}
											onClick={() => {
												swal({
													title: "¿Estás seguro?",
													text: "Por favor revisa todos los datos antes de enviar, ya que el pedido no se puede editar después de crearlo",
													icon: "warning",
													buttons: true,
												})
													.then((val) => {
														if (val) {
															insertOrder()
														}
													});
											}}
										>{!submitButtonState ? <span>Enviar</span> : <span><div className="button-loader"></div></span>}
										</button>
									}
								</div>
							</div>
							:
							<Error />
				}

				{/*  CAMBIO: Modal “Agregar nuevo cliente” */}
				{showCustomerModal && (
					<div style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.35)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 9999
					}}>
						<div style={{ background: "#fff", borderRadius: 10, width: 520, maxWidth: "95%", padding: 20 }}>
							<h3 style={{ marginTop: 0 }}>Agregar nuevo cliente</h3>

							<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
								<input
									className="my_input"
									placeholder="Nombre "
									value={newCustomerName}
									onChange={(e) => setNewCustomerName(e.target.value)}
								/>

								<input
									className="my_input"
									placeholder="Correo"
									value={newCustomerEmail}
									onChange={(e) => setNewCustomerEmail(e.target.value)}
								/>

								<input
									className="my_input"
									placeholder="Dirección"
									value={newCustomerAddress}
									onChange={(e) => setNewCustomerAddress(e.target.value)}
								/>
								<input
									className="my_input"
									placeholder="Celular"
									value={newCustomerCelular}
									onChange={(e) => setNewCustomerCelular(e.target.value.replace(/[^\d]/g, ""))}
								/>

							</div>

							<div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 15 }}>
								<button className="btn default" type="button" onClick={() => setShowCustomerModal(false)}>
									Cancelar
								</button>

								<button className="btn success" type="button" disabled={savingCustomer} onClick={createCustomer}>
									{savingCustomer ? "Guardando..." : "Guardar"}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

export default OrderAddNew

import React, { useEffect, useState } from 'react'
import { Link } from "react-router-dom"
import Modal from 'react-bootstrap/Modal';
import './Customer.scss'
import Table from '../Table/Table'

import moment from 'moment'
import 'moment/locale/es';
import swal from 'sweetalert';
import Loader from '../PageStates/Loader';
import Error from '../PageStates/Error';

function Customer() {
	const [pageState, setPageState] = useState(1)
	const [permission, setPermission] = useState(null)

	const [customers, setCustomers] = useState([])
	const [customerCount, setCustomerCount] = useState(0)

	const [searchInput, setSearchInput] = useState("")
	const [sortColumn, setSortColumn] = useState("")
	const [sortOrder, setSortOrder] = useState("")
	const [tablePage, setTablePage] = useState(1)
	const [data, setData] = useState([])

	// Modal related state variables
	const [editModalShow, setEditModalShow] = useState(false)

	const [editCustomerId, setEditCustomerId] = useState(null)
	const [editName, setEditName] = useState('')
	const [editAddress, setEditAddress] = useState('')
	const [editEmail, setEditEmail] = useState('')

	const [editModalSubmitButton, setEditModalSubmitButton] = useState(false)

	useEffect(() => {
		moment.locale("es");

		fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/verifiy_token`, {
			method: 'POST',
			credentials: 'include'
		})
			.then(async (response) => {
				let body = await response.json()
				if (body.operation === 'success') {

					fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_permission`, {
						method: 'POST',
						credentials: 'include'
					})
						.then(async (response) => {
							let body = await response.json()

							let p = JSON.parse(body.info).find(x => x.page === 'customers')
							if (p.view !== true) {
								window.location.href = '/unauthorized';
							} else {
								setPermission(p)
							}
						})
						.catch((error) => {
							console.log(error)
						})
				} else {
					window.location.href = '/login'
				}
			})
			.catch((error) => {
				console.log(error)
			})
	}, [])


	const getCustomers = async (sv, sc, so, scv) => {
		let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_customers`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json; charset=UTF-8'
			},
			body: JSON.stringify({ start_value: sv, sort_column: sc, sort_order: so, search_value: scv }),
			credentials: 'include'
		})

		let body = await result.json()
		setCustomers(body.info.customers)
		setCustomerCount(body.info.count)
	}

	useEffect(() => {
		if (permission !== null) {
			let p1 = getCustomers((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
			Promise.all([p1])
				.then(() => {
					setPageState(2);
				})
				.catch((err) => {
					console.log(err)
					setPageState(3)
				})
		}
	}, [permission])

	useEffect(() => {
		if (permission !== null)
			getCustomers((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
	}, [tablePage, sortColumn, sortOrder, searchInput])



	const deleteCustomer = async (id) => {
		let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/delete_customer`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json; charset=UTF-8'
			},
			body: JSON.stringify({ customer_id: id }),
			credentials: 'include'
		})

		let body = await result.json()
		if (body.operation === 'success') {
			getCustomers((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
			swal('Éxito', body.message, 'success')
		} else {
			swal('Oops!', 'Algo salió mal', 'error')
		}
	}

	useEffect(() => {
		if (customers.length !== 0) {
			let tArray = customers.map((obj, i) => {
				let tObj = {}
				tObj.sl = i + 1;
				tObj.name = obj.name;
				tObj.address = obj.address;
				tObj.email = obj.email;
				tObj.addedon = moment(obj.timeStamp).format('MMMM Do, YYYY');
				tObj.action =
					<>
						<button className='btn warning' style={{ marginRight: '0.5rem' }} onClick={() => { editModalInit(obj.customer_id) }}>
							Ver/Editar
						</button>
						{
							permission.delete &&
							<button className='btn danger' style={{ marginLeft: '0.5rem' }}
								onClick={() => {
									swal({
										title: "¿Estás seguro?",
										text: "Una vez eliminado, no podrás recuperar este registro.",
										icon: "warning",
										buttons: true,
										dangerMode: true,
									})
										.then((willDelete) => {
											if (willDelete) {
												deleteCustomer(obj.customer_id)
											}
										});
								}}
							>
								Eliminar
							</button>
						}
					</>
				return tObj;
			})
			setData(tArray)
		}
	}, [customers])

	const editModalInit = (id) => {
		let p = customers.find(x => x.customer_id === id)
		setEditCustomerId(p.customer_id)

		setEditName(p.name)
		setEditEmail(p.email)
		setEditAddress(p.address)

		setEditModalShow(true);
	}

	const updateCustomer = async () => {
		if (editName === "") {
			swal("Oops!", "El nombre no puede estar vacío", "error")
			return;
		}

		if (editEmail === "") {
			swal("Oops!", "El email no puede estar vacío", "error")
			return;
		}

		let regex = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-z]+)$/;
		if (!regex.test(editEmail)) {
			swal("Oops!", "Por favor ingresa un email válido", "error")
			return;
		}

		let obj = {}
		obj.customer_id = editCustomerId
		obj.name = editName;
		obj.address = editAddress;
		obj.email = editEmail;

		setEditModalSubmitButton(true);

		let response = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/update_customer`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json; charset=UTF-8'
			},
			body: JSON.stringify(obj),
			credentials: 'include'
		})
		let body = await response.json()

		setEditModalSubmitButton(false)

		if (body.operation === 'success') {
			console.log('Cliente actualizado correctamente')
			swal("¡Éxito!", "Cliente actualizado correctamente", "success")
			handleEditModalClose()
			getCustomers((tablePage - 1) * 10, sortColumn, sortOrder, searchInput)
		} else {
			swal("Oops!", body.message, "error")
		}
	}

	const handleEditModalClose = () => {
		setEditModalShow(false);

		setEditCustomerId(null)
		setEditName('')
		setEditAddress("")
		setEditEmail('')
	}

	return (
		<div className='customers'>
			<div style={{ overflow: "scroll", height: "100%" }} >
				<div className='customer-header'>
					<div className='title'>Clientes</div>
					<Link to={"/customers/addnew"} className='btn success' style={{ margin: "0 0.5rem", textDecoration: "none" }}>
						Agregar nuevo
					</Link>
				</div>

				{
					pageState === 1 ?
						<Loader />
						: pageState === 2 ?
							<div className="card">
								<div className="container">
									<Table
										headers={['N°', 'Nombre', 'Dirección', 'Email', 'Registrado el', 'Acción']}
										columnOriginalNames={["name", "address", "email", "timeStamp"]}
										sortColumn={sortColumn}
										setSortColumn={setSortColumn}
										sortOrder={sortOrder}
										setSortOrder={setSortOrder}
										data={data}
										data_count={customerCount}
										searchInput={searchInput}
										setSearchInput={setSearchInput}
										custom_styles={["3rem", "5rem", "8rem", "5rem", "8rem", "10rem"]}
										current_page={tablePage}
										tablePageChangeFunc={setTablePage}
									/>
								</div>
							</div>
							:
							<Error />
				}

				<Modal show={editModalShow} onHide={() => { handleEditModalClose() }} size="l" centered >
					<Modal.Header closeButton>
						<Modal.Title className='fs-4 fw-bold' style={{ color: "#2cd498" }}>
							Ver / Editar Cliente
						</Modal.Title>
					</Modal.Header>
					<Modal.Body style={{ backgroundColor: "#fafafa" }} >
						<div className='container d-flex gap-2'>
							<div className='card my_card' style={{ flex: 1 }}>
								<div className='card-body'>
									<div className='form-group mb-2'>
										<label className='fst-italic fw-bold'>Nombre</label>
										<input className='my_form_control' type='text' value={editName} onChange={(e) => { setEditName(e.target.value) }} />
									</div>
									<div className='form-group mb-2'>
										<label className='fst-italic fw-bold'>Dirección</label>
										<input className='my_form_control' type='text' value={editAddress} onChange={(e) => { setEditAddress(e.target.value) }} />
									</div>
									<div className='form-group mb-2'>
										<label className='fst-italic fw-bold'>Email</label>
										<input className='my_form_control' type='text' value={editEmail} onChange={(e) => { setEditEmail(e.target.value) }} />
									</div>
								</div>
							</div>
						</div>
					</Modal.Body>
					<Modal.Footer>
						<button className='btn btn-outline-danger' style={{ transition: "color 0.4s, background-color 0.4s" }} onClick={() => { handleEditModalClose() }}>
							Cancelar
						</button>
						<button
							className='btn btn-outline-success'
							disabled={editModalSubmitButton}
							style={{ transition: "color 0.4s, background-color 0.4s" }}
							onClick={() => {
								swal({
									title: "¿Estás seguro?",
									icon: "warning",
									buttons: true,
									dangerMode: true,
								})
									.then((willUpdate) => {
										if (willUpdate) {
											updateCustomer()
										}
									});
							}}
						>
							Actualizar
						</button>
					</Modal.Footer>
				</Modal>
			</div>
		</div>
	)
}

export default Customer

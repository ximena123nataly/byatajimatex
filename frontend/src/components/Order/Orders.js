import React, { useEffect, useState } from 'react'
import { Link } from "react-router-dom"
import { Modal, OverlayTrigger, Popover } from 'react-bootstrap';
import './Orders.scss'
import Table from '../Table/Table'

import moment from 'moment'
import 'moment/locale/es';
import swal from 'sweetalert';
import Loader from '../PageStates/Loader';
import Error from '../PageStates/Error';

function Orders() {
	const [pageState, setPageState] = useState(1)
	const [permission, setPermission] = useState(null)

	const [orders, setOrders] = useState([])
	const [orderCount, setOrderCount] = useState(0)

	const [searchInput, setSearchInput] = useState("")
	const [sortColumn, setSortColumn] = useState("")
	const [sortOrder, setSortOrder] = useState("")
	const [tablePage, setTablePage] = useState(1)
	const [data, setData] = useState([])

	// Modal
	const [viewModalShow, setViewModalShow] = useState(false)
	const [viewOrderDetails, setViewOrderDetails] = useState(null)
	const [productDetails, setProductDetails] = useState([])

	useEffect(() => {
			moment.locale("es");
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
						const p = body.permissions?.find(x => x.page === 'orders');
			
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

	const getOrders = async (sv, sc, so, scv) => {
		let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_orders`, {
			method: 'POST',
			headers: { 'Content-type': 'application/json; charset=UTF-8' },
			body: JSON.stringify({ start_value: sv, sort_column: sc, sort_order: so, search_value: scv }),
			credentials: 'include'
		})

		let body = await result.json()
		setOrders(body.info.orders)
		setOrderCount(body.info.count)
	}

	const getProductsDetailsById = async (value) => {
		let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_products_details_by_id`, {
			method: 'POST',
			headers: { 'Content-type': 'application/json; charset=UTF-8' },
			body: JSON.stringify({ product_id_list: value }),
			credentials: 'include'
		})

		let body = await result.json()
		setProductDetails(body.info.products);
	}

	useEffect(() => {
		if (permission !== null) {
			getOrders((tablePage - 1) * 10, sortColumn, sortOrder, searchInput)
				.then(() => setPageState(2))
				.catch(() => setPageState(3))
		}
	}, [permission])

	useEffect(() => {
		if (permission !== null)
			getOrders((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
	}, [tablePage, sortColumn, sortOrder, searchInput])

	const deleteOrder = async (id) => {
		let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/delete_order`, {
			method: 'POST',
			headers: { 'Content-type': 'application/json; charset=UTF-8' },
			body: JSON.stringify({ order_id: id }),
			credentials: 'include'
		})

		let body = await result.json()
		if (body.operation === 'success') {
			getOrders((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
			swal('Éxito', body.message, 'success')
		} else {
			swal('Oops!', 'Algo salió mal', 'error')
		}
	}

	useEffect(() => {
		if (orders.length !== 0) {
			let tArray = orders.map((obj, i) => {
				let tObj = {}
				tObj.sl = i + 1;
				tObj.order_ref = obj.order_ref;
				tObj.customer_name = obj.customer_name;
				tObj.due_date = moment(obj.due_date).format('D [de] MMMM, YYYY');
				tObj.grand_total = obj.grand_total;
				tObj.addedon = moment(obj.timeStamp).format('D [de] MMMM, YYYY');
				tObj.action =
					<>
						<button className='btn warning' style={{ marginRight: '0.5rem' }} onClick={() => { viewModalInit(obj.order_id) }}>
							Ver
						</button>
						{
							permission.delete &&
							<button className='btn danger' style={{ marginLeft: '0.5rem' }}
								onClick={() => {
									swal({
										title: "¿Estás seguro?",
										text: "Una vez eliminado, no podrás recuperar este pedido.",
										icon: "warning",
										buttons: true,
										dangerMode: true,
									})
										.then((willDelete) => {
											if (willDelete) deleteOrder(obj.order_id)
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
	}, [orders])

	const viewModalInit = (id) => {
		let p = orders.find(x => x.order_id === id)
		setViewOrderDetails(p)
		setViewModalShow(true);

		getProductsDetailsById(JSON.parse(p.items).map(x => x.product_id))
	}

	const handleViewModalClose = () => {
		setViewModalShow(false);
		setViewOrderDetails(null)
		setProductDetails([])
	}

	return (
		<div className='orders'>
			<div style={{ overflow: "scroll", height: "100%" }} >
				<div className='order-header'>
					<div className='title'>Pedidos</div>
					<Link to={"/orders/addnew"} className='btn success' style={{ margin: "0 0.5rem", textDecoration: "none" }}>
						Agregar nuevo
					</Link>
				</div>

				{
					pageState === 1 ? <Loader /> :
						pageState === 2 ?
							<div className="card">
								<div className="container">
									<Table
										headers={['N°', 'Ref. Pedido', 'Cliente', 'Vence', 'Total', 'Fecha', 'Acción']}
										columnOriginalNames={["order_ref", "customer_name", "due_date", "grand_total", "timeStamp"]}
										sortColumn={sortColumn}
										setSortColumn={setSortColumn}
										sortOrder={sortOrder}
										setSortOrder={setSortOrder}
										data={data}
										data_count={orderCount}
										searchInput={searchInput}
										setSearchInput={setSearchInput}
										custom_styles={["3rem", "6rem", "6rem", "8rem", "5rem", "8rem", "10rem"]}
										current_page={tablePage}
										tablePageChangeFunc={setTablePage}
									/>
								</div>
							</div>
							:
							<Error />
				}

				<Modal show={viewModalShow} onHide={handleViewModalClose} size="lg" centered >
					<Modal.Header closeButton>
						<Modal.Title className='fs-4 fw-bold' style={{ color: "#2cd498" }}>
							Ver pedido
						</Modal.Title>
					</Modal.Header>
					<Modal.Body style={{ backgroundColor: "#fafafa" }} >
						<div className='container d-flex gap-2'>
							<div className='card my_card' style={{ flex: 1 }}>
								<div className='card-body'>
									{
										viewOrderDetails &&
										<>
											<div className='form-group mb-2'>
												<label className='fw-bold'>Referencia</label>
												<input className='my_form_control' value={viewOrderDetails.order_ref} readOnly />
											</div>
											<div className='form-group mb-2'>
												<label className='fw-bold'>Cliente</label>
												<input className='my_form_control' value={viewOrderDetails.customer_name} readOnly />
											</div>
											<div className='form-group mb-2'>
												<label className='fw-bold'>Fecha de vencimiento</label>
												<input className='my_form_control' value={moment(viewOrderDetails.due_date).format('D [de] MMMM, YYYY')} readOnly />
											</div>
											<div className='form-group mb-2'>
												<label className='fw-bold'>Impuesto</label>
												<input className='my_form_control' value={`${viewOrderDetails.tax}%`} readOnly />
											</div>
											<div className='form-group mb-2'>
												<label className='fw-bold'>Total</label>
												<input className='my_form_control' value={viewOrderDetails.grand_total} readOnly />
											</div>

											<div className='form-group mb-2'>
												<label className='fw-bold mb-2'>Detalle de productos</label>
												<div className='p-2 border rounded'>
													{
														productDetails.length > 0 &&
														JSON.parse(viewOrderDetails.items).map((viewItem, ind) => {
															let img = productDetails.find(x => x.product_id === viewItem.product_id)?.image
															return (
																<div key={ind} className='py-2 row gx-0'>
																	<div className='col-4'>{viewItem.product_name}</div>
																	<div className='col-2 text-center'>{viewItem.quantity}</div>
																	<div className='col-2 text-center'>{viewItem.rate}</div>
																	<div className='col-2 text-center'>{viewItem.rate * viewItem.quantity}</div>
																</div>
															)
														})
													}
												</div>
											</div>
										</>
									}
								</div>
							</div>
						</div>
					</Modal.Body>
					<Modal.Footer>
						<button className='btn btn-outline-danger' onClick={handleViewModalClose}>
							Cerrar
						</button>
					</Modal.Footer>
				</Modal>
			</div>
		</div>
	)
}

export default Orders

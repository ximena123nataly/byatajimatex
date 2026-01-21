import React, { useEffect, useState } from 'react'
import './SupplierAddNew.scss'

import swal from 'sweetalert';
import Error from '../PageStates/Error';
import Loader from '../PageStates/Loader';

function SupplierAddNew() {
	const [pageState, setPageState] = useState(1)
	const [permission, setPermission] = useState(null)

	const [name, setName] = useState('')
	const [address, setAddress] = useState('')
	const [email, setEmail] = useState('')

	const [submitButtonState, setSubmitButtonState] = useState(false)

	useEffect(() => {

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

							let p = JSON.parse(body.info).find(x => x.page === 'suppliers')
							if (p.view && p.create) {
								setPermission(p)
							} else {
								window.location.href = '/unauthorized';
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

	useEffect(() => {
		if (permission !== null) {
			setPageState(2);
		}
	}, [permission])

	const insertSupplier = async () => {
		if (name === "") {
			swal("Error", "El nombre no puede estar vacío", "error")
			return;
		}

		if (address === "") {
			swal("Error", "La dirección no puede estar vacía", "error")
			return;
		}

		if (email === "") {
			swal("Error", "El correo no puede estar vacío", "error")
			return;
		}

		let regex = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-z]+)$/;
		if (!regex.test(email)) {
			swal("Error", "Por favor ingrese un correo válido", "error")
			return;
		}

		let obj = {
			name,
			address,
			email
		}

		setSubmitButtonState(true)

		let response = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/add_supplier`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json; charset=UTF-8'
			},
			body: JSON.stringify(obj),
			credentials: 'include'
		})

		let body = await response.json()
		setSubmitButtonState(false)

		if (body.operation === 'success') {
			swal("Éxito", "Proveedor agregado correctamente", "success")

			setName('')
			setAddress('')
			setEmail('')
		} else {
			swal("Error", body.message, "error")
		}
	}

	return (
		<div className='supplieraddnew'>
			<div className='supplier-header'>
				<div className='title'>Agregar nuevo proveedor</div>
			</div>

			{
				pageState === 1 ?
					<Loader />
					: pageState === 2 ?
						<div className="card">
							<div className="container" style={{ display: "flex", flexDirection: "column" }}>

								<div style={{ display: "flex", justifyContent: "space-evenly" }}>
									<div className="right">
										<div className="row" style={{ display: 'flex', marginTop: "0.5rem" }}>
											<div className='col'>
												<label className='fw-bold'>Nombre</label>
												<input
													className='my_input'
													type='text'
													value={name}
													onChange={(e) => setName(e.target.value)}
												/>
											</div>

											<div className='col'>
												<label className='fw-bold'>Correo electrónico</label>
												<input
													className='my_input'
													type='email'
													value={email}
													onChange={(e) => setEmail(e.target.value)}
												/>
											</div>
										</div>

										<div className="row" style={{ display: 'flex', marginTop: "0.5rem" }}>
											<div className='col'>
												<label className='fw-bold'>Dirección</label>
												<input
													className='my_input'
													type='text'
													value={address}
													onChange={(e) => setAddress(e.target.value)}
												/>
											</div>
										</div>
									</div>
								</div>

								{
									permission.create &&
									<button
										className='btn success'
										style={{ alignSelf: "center", marginTop: "1rem" }}
										disabled={submitButtonState}
										onClick={insertSupplier}
									>
										{!submitButtonState
											? <span>Guardar</span>
											: <span><div className="button-loader"></div></span>
										}
									</button>
								}
							</div>
						</div>
						:
						<Error />
			}
		</div>
	)
}

export default SupplierAddNew

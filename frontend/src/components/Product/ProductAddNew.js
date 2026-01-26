import React, { useEffect, useState, useRef } from 'react'
import './ProductAddNew.scss'

import swal from 'sweetalert';
import DeleteOutline from '@mui/icons-material/DeleteOutline';

import Error from '../PageStates/Error';
import Loader from '../PageStates/Loader';

function ProductAddNew() {
	const [pageState, setPageState] = useState(1)
	const [permission, setPermission] = useState(null)

	const [name, setName] = useState('')
	const [gender, setGender] = useState("male")
	const [size, setSize] = useState('')
	const [material, setMaterial] = useState('')
	const [category, setCategory] = useState('')
	const [description, setDescription] = useState('')
	const [stock, setStock] = useState('0')
	const [image, setImage] = useState(null)
	const [sellingPrice, setSellingPrice] = useState('0')
	const [purchasePrice, setPurchasePrice] = useState('0')

	const [submitButtonState, setSubmitButtonState] = useState(false)

	const fileInputRef = useRef(null)
	const [imageData, setImageData] = useState(null)

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
					const p = body.permissions?.find(x => x.page === 'products');
		
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

	useEffect(() => {
		if (permission !== null) {
			setPageState(2);
		}
	}, [permission])

	useEffect(() => {
		if (image) {
			let f = new FileReader()
			f.onload = (e) => {
				setImageData(e.target.result)
			}
			f.readAsDataURL(image)
		} else {
			setImageData(null)
		}
	}, [image])

	const insertProduct = async () => {
		if (name === "") {
			swal("¡Ups!", "El nombre no puede estar vacío", "error")
			return;
		}
		if ((sellingPrice === "") || (parseFloat(sellingPrice) <= 0)) {
			swal("¡Ups!", "El precio de venta no puede estar vacío", "error")
			return;
		}
		if ((purchasePrice === "") || (parseFloat(purchasePrice) <= 0)) {
			swal("¡Ups!", "El precio de compra no puede estar vacío", "error")
			return;
		}
		if ((stock < 0) || (parseInt(stock) < 0)) {
			swal("¡Ups!", "El stock no puede ser negativo", "error")
			return;
		}

		let f = new FormData();
		f.append('name', name)
		f.append('gender', gender)
		f.append('size', size)
		f.append('material', material)
		f.append('category', category)
		f.append('description', description)
		f.append('product_stock', parseInt(stock))
		f.append('image', image)
		f.append('selling_price', parseFloat(sellingPrice))
		f.append('purchase_price', parseFloat(purchasePrice))

		setSubmitButtonState(true)

		let response = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/add_product`, {
			method: 'POST',
			body: f,
			credentials: 'include'
		})
		let body = await response.json()

		setSubmitButtonState(false)

		if (body.operation === 'success') {
			swal("¡Éxito!", "Producto creado correctamente", "success")

			setName('')
			setGender("male")
			setSize('')
			setMaterial('')
			setCategory('')
			setDescription('')
			setStock('0')
			setImage(null)
			setSellingPrice('0')
			setPurchasePrice('0')
			setImageData(null)
		} else {
			swal("¡Ups!", body.message, "error")
		}
	}

	return (
		<div className='productaddnew'>
			<div className='product-header'>
				<div className='title'>Agregar nuevo producto</div>
			</div>

			{
				pageState === 1 ?
					<Loader />
					: pageState === 2 ?
						<div className="card">
							<div className="container">

								<div style={{ display: "flex", gap: "1rem" }}>
									<div className="left">
										<img
											src={!imageData ? '/images/default_image.jpg' : imageData}
											alt="producto"
											style={{ borderRadius: "2rem", width: "45%", padding: "5%", border: "1px #89c878 solid" }}
										/>

										<div>
											<button className='btn my_btn mx-1 border-0' onClick={() => { fileInputRef.current.click() }} >
												<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 528.899 528.899">
													<g><path d="M328.883,89.125l107.59,107.589l-272.34,272.34L56.604,361.465L328.883,89.125z M518.113,63.177l-47.981-47.981c-18.543-18.543-48.653-18.543-67.259,0l-45.961,45.961l107.59,107.59l53.611-53.611C532.495,100.753,532.495,77.559,518.113,63.177z M0.3,512.69c-1.958,8.812,5.998,16.708,14.811,14.565l119.891-29.069L27.473,390.597L0.3,512.69z" /></g>
												</svg>
											</button>

											<input
												ref={fileInputRef}
												type="file"
												style={{ display: 'none' }}
												onChange={(e) => {
													if (e.target.files[0].type === "image/jpeg" || e.target.files[0].type === "image/png") {
														setImage(e.target.files[0])
													} else {
														swal("¡Ups!", "Tipo de archivo no compatible. Usa .jpg, .jpeg o .png", "warning")
													}
												}}
											/>

											{image !== null &&
												<button className='btn my_btn mx-1 border-0' onClick={() => { setImage(null) }}>
													<DeleteOutline />
												</button>
											}
										</div>
									</div>

									<div className="right">
										<div className="row" style={{ display: 'flex', marginTop: "0.5rem" }}>
											<div className='col'>
												<label className='fw-bold'>Nombre</label>
												<input className='my_input' type='text' value={name} onChange={(e) => { setName(e.target.value) }} />
											</div>
											<div className='col'>
												<label className='fw-bold'>Género</label>
												<div className='d-flex gap-2'>
													<div className="rounded-pill px-2 py-1" style={{ cursor: "pointer", backgroundColor: gender === "male" ? "#a6eda6" : "" }} onClick={() => { setGender("male") }} >Masculino</div>
													<div className="rounded-pill px-2 py-1" style={{ cursor: "pointer", backgroundColor: gender === "female" ? "#a6eda6" : "" }} onClick={() => { setGender("female") }} >Femenino</div>
													<div className="rounded-pill px-2 py-1" style={{ cursor: "pointer", backgroundColor: gender === "others" ? "#a6eda6" : "" }} onClick={() => { setGender("others") }} >Otro</div>
												</div>
											</div>
										</div>

										<div className="row" style={{ display: 'flex', marginTop: "0.5rem" }}>
											<div className='col'>
												<label className='fw-bold'>Tamaño</label>
												<input className='my_input' type='text' value={size} onChange={(e) => { setSize(e.target.value) }} />
											</div>
											<div className='col'>
												<label className='fw-bold'>Material</label>
												<input className='my_input' type='text' value={material} onChange={(e) => { setMaterial(e.target.value) }} />
											</div>
										</div>

										<div className="row" style={{ display: 'flex', marginTop: "0.5rem" }}>
											<div className='col'>
												<label className='fw-bold'>Categoría</label>
												<input className='my_input' type='text' value={category} onChange={(e) => { setCategory(e.target.value) }} />
											</div>
											<div className='col'>
												<label className='fw-bold'>Descripción</label>
												<input className='my_input' type='text' value={description} onChange={(e) => { setDescription(e.target.value) }} />
											</div>
										</div>

										<div className="row" style={{ display: 'flex', marginTop: "0.5rem" }}>
											<div className='col'>
												<label className='fw-bold'>Precio de venta</label>
												<input className='my_input' type='number' value={sellingPrice} onChange={(e) => { setSellingPrice(e.target.value) }} />
											</div>
											<div className='col'>
												<label className='fw-bold'>Precio de compra</label>
												<input className='my_input' type='number' value={purchasePrice} onChange={(e) => { setPurchasePrice(e.target.value) }} />
											</div>
										</div>

										<div className="row" style={{ display: 'flex', marginTop: "0.5rem" }}>
											<div className='col'>
												<label className='fw-bold'>Stock</label>
												<input className='my_input' type='number' value={stock} onChange={(e) => { setStock(e.target.value) }} />
											</div>
										</div>
									</div>
								</div>

								{
									permission.create &&
									<div className='d-flex justify-content-center'>
										<button
											className='btn success'
											style={{ alignSelf: "center", marginTop: "1rem" }}
											disabled={submitButtonState}
											onClick={() => { insertProduct() }}
										>
											{!submitButtonState ? <span>Guardar</span> : <span><div className="button-loader"></div></span>}
										</button>
									</div>
								}
							</div>
						</div>
						:
						<Error />
			}
		</div>
	)
}

export default ProductAddNew

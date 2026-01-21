import React, { useEffect, useRef, useState } from 'react'
import './Profile.scss'
import swal from 'sweetalert';
import CryptoJS from 'crypto-js';

import DriveFolderUploadOutlinedIcon from "@mui/icons-material/DriveFolderUploadOutlined";
import DeleteOutline from '@mui/icons-material/DeleteOutline';

import Loader from '../PageStates/Loader';
import Error from '../PageStates/Error';

function Profile() {
	const [pageState, setPageState] = useState(1)
	const [permission, setPermission] = useState(null)

	const [profileData, setProfileData] = useState(null)
	const [editMode, setEditMode] = useState(false)

	const [name, setName] = useState('')
	const [address, setAddress] = useState('')
	const [profileImage, setProfileImage] = useState("")
	const [imageEdited, setImageEdited] = useState(false)
	const [file, setFile] = useState(null)
	const fileInputRef = useRef(null)
	const [submitButtonState, setSubmitButtonState] = useState(false)

	const [oldPassword, setOldPassword] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [submitButtonState2, setSubmitButtonState2] = useState(false)

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

							let p = JSON.parse(body.info).find(x => x.page === 'profile')
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


	const getProfile = async () => {
		let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_profile`, {
			method: 'POST',
			credentials: 'include'
		})

		let body = await result.json()
		setProfileData(body.info.profile[0])
	}

	useEffect(() => {
		if (permission !== null) {
			let p1 = getProfile();
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
		if ((profileData) && (!editMode)) {
			setName(profileData.user_name)
			setAddress(profileData.address)
			setProfileImage(profileData.image)
		}
	}, [profileData, editMode])

	const updateProfile = async () => {
		if (name === "") {
			swal("¡Ups!", "El nombre no puede estar vacío", "error")
			return;
		}

		let f = new FormData();
		f.append('name', name)
		f.append('address', address)
		f.append('file', file)
		f.append('image_edited', imageEdited)

		setSubmitButtonState(true)

		let response = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/update_profile`, {
			method: 'POST',
			body: f,
			credentials: 'include'
		})
		let body = await response.json()

		setSubmitButtonState(false)

		if (body.operation === 'success') {
			swal("¡Éxito!", "Perfil actualizado correctamente", "success")
				.then(() => { window.location.reload() })
		} else {
			swal("¡Ups!", body.message, "error")
		}
	}

	const updateProfilePassword = async () => {
		if (oldPassword === "") {
			swal("¡Ups!", "La contraseña anterior no puede estar vacía", "error")
			return;
		}
		if (newPassword === "") {
			swal("¡Ups!", "La nueva contraseña no puede estar vacía", "error")
			return;
		}
		if (confirmPassword !== newPassword) {
			swal("¡Ups!", "La confirmación no puede ser diferente", "error")
			return;
		}

		let obj = {}
		obj.old_password = CryptoJS.AES.encrypt(oldPassword, process.env.REACT_APP_CRYPTOJS_SEED).toString()
		obj.new_password = CryptoJS.AES.encrypt(newPassword, process.env.REACT_APP_CRYPTOJS_SEED).toString();
		setSubmitButtonState2(true)

		let response = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/update_profile_password`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json; charset=UTF-8'
			},
			body: JSON.stringify(obj),
			credentials: 'include'
		})
		let body = await response.json()

		setSubmitButtonState2(false)

		if (body.operation === 'success') {
			swal("¡Éxito!", "Contraseña actualizada correctamente", "success")

			setOldPassword('')
			setNewPassword('')
			setConfirmPassword('')
		}
		else {
			swal("¡Ups!", body.message, "error")
		}
	}

	return (
		<div className='profile'>
			{
				pageState === 1 ?
					<Loader />
					: pageState === 2 ?
						<>
							<div className="bottom">
								<div className="left">
									<img
										src={
											(editMode && file)
												? URL.createObjectURL(file)
												: (profileImage !== null
													? `${process.env.REACT_APP_BACKEND_ORIGIN}/profile_images/${profileImage}`
													: "https://icon-library.com/images/no-image-icon/no-image-icon-0.jpg")
										}
										alt=""
									/>

									{
										editMode && !profileImage &&
										<>
											<DriveFolderUploadOutlinedIcon
												className='utilityButtonSuccess'
												onClick={() => { fileInputRef.current.click() }}
											/>
											<input
												ref={fileInputRef}
												type="file"
												style={{ display: 'none' }}
												onChange={(e) => {
													if (e.target.files[0].type === "image/jpeg" || e.target.files[0].type === "image/png") {
														setImageEdited(true)
														setFile(e.target.files[0])
													}
													else {
														swal("¡Ups!", "Tipo de archivo no compatible. Sube .jpg, .jpeg o .png", "warning")
													}
												}}
											/>
										</>
									}

									{
										editMode && profileImage &&
										<>
											<DeleteOutline
												className='utilityButtonDanger'
												onClick={() => { setImageEdited(true); setProfileImage(null) }}
											/>
										</>
									}
								</div>

								<div className="right">

									<div style={{ display: "flex", margin: "0.5rem 0" }}>
										<div className="formInput">
											<label>Nombre</label>
											<input
												type='text'
												value={name}
												onChange={(e) => { setName(e.target.value) }}
												placeholder="Nombre"
												readOnly={!editMode}
											/>
										</div>
									</div>

									<div style={{ display: "flex", margin: "0.5rem 0" }}>
										<div className="formInput">
											<label>Dirección</label>
											<textarea
												rows={3}
												style={{ resize: "none" }}
												value={address}
												onChange={(e) => { setAddress(e.target.value) }}
												placeholder="Dirección"
												readOnly={!editMode}
											></textarea>
										</div>
									</div>

									{
										!editMode ?
											<button style={{ margin: "0 2rem" }} onClick={() => { setEditMode(true) }}>
												Editar
											</button>
											:
											<div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
												<button style={{ margin: "0 2rem" }} onClick={() => { setEditMode(false); setFile(null); }}>
													Volver
												</button>

												{
													submitButtonState ?
														<button
															disabled
															style={{
																margin: "0",
																display: "flex",
																alignItems: "center",
																justifyContent: "space-between",
																paddingTop: "7px",
																paddingBottom: "7px",
																cursor: "not-allowed",
																opacity: "0.7"
															}}
														>
															<svg width="25px" height="25px" viewBox="0 0 100 100">
																<g transform="translate(50 50)">
																	<g transform="translate(-19 -19) scale(0.6)">
																		<g>
																			<animateTransform attributeName="transform" type="rotate" values="0;36" keyTimes="0;1" dur="0.2s" begin="0s" repeatCount="indefinite"></animateTransform>
																			<path d="M28.625011367592503 20.13972999335393 L37.81739952301762 29.33211814877905 L29.33211814877905 37.81739952301762 L20.13972999335393 28.625011367592503 A35 35 0 0 1 11.320284385312565 33.11874335532145 L11.320284385312565 33.11874335532145 L13.353932430835567 45.95869178305824 L1.5016723436939086 47.835905363541 L-0.5319757018290933 34.995956935804216 A35 35 0 0 1 -10.308406469842062 33.44752242024091 L-10.308406469842062 33.44752242024091 L-16.21028296645617 45.03060723468969 L-26.902361256716592 39.58272123781513 L-21.000484760102484 27.999636423366347 A35 35 0 0 1 -27.99963642336634 21.000484760102488 L-27.99963642336634 21.000484760102488 L-39.58272123781512 26.902361256716596 L-45.03060723468969 16.21028296645618 L-33.44752242024091 10.30840646984207 A35 35 0 0 1 -34.995956935804216 0.5319757018290997 L-34.995956935804216 0.5319757018290997 L-47.83590536354101 -1.5016723436938997 L-45.95869178305824 -13.353932430835558 L-33.11874335532145 -11.320284385312558 A35 35 0 0 1 -28.62501136759251 -20.139729993353924 L-28.62501136759251 -20.139729993353924 L-37.81739952301763 -29.332118148779042 L-29.332118148779053 -37.81739952301762 L-20.13972999335393 -28.625011367592503 A35 35 0 0 1 -11.32028438531257 -33.11874335532145 L-11.32028438531257 -33.11874335532145 L-13.353932430835574 -45.95869178305824 L-1.5016723436939146 -47.835905363541 L0.5319757018290889 -34.995956935804216 A35 35 0 0 1 10.308406469842058 -33.44752242024091 L10.308406469842058 -33.44752242024091 L16.210282966456163 -45.03060723468969 L26.90236125671659 -39.58272123781513 L21.00048476010248 -27.999636423366347 A35 35 0 0 1 27.99963642336634 -21.00048476010249 L27.99963642336634 -21.00048476010249 L39.58272123781512 -26.902361256716603 L45.03060723468969 -16.210282966456184 L33.44752242024091 -10.308406469842074 A35 35 0 0 1 34.995956935804216 -0.5319757018291039 L34.995956935804216 -0.5319757018291039 L47.83590536354101 1.5016723436938944 L45.95869178305824 13.353932430835552 L33.11874335532145 11.320284385312554 A35 35 0 0 1 28.62501136759251 20.13972999335392 M0 -25A25 25 0 1 0 0 25 A25 25 0 1 0 0 -25" fill="#e6e6e6"></path>
																		</g>
																	</g>
																</g>
															</svg>
															<div style={{ flexGrow: "1" }}>Procesando...</div>
														</button> :
														<button style={{ margin: "0" }} onClick={() => { updateProfile() }}>
															Actualizar
														</button>
												}
											</div>
									}
								</div>
							</div>

							<div className="bottom" style={{ flexDirection: "column" }}>
								<div className='right'>
									<div className='passContainer'>
										<div className="formInput">
											<label>Contraseña anterior</label>
											<input
												type='password'
												value={oldPassword}
												onChange={(e) => { setOldPassword(e.target.value) }}
												placeholder="Contraseña anterior"
											/>
										</div>
										<div className="formInput">
											<label>Nueva contraseña</label>
											<input
												type='password'
												value={newPassword}
												onChange={(e) => { setNewPassword(e.target.value) }}
												placeholder="Nueva contraseña"
											/>
										</div>
										<div className="formInput">
											<label>Confirmar contraseña</label>
											<input
												type='password'
												value={confirmPassword}
												onChange={(e) => { setConfirmPassword(e.target.value) }}
												placeholder="Confirmar contraseña"
											/>
										</div>
									</div>

									{
										submitButtonState2 ?
											<button
												disabled
												style={{
													margin: "auto",
													display: "flex",
													alignItems: "center",
													justifyContent: "space-between",
													paddingTop: "7px",
													paddingBottom: "7px",
													cursor: "not-allowed",
													opacity: "0.7"
												}}
											>
												<svg width="25px" height="25px" viewBox="0 0 100 100">
													<g transform="translate(50 50)">
														<g transform="translate(-19 -19) scale(0.6)">
															<g>
																<animateTransform attributeName="transform" type="rotate" values="0;36" keyTimes="0;1" dur="0.2s" begin="0s" repeatCount="indefinite"></animateTransform>
																<path d="M28.625011367592503 20.13972999335393 L37.81739952301762 29.33211814877905 L29.33211814877905 37.81739952301762 L20.13972999335393 28.625011367592503 A35 35 0 0 1 11.320284385312565 33.11874335532145 L11.320284385312565 33.11874335532145 L13.353932430835567 45.95869178305824 L1.5016723436939086 47.835905363541 L-0.5319757018290933 34.995956935804216 A35 35 0 0 1 -10.308406469842062 33.44752242024091 L-10.308406469842062 33.44752242024091 L-16.21028296645617 45.03060723468969 L-26.902361256716592 39.58272123781513 L-21.000484760102484 27.999636423366347 A35 35 0 0 1 -27.99963642336634 21.000484760102488 L-27.99963642336634 21.000484760102488 L-39.58272123781512 26.902361256716596 L-45.03060723468969 16.21028296645618 L-33.44752242024091 10.30840646984207 A35 35 0 0 1 -34.995956935804216 0.5319757018290997 L-34.995956935804216 0.5319757018290997 L-47.83590536354101 -1.5016723436938997 L-45.95869178305824 -13.353932430835558 L-33.11874335532145 -11.320284385312558 A35 35 0 0 1 -28.62501136759251 -20.139729993353924 L-28.62501136759251 -20.139729993353924 L-37.81739952301763 -29.332118148779042 L-29.332118148779053 -37.81739952301762 L-20.13972999335393 -28.625011367592503 A35 35 0 0 1 -11.32028438531257 -33.11874335532145 L-11.32028438531257 -33.11874335532145 L-13.353932430835574 -45.95869178305824 L-1.5016723436939146 -47.835905363541 L0.5319757018290889 -34.995956935804216 A35 35 0 0 1 10.308406469842058 -33.44752242024091 L10.308406469842058 -33.44752242024091 L16.210282966456163 -45.03060723468969 L26.90236125671659 -39.58272123781513 L21.00048476010248 -27.999636423366347 A35 35 0 0 1 27.99963642336634 -21.00048476010249 L27.99963642336634 -21.00048476010249 L39.58272123781512 -26.902361256716603 L45.03060723468969 -16.210282966456184 L33.44752242024091 -10.308406469842074 A35 35 0 0 1 34.995956935804216 -0.5319757018291039 L34.995956935804216 -0.5319757018291039 L47.83590536354101 1.5016723436938944 L45.95869178305824 13.353932430835552 L33.11874335532145 11.320284385312554 A35 35 0 0 1 28.62501136759251 20.13972999335392 M0 -25A25 25 0 1 0 0 25 A25 25 0 1 0 0 -25" fill="#e6e6e6"></path>
															</g>
														</g>
													</g>
												</svg>
												<div style={{ flexGrow: "1" }}>Procesando...</div>
											</button> :
											<button
												style={{ margin: "0 2rem" }}
												onClick={() => {
													swal({
														title: "¿Estás seguro?",
														icon: "warning",
														buttons: true,
														dangerMode: true,
													})
														.then((willDelete) => {
															if (willDelete) {
																updateProfilePassword()
															}
														});
												}}
											>
												Actualizar
											</button>
									}
								</div>
							</div>
						</>
						:
						<Error />
			}
		</div>
	)
}

export default Profile

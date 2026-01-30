import React, { useEffect, useState } from 'react'
import { Link } from "react-router-dom"
import Modal from 'react-bootstrap/Modal';
import './Suppliers.scss'
import Table from '../Table/Table'

import moment from 'moment'
import swal from 'sweetalert';
import Loader from '../PageStates/Loader';
import Error from '../PageStates/Error';

function Suppliers() {
  const [pageState, setPageState] = useState(1)
  const [permission, setPermission] = useState(null)

  const [suppliers, setSuppliers] = useState([])
  const [supplierCount, setSupplierCount] = useState(0)

  const [searchInput, setSearchInput] = useState("")
  const [sortColumn, setSortColumn] = useState("")
  const [sortOrder, setSortOrder] = useState("")
  const [tablePage, setTablePage] = useState(1)
  const [data, setData] = useState([])

  // Modal related state variables
  const [editModalShow, setEditModalShow] = useState(false)

  const [editSupplierId, setEditSupplierId] = useState(null)
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
      .then(res => res.json())
      .then(body => {
        if (body.operation === 'success') {
          fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_permission`, {
            method: 'POST',
            credentials: 'include'
          })
            .then(res => res.json())
            .then(body => {
              const p = body.permissions?.find(x => x.page === 'suppliers');

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


  const getSuppliers = async (sv, sc, so, scv) => {
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_suppliers`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({ start_value: sv, sort_column: sc, sort_order: so, search_value: scv }),
      credentials: 'include'
    })

    let body = await result.json()
    setSuppliers(body.info.suppliers)   // <-- OJO: aquí estaba raro en tu código, lo dejé correcto
    setSupplierCount(body.info.count)
  }

  useEffect(() => {
    if (permission !== null) {
      let p1 = getSuppliers((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
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
      getSuppliers((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
  }, [tablePage, sortColumn, sortOrder, searchInput])



  const deleteSupplier = async (id) => {
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/delete_supplier`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({ supplier_id: id }),
      credentials: 'include'
    })

    let body = await result.json()
    if (body.operation === 'success') {
      getSuppliers((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
      swal('Éxito', body.message, 'success')
    } else {
      swal('Oops!', 'Algo salió mal', 'error')
    }
  }

  useEffect(() => {
    if (suppliers.length !== 0) {
      let tArray = suppliers.map((obj, i) => {
        let tObj = {}
        tObj.sl = i + 1;
        tObj.name = obj.name;
        tObj.address = obj.address;
        tObj.celular = obj.celular;
        tObj.email = obj.email;
        tObj.addedon = moment(obj.timeStamp).format('MMMM Do, YYYY');
        tObj.action =
          <>
            <button className='btn warning' style={{ marginRight: '0.5rem' }} onClick={() => { editModalInit(obj.supplier_id) }}>
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
                        deleteSupplier(obj.supplier_id)
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
    } else {
      setData([])
    }
  }, [suppliers])

  const editModalInit = (id) => {
    let p = suppliers.find(x => x.supplier_id === id)
    setEditSupplierId(p.supplier_id)

    setEditName(p.name)
    setEditEmail(p.email)
    setEditAddress(p.address)

    setEditModalShow(true);
  }

  const updateSupplier = async () => {
    if (editName === "") {
      swal("Oops!", "El nombre no puede estar vacío", "error")
      return;
    }

    if (editEmail === "") {
      swal("Oops!", "El correo no puede estar vacío", "error")
      return;
    }

    let regex = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-z]+)$/;
    if (!regex.test(editEmail)) {
      swal("Oops!", "Por favor ingresa un correo válido", "error")
      return;
    }

    let obj = {}
    obj.supplier_id = editSupplierId
    obj.name = editName;
    obj.address = editAddress;
    obj.email = editEmail;

    setEditModalSubmitButton(true);

    let response = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/update_supplier`, {
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
      swal("Éxito!", "Proveedor actualizado correctamente", "success")
      handleEditModalClose()
      getSuppliers((tablePage - 1) * 10, sortColumn, sortOrder, searchInput)
    } else {
      swal("Oops!", body.message, "error")
    }
  }

  const handleEditModalClose = () => {
    setEditModalShow(false);

    setEditSupplierId(null)
    setEditName('')
    setEditAddress('')
    setEditEmail('')
  }

  return (
    <div className='suppliers'>
      <div style={{ overflow: "scroll", height: "100%" }} >
        <div className='supplier-header'>
          <div className='title'>Proveedores</div>
          <Link to={"/suppliers/addnew"} className='btn success' style={{ margin: "0 0.5rem", textDecoration: "none" }}>
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
                    headers={['N°', 'Nombre', 'Dirección', 'Celular', 'Correo', 'Fecha', 'Acción']}
                    columnOriginalNames={["name", "address", "celular", "email", "timeStamp"]}
                    sortColumn={sortColumn}
                    setSortColumn={setSortColumn}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                    data={data}
                    data_count={supplierCount}
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    custom_styles={["3rem", "5rem", "8rem", "6rem", "5rem", "6rem", "10rem"]}
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
              Ver / Editar proveedor
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
                    <label className='fst-italic fw-bold'>Correo</label>
                    <input className='my_form_control' type='text' value={editEmail} onChange={(e) => { setEditEmail(e.target.value) }} />
                  </div>

                  {editModalSubmitButton && <div className="text-center mt-2">Actualizando...</div>}
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button className='btn btn-outline-danger' style={{ transition: "color 0.4s, background-color 0.4s" }} onClick={() => { handleEditModalClose() }}>
              Cancelar
            </button>
            <button className='btn btn-outline-success' style={{ transition: "color 0.4s, background-color 0.4s" }}
              disabled={editModalSubmitButton}
              onClick={() => {
                swal({
                  title: "¿Estás seguro?",
                  icon: "warning",
                  buttons: true,
                  dangerMode: true,
                })
                  .then((willDelete) => {
                    if (willDelete) {
                      updateSupplier()
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

export default Suppliers

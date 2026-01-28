import React, { useEffect, useState } from 'react'
import { Link } from "react-router-dom"
import Modal from 'react-bootstrap/Modal';
import './Employees.scss'
import Table from '../Table/Table'

import moment from 'moment'
import 'moment/locale/es';
import swal from 'sweetalert';
import Loader from '../PageStates/Loader';
import Error from '../PageStates/Error';

function Employees() {
  const [pageState, setPageState] = useState(1)
  const [permission, setPermission] = useState(null)

  const [employees, setEmployees] = useState([])
  const [empCount, setEmpCount] = useState(0)

  const [searchInput, setSearchInput] = useState("")
  const [sortColumn, setSortColumn] = useState("")
  const [sortOrder, setSortOrder] = useState("")
  const [tablePage, setTablePage] = useState(1)
  const [data, setData] = useState([])

  // Modal related state variables
  const [editModalShow, setEditModalShow] = useState(false)

  const [editEmployeeId, setEditEmployeeId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editEmail, setEditEmail] = useState('')

  const [editModalSubmitButton, setEditModalSubmitButton] = useState(false)

  /*
  useEffect(() => {
    
    moment.locale('es');

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

              let p = JSON.parse(body.info).find(x => x.page === 'employees')
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
  }, [])*/
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
          const p = body.permissions?.find(x => x.page === 'employees');
    
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

  const getEmployees = async (sv, sc, so, scv) => {
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_employees`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({ start_value: sv, sort_column: sc, sort_order: so, search_value: scv }),
      credentials: 'include',
    })

    let body = await result.json()
    setEmployees(body.info.employees)
    setEmpCount(body.info.count)
  }

  useEffect(() => {
    if (permission !== null) {
      let p1 = getEmployees((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
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
      getEmployees((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
  }, [tablePage, sortColumn, sortOrder, searchInput])

  const deleteEmployee = async (id) => {
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/delete_employee`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({ user_id: id }),
      credentials: 'include',
    })

    let body = await result.json()
    if (body.operation === 'success') {
      getEmployees((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
      swal('Éxito', body.message, 'success')
    } else {
      swal('¡Ups!', 'Algo salió mal', 'error')
    }
  }

  useEffect(() => {
    if (employees.length !== 0) {
      let tArray = employees.map((obj, i) => {
        let tObj = {}
        tObj.sl = i + 1;
        tObj.name = obj.user_name;
        tObj.address = obj.address;
        tObj.email = obj.email;
        // ✅ fecha en español
        tObj.addedon = moment(obj.timeStamp).format('D [de] MMMM, YYYY');

        tObj.action =
          <>
            <button
              className='btn warning'
              style={{ marginRight: '0.5rem' }}
              onClick={() => { editModalInit(obj.user_id) }}
            >
              Ver/Editar
            </button>

            {
              permission.delete &&
              <button
                className='btn danger'
                style={{ marginLeft: '0.5rem' }}
                onClick={() => {
                  swal({
                    title: "¿Estás seguro?",
                    text: "Si lo eliminas, no podrás recuperar este registro.",
                    icon: "warning",
                    buttons: ["Cancelar", "Sí, eliminar"],
                    dangerMode: true,
                  })
                    .then((willDelete) => {
                      if (willDelete) {
                        deleteEmployee(obj.user_id)
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
  }, [employees])

  const editModalInit = (id) => {
    let p = employees.find(x => x.user_id === id)
    setEditEmployeeId(p.user_id)

    setEditName(p.user_name)
    setEditEmail(p.email)
    setEditAddress(p.address)

    setEditModalShow(true);
  }

  const updateEmployee = async () => {
    if (editName === "") {
      swal("¡Ups!", "El nombre no puede estar vacío", "error")
      return;
    }

    if (editEmail === "") {
      swal("¡Ups!", "El correo no puede estar vacío", "error")
      return;
    }

    let regex = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-z]+)$/;
    if (!regex.test(editEmail)) {
      swal("¡Ups!", "Por favor ingresa un correo válido", "error")
      return;
    }

    let obj = {}
    obj.user_id = editEmployeeId;
    obj.name = editName;
    obj.address = editAddress;
    obj.email = editEmail;

    setEditModalSubmitButton(true);

    let response = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/update_employee`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify(obj),
      credentials: 'include',
    })
    let body = await response.json()

    setEditModalSubmitButton(false)

    if (body.operation === 'success') {
      console.log('Empleado actualizado correctamente')
      swal("¡Éxito!", "Empleado actualizado correctamente", "success")
      handleEditModalClose()
      getEmployees((tablePage - 1) * 10, sortColumn, sortOrder, searchInput)
    } else {
      swal("¡Ups!", body.message, "error")
    }
  }

  const handleEditModalClose = () => {
    setEditModalShow(false);

    setEditEmployeeId(null)
    setEditName('')
    setEditAddress('')
    setEditEmail('')
  }

  return (
    <div className='employees'>
      <div style={{ overflow: "scroll", height: "100%" }}>
        <div className='employee-header'>
          <div className='title'>Empleados</div>
          <Link
            to={"/employees/addnew"}
            className='btn success'
            style={{ margin: "0 0.5rem", textDecoration: "none" }}
          >
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
                    headers={['N°', 'Nombre', 'Dirección', 'Correo', 'Fecha', 'Acción']}
                    columnOriginalNames={["user_name", "address", "email", "timeStamp"]}
                    sortColumn={sortColumn}
                    setSortColumn={setSortColumn}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                    data={data}
                    data_count={empCount}
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    custom_styles={["3rem", "5rem", "6rem", "rem", "8rem", "8rem"]}
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
              Ver / Editar empleado
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
              style={{ transition: "color 0.4s, background-color 0.4s" }}
              disabled={editModalSubmitButton}
              onClick={() => {
                swal({
                  title: "¿Estás seguro?",
                  icon: "warning",
                  buttons: ["Cancelar", "Sí, actualizar"],
                  dangerMode: true,
                })
                  .then((willUpdate) => {
                    if (willUpdate) {
                      updateEmployee()
                    }
                  });
              }}
            >
              {editModalSubmitButton ? <div className="button-loader"></div> : "Actualizar"}
            </button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  )
}

export default Employees

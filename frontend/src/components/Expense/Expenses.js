import React, { useEffect, useState } from 'react'
import { Link } from "react-router-dom"
import { Modal, OverlayTrigger, Popover } from 'react-bootstrap';
import './Expenses.scss'
import Table from '../Table/Table'

import moment from 'moment'
import swal from 'sweetalert';
import Loader from '../PageStates/Loader';
import Error from '../PageStates/Error';

function Expenses() {
  const [pageState, setPageState] = useState(1)
  const [permission, setPermission] = useState(null)

  const [expenses, setExpenses] = useState([])
  const [expenseCount, setExpenseCount] = useState(0)

  const [searchInput, setSearchInput] = useState("")
  const [sortColumn, setSortColumn] = useState("")
  const [sortOrder, setSortOrder] = useState("")
  const [tablePage, setTablePage] = useState(1)
  const [data, setData] = useState([])

  // Modal related state variables
  const [viewModalShow, setViewModalShow] = useState(false)
  const [viewExpenseDetails, setViewExpenseDetails] = useState(null)
  const [productDetails, setProductDetails] = useState([])

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

              let p = JSON.parse(body.info).find(x => x.page === 'expenses')
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


  const getExpenses = async (sv, sc, so, scv) => {
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_expenses`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({ start_value: sv, sort_column: sc, sort_order: so, search_value: scv }),
      credentials: 'include'
    })

    let body = await result.json()
    setExpenses(body.info.expenses)
    setExpenseCount(body.info.count)
  }

  const getProductsDetailsById = async (value) => {
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_products_details_by_id`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({ product_id_list: value }),
      credentials: 'include'
    })

    let body = await result.json()
    setProductDetails(body.info.products);
  }

  useEffect(() => {
    if (permission !== null) {
      let p1 = getExpenses((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
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
      getExpenses((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
  }, [tablePage, sortColumn, sortOrder, searchInput])



  const deleteExpense = async (id) => {
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/delete_expense`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({ expense_id: id }),
      credentials: 'include'
    })

    let body = await result.json()
    if (body.operation === 'success') {
      getExpenses((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
      swal('Éxito', body.message, 'success')
    } else {
      swal('Oops!', 'Algo salió mal', 'error')
    }
  }

  useEffect(() => {
    if (expenses.length !== 0) {
      let tArray = expenses.map((obj, i) => {
        let tObj = {}
        tObj.sl = i + 1;
        tObj.expense_ref = obj.expense_ref;
        tObj.supplier_name = obj.supplier_name;
        tObj.due_date = moment(obj.due_date).format('MMMM Do, YYYY');
        tObj.grand_total = obj.grand_total;
        tObj.addedon = moment(obj.timeStamp).format('MMMM Do, YYYY');
        tObj.action =
          <>
            <button className='btn warning' style={{ marginRight: '0.5rem' }} onClick={() => { viewModalInit(obj.expense_id) }} >
              Ver
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
                        deleteExpense(obj.expense_id)
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
  }, [expenses])

  const viewModalInit = (id) => {
    let p = expenses.find(x => x.expense_id === id)

    setViewExpenseDetails(p)
    setViewModalShow(true);

    getProductsDetailsById(JSON.parse(p.items).map(x => x.product_id))
  }

  const handleViewModalClose = () => {
    setViewModalShow(false);
    setViewExpenseDetails(null)
    setProductDetails([])
  }

  return (
    <div className='expenses'>
      <div style={{ overflow: "scroll", height: "100%" }} >
        <div className='expense-header'>
          <div className='title'>Gastos</div>
          <Link to={"/expenses/addnew"} className='btn success' style={{ margin: "0 0.5rem", textDecoration: "none" }}>
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
                    headers={['N°', 'Ref. Gasto', 'Proveedor', 'Vence', 'Total', 'Fecha', 'Acción']}
                    columnOriginalNames={["expense_ref", "name", "due_date", "grand_total", "timeStamp"]}
                    sortColumn={sortColumn}
                    setSortColumn={setSortColumn}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                    data={data}
                    data_count={expenseCount}
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    custom_styles={["3rem", "5rem", "5rem", "8rem", "5rem", "8rem", "10rem"]}
                    current_page={tablePage}
                    tablePageChangeFunc={setTablePage}
                  />
                </div>
              </div>
              :
              <Error />
        }

        <Modal show={viewModalShow} onHide={() => { handleViewModalClose() }} size="lg" centered >
          <Modal.Header closeButton>
            <Modal.Title className='fs-4 fw-bold' style={{ color: "#2cd498" }}>
              Ver gasto
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ backgroundColor: "#fafafa" }} >
            <div className='container d-flex gap-2'>
              <div className='card my_card' style={{ flex: 1 }}>
                <div className='card-body'>
                  {
                    viewExpenseDetails !== null &&
                    <>
                      <div className='form-group mb-2'>
                        <label className='fst-italic fw-bold'>Referencia de gasto</label>
                        <input className='my_form_control' type='text' value={viewExpenseDetails.expense_ref} readOnly />
                      </div>
                      <div className='form-group mb-2'>
                        <label className='fst-italic fw-bold'>Proveedor</label>
                        <input className='my_form_control' type='text' value={viewExpenseDetails.supplier_name} readOnly />
                      </div>
                      <div className='form-group mb-2'>
                        <label className='fst-italic fw-bold'>Fecha de vencimiento</label>
                        <input className='my_form_control' type='text' value={moment(viewExpenseDetails.due_date).format('MMMM Do, YYYY')} readOnly />
                      </div>
                      <div className='form-group mb-2'>
                        <label className='fst-italic fw-bold'>Impuesto</label>
                        <input className='my_form_control' type='text' value={`${viewExpenseDetails.tax}%`} readOnly />
                      </div>
                      <div className='form-group mb-2'>
                        <label className='fst-italic fw-bold'>Total</label>
                        <input className='my_form_control' type='text' value={viewExpenseDetails.grand_total} readOnly />
                      </div>

                      <div className='form-group mb-2'>
                        <label className='fst-italic fw-bold mb-2'>Detalle de ítems:</label>
                        <div className='p-2 border rounded'>
                          <div className='mb-2 row gx-0'>
                            <div className='fw-bold text-secondary col-2 d-flex align-items-center text-uppercase justify-content-center' style={{ fontSize: "smaller" }}>Imagen</div>
                            <div className='fw-bold text-secondary col-4 d-flex align-items-center text-uppercase justify-content-start' style={{ fontSize: "smaller" }}>Producto</div>
                            <div className='fw-bold text-secondary col-2 d-flex align-items-center text-uppercase justify-content-center' style={{ fontSize: "smaller" }}>Cantidad</div>
                            <div className='fw-bold text-secondary col-2 d-flex align-items-center text-uppercase justify-content-center' style={{ fontSize: "smaller" }}>Precio</div>
                            <div className='fw-bold text-secondary col-2 d-flex align-items-center text-uppercase justify-content-center' style={{ fontSize: "smaller" }}>Total</div>
                          </div>

                          {
                            productDetails.length > 0 && JSON.parse(viewExpenseDetails.items).map((viewItem, ind) => {
                              let img = productDetails.find(x => x.product_id === viewItem.product_id)?.image
                              return (
                                <div key={ind} className='py-2 row gx-0' style={{ borderBottom: "1px dashed lightgray" }}>
                                  <div className='col-2 d-flex align-items-center justify-content-center'>
                                    <OverlayTrigger
                                      trigger={['hover', 'focus']}
                                      placement="left"
                                      overlay={
                                        (<Popover id="popover-basic" style={{ backgroundColor: "#ebf4ee", boxShadow: "rgb(0 0 0 / 75%) 0px 0px 16px -5px" }}>
                                          <Popover.Body style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px" }}>
                                            {
                                              img === null || img === undefined ?
                                                <div className='d-flex align-items-center text-dark fs-5 text-center' style={{ width: "10rem", height: "10rem" }}>
                                                  No hay imagen disponible
                                                </div> :
                                                <img style={{ width: "14rem", borderRadius: "5px" }} src={`${process.env.REACT_APP_BACKEND_ORIGIN}/uploads/${img}`} alt="product" />
                                            }
                                          </Popover.Body>
                                        </Popover>)
                                      }
                                    >
                                      <img
                                        style={{ width: "60px", height: "60px", borderRadius: "5px", objectFit: "cover", cursor: "pointer" }}
                                        src={img === null || img === undefined
                                          ? "https://lh3.googleusercontent.com/SMKEdK_g-LuC3ero8vP9d4lPJBKyzc4t91-GYLQ1vEkhv87KyaxFmWFeEb6ZcyRNet0"
                                          : `${process.env.REACT_APP_BACKEND_ORIGIN}/uploads/${img}`}
                                        alt="product"
                                      />
                                    </OverlayTrigger>
                                  </div>
                                  <div className='col-4 d-flex align-items-center justify-content-start'>{viewItem.product_name}</div>
                                  <div className='col-2 d-flex align-items-center justify-content-center'>{viewItem.quantity}</div>
                                  <div className='col-2 d-flex align-items-center justify-content-center'>{viewItem.rate}</div>
                                  <div className='col-2 d-flex align-items-center justify-content-center'>{viewItem.rate * viewItem.quantity}</div>
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
            <button className='btn btn-outline-danger' style={{ transition: "color 0.4s, background-color 0.4s" }} onClick={() => { handleViewModalClose() }}>
              Cerrar
            </button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  )
}

export default Expenses

import React, { useEffect, useState } from 'react'
import './ExpenseAddNew.scss'

import Select from 'react-select'
import swal from 'sweetalert';
import Loader from '../PageStates/Loader';
import Error from '../PageStates/Error';

function ExpenseAddNew() {
  const todayISO = new Date().toISOString().slice(0, 10);

  const [pageState, setPageState] = useState(1)
  const [permission, setPermission] = useState(null)

  const [supplierList, setSupplierList] = useState([])
  const [productList, setProductList] = useState([])

  const [expenseRef, setExpenseRef] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [dueDate, setDueDate] = useState(todayISO) //  hoy por defecto
  const [itemArray, setItemArray] = useState([{ product_id: null, product_name: null, quantity: 0, rate: 0 }])
  const [tax, setTax] = useState(0)
  const [grandTotal, setGrandTotal] = useState(0)

  const [submitButtonState, setSubmitButtonState] = useState(false)

  // CAMBIO: estados para boton de Acceso  "Nuevo proveedor"
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierAddress, setNewSupplierAddress] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);

  useEffect(() => {
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
              const p = body.permissions?.find(x => x.page === 'expenses');

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
      headers: { 'Content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ search_value: value }),
      credentials: 'include'
    })

    let body = await result.json()
    setProductList(body.info.products)
  }

  const getSuppliers = async (value) => {
    // revisa si tu ruta está mal escrita en backend:
    
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_suppiers_search`, {
      method: 'POST',
      headers: { 'Content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ search_value: value }),
      credentials: 'include'
    })

    let body = await result.json()
    setSupplierList(body.info.suppliers)
  }

  useEffect(() => {
    if (permission !== null) setPageState(2);
  }, [permission])

  useEffect(() => {
    let temp = itemArray.reduce((p, o) => p + (o.quantity * o.rate), 0)
    setGrandTotal(temp + (temp * tax / 100))
  }, [itemArray, tax])

  const insertExpense = async () => {
    if (expenseRef === "") {
      swal("¡Ups!", "La referencia del gasto no puede estar vacía", "error")
      return;
    }
    if (selectedSupplier === null) {
      swal("¡Ups!", "Por favor selecciona un proveedor", "error")
      return;
    }
    if (dueDate === "") {
      swal("¡Ups!", "Por favor selecciona una fecha", "error")
      return;
    }

    let flag = false;
    itemArray.forEach(obj => {
      if (obj.product_id === null || obj.product_name === null || obj.quantity < 1 || obj.rate < 1) {
        flag = true;
      }
    });

    if (flag) {
      swal("¡Ups!", "¡Por favor ingresa correctamente todos los detalles de los ítems!", "error")
      return;
    }

    if (tax < 0) {
      swal("¡Ups!", "¡El impuesto no puede ser negativo!", "error")
      return;
    }

    let obj = {}
    obj.expense_reference = expenseRef;
    obj.supplier_id = selectedSupplier.value;
    obj.due_date = dueDate;
    obj.item_array = itemArray
    obj.tax = tax
    obj.grand_total = grandTotal

    setSubmitButtonState(true)

    let response = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/add_expense`, {
      method: 'POST',
      headers: { 'Content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(obj),
      credentials: 'include'
    })
    let body = await response.json()

    setSubmitButtonState(false)

    if (body.operation === 'success') {
      swal("¡Éxito!", "Gasto creado exitosamente", "success")

      setExpenseRef('')
      setSelectedSupplier(null)
      setDueDate(todayISO) // vuelve a hoy
      setItemArray([{ product_id: null, product_name: null, quantity: 0, rate: 0 }])
      setTax(0)
      setGrandTotal(0)
    } else {
      swal("¡Ups!", body.message, "error")
    }
  }

  // CAMBIO: función para crear proveedor boton de acceso "Nuevo proveedor" 
  const createSupplier = async () => {
    if (!newSupplierName.trim()) {
      swal("¡Ups!", "El nombre del proveedor es obligatorio", "error");
      return;
    }

    setSavingSupplier(true);

    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/add_supplier`, {
        method: "POST",
        headers: { "Content-type": "application/json; charset=UTF-8" },
        credentials: "include",
        body: JSON.stringify({
          name: newSupplierName,
          email: newSupplierEmail,
          address: newSupplierAddress,
        }),
      });

      const body = await res.json();
      setSavingSupplier(false);

      if (body.operation === "success") {
        const supplierId = body.info?.supplier_id ?? body.supplier_id;

        setSelectedSupplier({ label: newSupplierName, value: supplierId });

        setShowSupplierModal(false);
        setNewSupplierName("");
        setNewSupplierEmail("");
        setNewSupplierAddress("");

        swal("Éxito", "Proveedor creado y seleccionado", "success");
      } else {
        swal("¡Ups!", body.message || "No se pudo crear el proveedor", "error");
      }
    } catch (e) {
      setSavingSupplier(false);
      swal("¡Ups!", "Error de conexión al crear proveedor", "error");
    }
  };

  return (
    <div className='expenseaddnew'>
      <div style={{ overflow: "scroll", height: "100%" }} >
        <div className='expense-header'>
          <div className='title'>Añadir nuevo gasto</div>
        </div>

        {
          pageState === 1 ?
            <Loader />
            : pageState === 2 ?
              <div className="card">
                <div className="container" style={{ display: "flex", flexDirection: "column" }}>
                  <h4 style={{ marginLeft: "10px", marginTop: "5px", color: "darkseagreen", fontWeight: "bold" }}>
                    Detalles básicos de gastos
                  </h4>

                  <div style={{ display: "flex", marginTop: "5px" }}>
                    <div style={{ flexGrow: "1", textAlign: "center" }}>
                      <input
                        className='my_input'
                        type='text'
                        value={expenseRef}
                        onChange={(e) => setExpenseRef(e.target.value)}
                        placeholder='Referencia de gasto'
                      />
                    </div>

                    {/* ✅ CAMBIO: envolvemos el Select de proveedor + botón "+ Nuevo" */}
                    <div style={{ flexGrow: "1", display: "flex", gap: "10px", alignItems: "center" }}>
                      <div style={{ flexGrow: 1 }}>
                        <Select
                          options={supplierList.map(x => ({ label: x.name, value: x.supplier_id }))}
                          value={selectedSupplier}
                          placeholder='Seleccionar proveedor...'
                          onChange={(val) => setSelectedSupplier(val)}

                          // CARGA LISTA AL ABRIR
                          onMenuOpen={() => getSuppliers("")}

                          // BUSCA AL ESCRIBIR (y devuelve string)
                          onInputChange={(val) => {
                            getSuppliers(val || "");
                            return val;
                          }}

                          onMenuClose={() => setSupplierList([])}
                          classNamePrefix="react-dropdown-dark"
                        />
                      </div>

                      <button
                        type="button"
                        className="btn info"
                        onClick={() => setShowSupplierModal(true)}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        + Nuevo
                      </button>
                    </div>

                    <div style={{ flexGrow: "1", textAlign: "center" }}>
                      <input
                        className='my_input'
                        type='date'
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <h4 style={{ marginLeft: "10px", marginTop: "1rem", color: "darkseagreen", fontWeight: "bold" }}>
                    Lista de gastos
                  </h4>

                  <div style={{ margin: "0 15px" }}>
                    <div style={{ display: "flex", textAlign: "center" }}>
                      <div style={{ minWidth: "30%", color: "#626664", fontWeight: "bold" }}>Producto</div>
                      <div style={{ minWidth: "20%", color: "#626664", fontWeight: "bold" }}>Cantidad</div>
                      <div style={{ minWidth: "20%", color: "#626664", fontWeight: "bold" }}>Tarifa</div>
                      <div style={{ minWidth: "20%", color: "#626664", fontWeight: "bold" }}>Total</div>
                      <div style={{ minWidth: "10%" }}></div>
                    </div>

                    {itemArray.map((obj, ind) => (
                      <div key={ind} style={{ display: "flex", textAlign: "center", alignItems: "center", height: "2.5rem", margin: "0.3rem 0" }}>
                        <div style={{ minWidth: "30%", height: "100%" }}>
                          <Select
                            options={productList.map(x => ({ label: x.name, value: x.product_id }))}
                            value={(obj.product_name && obj.product_id) ? { label: obj.product_name, value: obj.product_id } : null}
                            placeholder='Elige un producto...'
                            onChange={(val) => {
                              let t = itemArray.map(x => ({ ...x }))
                              t[ind].product_id = val.value
                              t[ind].product_name = val.label
                              t[ind].quantity = 1
                              t[ind].rate = parseFloat(productList.find(x => x.product_id === val.value).selling_price)
                              setItemArray(t)
                            }}

                            // CARGA LISTA AL ABRIR
                            onMenuOpen={() => getProducts("")}

                            // BUSCA AL ESCRIBIR (y devuelve string)
                            onInputChange={(val) => {
                              getProducts(val || "");
                              return val;
                            }}

                            onMenuClose={() => setProductList([])}
                            classNamePrefix="react-dropdown-dark"
                          />
                        </div>

                        <div style={{ minWidth: "20%", height: "100%" }}>
                          <input className='my_input' style={{ width: "90%", height: "100%", marginLeft: "10%" }} type="number"
                            value={obj.quantity.toString()}
                            onChange={(e) => {
                              let t = itemArray.map(x => ({ ...x }))
                              t[ind].quantity = e.target.value === "" ? 0 : parseFloat(e.target.value)
                              setItemArray(t)
                            }}
                          />
                        </div>

                        <div style={{ minWidth: "20%", height: "100%" }}>
                          <input className='my_input' style={{ width: "90%", height: "100%", marginLeft: "10%" }} type="number"
                            value={obj.rate.toString()}
                            onChange={(e) => {
                              let t = itemArray.map(x => ({ ...x }))
                              t[ind].rate = e.target.value === "" ? 0 : parseFloat(e.target.value)
                              setItemArray(t)
                            }}
                          />
                        </div>

                        <div style={{ minWidth: "20%", height: "100%" }}>
                          <p className='my_input' style={{ width: "90%", height: "100%", marginLeft: "10%" }}>
                            {obj.quantity * obj.rate}
                          </p>
                        </div>

                        <div style={{ minWidth: "10%", height: "100%" }}>
                          {itemArray.length > 1 &&
                            <button className='btn danger' style={{ borderRadius: "3rem", width: "3rem" }}
                              onClick={() => {
                                let t = itemArray.map(x => ({ ...x }))
                                t.splice(ind, 1)
                                setItemArray(t)
                              }}
                            >&#10006;</button>
                          }
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className='btn info' style={{ maxWidth: "15%", margin: "0 15px" }}
                    onClick={() => {
                      let t = itemArray.map(x => ({ ...x }))
                      t.push({ product_id: null, product_name: null, quantity: 0, rate: 0 })
                      setItemArray(t)
                    }}
                  >Suma +</button>

                  <div style={{ margin: "0 15px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", margin: "0.2rem 0" }}>
                      <div style={{ marginRight: "1rem", color: "rgb(98, 102, 100)" }} ><h4>Subtotal</h4></div>
                      <div style={{ width: "20%", marginRight: "8%" }}>
                        <p className='my_input'>{itemArray.reduce((p, o) => p + (o.quantity * o.rate), 0)}</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", margin: "0.2rem 0" }}>
                      <div style={{ marginRight: "1rem", color: "rgb(98, 102, 100)" }} ><h4>Impuestos (%)</h4></div>
                      <div style={{ width: "20%", marginRight: "8%" }}>
                        <input className='my_input' style={{ width: "90%", height: "100%" }} type="number"
                          value={tax.toString()}
                          onChange={(e) => setTax(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                        />
                      </div>
                    </div>

                    <hr style={{ width: "50%", marginLeft: "auto" }} />

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", margin: "0.2rem 0" }}>
                      <div style={{ marginRight: "1rem", color: "rgb(98, 102, 100)" }} ><h3>Total general</h3></div>
                      <div style={{ width: "20%", marginRight: "8%" }}><p className='my_input'>{grandTotal}</p></div>
                    </div>
                  </div>

                  {permission.create &&
                    <button className='btn success' style={{ alignSelf: "center" }} disabled={submitButtonState}
                      onClick={() => {
                        swal({
                          title: "¿Estás seguro?",
                          text: "Por favor revisa todos los detalles antes de enviar, ya que el gasto no se puede editar después de crearlo",
                          icon: "warning",
                          buttons: true,
                        }).then((val) => {
                          if (val) insertExpense()
                        });
                      }}
                    >
                      {!submitButtonState ? <span>Enviar</span> : <span><div className="button-loader"></div></span>}
                    </button>
                  }
                </div>
              </div>
              :
              <Error />
        }

        {/* CAMBIO: Modal "Nuevo proveedor" */}
        {showSupplierModal && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
          }}>
            <div style={{ background: "#fff", borderRadius: 10, width: 520, maxWidth: "95%", padding: 20 }}>
              <h3 style={{ marginTop: 0 }}>Agregar nuevo proveedor</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input className="my_input" placeholder="Nombre" value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)} />

                <input className="my_input" placeholder="Correo" value={newSupplierEmail}
                  onChange={(e) => setNewSupplierEmail(e.target.value)} />

                <input className="my_input" placeholder="Dirección" value={newSupplierAddress}
                  onChange={(e) => setNewSupplierAddress(e.target.value)} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 15 }}>
                <button className="btn default" type="button" onClick={() => setShowSupplierModal(false)}>
                  Cancelar
                </button>

                <button className="btn success" type="button" disabled={savingSupplier} onClick={createSupplier}>
                  {savingSupplier ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpenseAddNew

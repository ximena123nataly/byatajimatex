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

  // Modal cliente nuevo
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [newCustomerCelular, setNewCustomerCelular] = useState("");

  // Modal buscar por imagen
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [imageSearchValue, setImageSearchValue] = useState("");
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const [imagePickerLoading, setImagePickerLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [dueDate, setDueDate] = useState(today);

  const [itemArray, setItemArray] = useState([
    {
      product_id: null,
      product_name: null,
      quantity: 0,
      rate: 0,
      max_stock: 0,
      product_image: null
    }
  ])

  const [tax, setTax] = useState(0)
  const [grandTotal, setGrandTotal] = useState(0)

  const [submitButtonState, setSubmitButtonState] = useState(false)

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
              const p = body.permissions?.find(x => x.page === 'orders');
              if (p?.view && p?.create) setPermission(p);
              else window.location.href = '/unauthorized';
            });
        } else {
          window.location.href = '/login';
        }
      })
      .catch(console.log);
  }, [])

  const getProducts = async (value) => {
    try {
      setImagePickerLoading(true);

      let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_products_search`, {
        method: 'POST',
        headers: { 'Content-type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ search_value: value }),
        credentials: 'include'
      })

      let body = await result.json()
      setProductList(body?.info?.products || [])
    } catch (error) {
      console.log(error)
      setProductList([])
    } finally {
      setImagePickerLoading(false);
    }
  }

  const getCustomers = async (value) => {
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_customers_search`, {
      method: 'POST',
      headers: { 'Content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ search_value: value }),
      credentials: 'include'
    })

    let body = await result.json()
    setCustomerList(body.info.customers)
  }

  useEffect(() => {
    if (permission !== null) setPageState(2);
  }, [permission])

  useEffect(() => {
    let temp = itemArray.reduce((p, o) => p + (o.quantity * o.rate), 0)
    setGrandTotal(temp + (temp * tax / 100))
  }, [itemArray, tax])

  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const money = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return "0.00";
    return num.toFixed(2);
  };

  const getProductImageValue = (product) => {
    return (
      product?.image ||
      product?.product_image ||
      product?.product_img ||
      product?.img ||
      null
    );
  };

  const getProductImageUrl = (imageName) => {
    if (!imageName) return null;

    const cleanName = String(imageName).replace(/\\/g, "/");

    if (cleanName.startsWith("http://") || cleanName.startsWith("https://")) {
      return cleanName;
    }

    if (cleanName.startsWith("/uploads/")) {
      return `${process.env.REACT_APP_BACKEND_ORIGIN}${cleanName}`;
    }

    if (cleanName.startsWith("uploads/")) {
      return `${process.env.REACT_APP_BACKEND_ORIGIN}/${cleanName}`;
    }

    return `${process.env.REACT_APP_BACKEND_ORIGIN}/uploads/${cleanName}`;
  };

  const applyProductToRow = (rowIndex, selectedProduct) => {
    if (rowIndex === null || rowIndex === undefined || !selectedProduct) return;

    let t2 = itemArray.map(x => ({ ...x }));
    t2[rowIndex].product_id = selectedProduct.product_id;
    t2[rowIndex].product_name = selectedProduct.name || selectedProduct.product_name || "";
    t2[rowIndex].quantity = 1;
    t2[rowIndex].rate = parseFloat(selectedProduct?.selling_price || 0);
    t2[rowIndex].max_stock = parseInt(selectedProduct?.product_stock || 0);
    t2[rowIndex].product_image = getProductImageValue(selectedProduct);

    setItemArray(t2);
    setShowImagePickerModal(false);
    setActiveRowIndex(null);
  };

  const openImagePicker = async (rowIndex) => {
    setActiveRowIndex(rowIndex);
    setImageSearchValue("");
    setShowImagePickerModal(true);
    await getProducts("");
  };

  const imprimirVenta = (o) => {
    if (!o) return;

    const items = Array.isArray(o.items) ? o.items : [];

    const filas = (items || [])
      .map((it) => {
        const cant = toNumber(it.quantity);
        const pu = toNumber(it.rate);
        const det = String(it.product_name || "").replace(/\n/g, "<br/>");
        const tot = cant * pu;

        return `
          <tr>
            <td class="td-right" style="width:55px;">${cant}</td>
            <td class="td-left wrap">${det}</td>
            <td class="td-right" style="width:80px;">${money(pu)}</td>
            <td class="td-right" style="width:90px;">${money(tot)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Venta ${o.order_id ?? ""}</title>
  <style>
    @page { size: letter portrait; margin: 0; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111; }
    .ticket { width: 8.5in; height: 5.5in; box-sizing: border-box; padding: 0.35in 0.45in; margin: 0 auto; overflow: hidden; }
    .wrap { word-break: break-word; overflow-wrap: anywhere; }
    .small { font-size: 11px; line-height: 1.25; }
    .muted { color: #444; }
    .title { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .col-left  { width: 33%; }
    .col-center{ width: 34%; text-align: center; }
    .col-right { width: 33%; text-align: right; }
    .logo { width: 170px; height: auto; display: block; margin-bottom: 6px; }
    hr { border: 0; border-top: 1px solid #ddd; margin: 10px 0; }
    .mid { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .mid-left { width: 55%; }
    .mid-right{ width: 45%; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    thead th { font-size: 12px; text-align: left; border-bottom: 1px solid #ddd; padding: 7px 6px; }
    tbody td { font-size: 12px; border-bottom: 1px dashed #eee; padding: 7px 6px; vertical-align: top; }
    .td-right { text-align: right; }
    .td-left { text-align: left; }
    .totals { width: 260px; margin-left: auto; margin-top: 10px; }
    .totals table { width: 100%; }
    .totals td { font-size: 12px; padding: 4px 6px; }
    .totals tr td:first-child { text-align: left; }
    .totals tr td:last-child { text-align: right; font-weight: 700; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <div class="col-left">
        <img class="logo" src="/tajima.png" alt="TAJIMA" />
        <div class="small">
          <div><b>BORDADOS COMPUTARIZADOS</b></div>
          <div>Y APLICACIONES TAJIMA TEXTIL</div>
          <div class="muted">E-mail: byatajima@gmail.com</div>
          <div class="muted">jhonnfya@hotmail.com</div>
        </div>
      </div>

      <div class="col-center">
        <div class="title">VENTA</div>
        <div class="small" style="margin-top:10px;">
          <div><b>Dir.:</b> Av. Juan Pablo II Ceja</div>
          <div>(El Alto lado Transito - Bolivia)</div>
          <div>Cel.: 75866135-75274747-77221750</div>
        </div>
      </div>

      <div class="col-right small" style="margin-top:14px;">
        <div>
          N°:
          <span style="font-size:20px; font-weight:800;">
            ${String(o.order_id || 0).padStart(6, "0")}
          </span>
        </div>
        <div>Fecha: <b>${o.fecha || ""}</b></div>
      </div>
    </div>

    <hr />

    <div class="mid small">
      <div class="mid-left wrap">
        <div><b>Referencia:</b> ${o.order_ref || ""}</div>
        <div><b>Cliente:</b> ${o.customer_name || ""}</div>
        <div><b>Vence:</b> ${o.due_date || ""}</div>
        <div><b>Impuesto:</b> ${toNumber(o.tax)}%</div>
      </div>
      <div class="mid-right">
        <div class="muted"><b>Total:</b> ${money(o.grand_total)}</div>
      </div>
    </div>

    <hr />

    <table>
      <thead>
        <tr>
          <th style="width:55px;" class="td-right">Cant</th>
          <th class="td-left">Detalle</th>
          <th style="width:80px;" class="td-right">P/U</th>
          <th style="width:90px;" class="td-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${filas || `<tr><td colspan="4" style="padding:10px; font-size:12px;">(Sin ítems)</td></tr>`}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr><td>Impuesto</td><td>${toNumber(o.tax)}%</td></tr>
        <tr><td>Total</td><td>${money(o.grand_total)}</td></tr>
      </table>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>
    `;

    const w = window.open("", "_blank", "width=900,height=650");
    if (!w) {
      swal("Bloqueado", "Tu navegador bloqueó la ventana de impresión. Permite pop-ups.", "warning");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

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
    if (flag2) return

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
      let { max_stock, product_image, ...objSpread } = obj
      return objSpread
    })

    obj.item_array = t
    obj.tax = tax
    obj.grand_total = grandTotal

    setSubmitButtonState(true)

    let response = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/add_order`, {
      method: 'POST',
      headers: { 'Content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(obj),
      credentials: 'include'
    })
    let body = await response.json()

    setSubmitButtonState(false)

    if (body.operation === 'success') {
      const orderId = body?.info?.order_id ?? body?.info?.id ?? body?.order_id ?? null;

      swal({
        title: "¡Éxito!",
        text: "Venta creada exitosamente",
        icon: "success",
        buttons: {
          cancel: { text: "OK", value: "ok", visible: true, closeModal: true },
          print: { text: "IMPRIMIR", value: "print", visible: true, closeModal: true },
        },
      }).then((value) => {
        if (value === "print") {
          imprimirVenta({
            order_id: orderId,
            order_ref: orderRef,
            customer_name: selectedCustomer?.label || "",
            due_date: dueDate,
            tax,
            grand_total: grandTotal,
            fecha: today,
            items: t.map(x => ({
              product_name: x.product_name,
              quantity: x.quantity,
              rate: x.rate,
            })),
          });
        }
      });

      setOrderRef('')
      setSelectedCustomer(null)
      setDueDate(today)
      setItemArray([
        {
          product_id: null,
          product_name: null,
          quantity: 0,
          rate: 0,
          max_stock: 0,
          product_image: null
        }
      ])
      setTax(0)
      setGrandTotal(0)

      window.dispatchEvent(new Event("caja_actualizada"));
    } else {
      swal("Oops!", body.message, "error")
    }
  }

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
        </div>

        {
          pageState === 1 ? <Loader /> :
            pageState === 2 ?
              <div className="card">
                <div className="container" style={{ display: "flex", flexDirection: "column" }}>
                  <h3 style={{ marginLeft: "10px", marginTop: "5px", color: "darkseagreen" }}>Detalles básicos de la venta</h3>
                  <div style={{ display: "flex", marginTop: "5px" }}>
                    <div style={{ flexGrow: "1", textAlign: "center" }}>
                      <input className='my_input' type='text' value={orderRef} onChange={(e) => { setOrderRef(e.target.value) }} placeholder='Referencia del pedido' />
                    </div>

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
                      itemArray.map((obj, ind) => (
                        <div
                          key={ind}
                          style={{
                            display: "flex",
                            textAlign: "center",
                            alignItems: "flex-start",
                            minHeight: "2.5rem",
                            margin: "0.5rem 0"
                          }}
                        >
                          <div style={{ minWidth: "30%" }}>
                            <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
                              <div style={{ flex: 1 }}>
                                <Select
                                  options={productList.map(x => ({ label: x.name, value: x.product_id }))}
                                  value={(obj.product_name !== null && obj.product_id !== null)
                                    ? { label: obj.product_name, value: obj.product_id }
                                    : null}
                                  placeholder='Selecciona un producto...'
                                  onChange={(val) => {
                                    const selectedProduct = productList.find(x => x.product_id === val.value);
                                    applyProductToRow(ind, selectedProduct);
                                  }}
                                  onMenuOpen={() => getProducts("")}
                                  onInputChange={(val) => {
                                    getProducts(val || "");
                                    return val;
                                  }}
                                  classNamePrefix="react-dropdown-dark"
                                />
                              </div>

                              <button
                                type="button"
                                className="btn info"
                                title="Buscar por imagen"
                                onClick={() => openImagePicker(ind)}
                                style={{
                                  minWidth: "46px",
                                  height: "38px",
                                  padding: "0",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: "6px"
                                }}
                              >
                                🖼️
                              </button>
                            </div>

                            
                          </div>

                          <div style={{ minWidth: "20%", height: "100%" }}>
                            <input
                              className='my_input'
                              style={{ width: "90%", height: "100%", marginLeft: "10%" }}
                              type="number"
                              max={obj.max_stock}
                              value={obj.quantity.toString()}
                              onChange={(e) => {
                                let t2 = itemArray.map(x => ({ ...x }))
                                t2[ind].quantity = e.target.value === "" ? 0 : parseFloat(e.target.value)
                                setItemArray(t2)
                              }}
                            />
                          </div>

                          <div style={{ minWidth: "20%", height: "100%" }}>
                            <input
                              className='my_input'
                              style={{ width: "90%", height: "100%", marginLeft: "10%" }}
                              type="number"
                              value={obj.rate.toString()}
                              onChange={(e) => {
                                let t2 = itemArray.map(x => ({ ...x }))
                                t2[ind].rate = e.target.value === "" ? 0 : parseFloat(e.target.value)
                                setItemArray(t2)
                              }}
                            />
                          </div>

                          <div style={{ minWidth: "20%", height: "100%" }}>
                            <p className='my_input' style={{ width: "90%", height: "100%", marginLeft: "10%" }}>
                              {obj.quantity * obj.rate}
                            </p>
                          </div>

                          <div style={{ minWidth: "10%", height: "100%" }}>
                            {itemArray.length > 1 && (
                              <button
                                className='btn danger'
                                style={{ borderRadius: "3rem", width: "3rem" }}
                                onClick={() => {
                                  let t2 = itemArray.map(x => ({ ...x }))
                                  t2.splice(ind, 1)
                                  setItemArray(t2)
                                }}
                              >
                                &#10006;
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    }
                  </div>

                  <button
                    className='btn info'
                    style={{ maxWidth: "15%", margin: "0 15px" }}
                    onClick={() => {
                      let t2 = itemArray.map(x => ({ ...x }))
                      t2.push({
                        product_id: null,
                        product_name: null,
                        quantity: 0,
                        rate: 0,
                        max_stock: 0,
                        product_image: null
                      })
                      setItemArray(t2)
                    }}
                  >
                    Sumar +
                  </button>

                  <div style={{ margin: "0 15px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", margin: "0.2rem 0" }}>
                      <div style={{ marginRight: "1rem", color: "rgb(98, 102, 100)" }}><h4>Subtotal</h4></div>
                      <div style={{ width: "20%", marginRight: "8%" }}>
                        <p className='my_input'>{itemArray.reduce((p, o) => p + (o.quantity * o.rate), 0)}</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", margin: "0.2rem 0" }}>
                      <div style={{ marginRight: "1rem", color: "rgb(98, 102, 100)" }}><h4>Impuestos (%)</h4></div>
                      <div style={{ width: "20%", marginRight: "8%" }}>
                        <input
                          className='my_input'
                          style={{ width: "90%", height: "100%" }}
                          type="number"
                          value={tax.toString()}
                          onChange={(e) => { setTax(e.target.value === "" ? 0 : parseFloat(e.target.value)) }}
                        />
                      </div>
                    </div>

                    <hr style={{ width: "50%", marginLeft: "auto" }} />

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", margin: "0.2rem 0" }}>
                      <div style={{ marginRight: "1rem", color: "rgb(98, 102, 100)" }}><h3>Total general</h3></div>
                      <div style={{ width: "20%", marginRight: "8%" }}>
                        <p className='my_input'>{grandTotal}</p>
                      </div>
                    </div>
                  </div>

                  {permission.create && (
                    <button
                      className='btn success'
                      style={{ alignSelf: "center" }}
                      disabled={submitButtonState}
                      onClick={() => {
                        swal({
                          title: "¿Estás seguro?",
                          text: "Por favor revisa todos los datos antes de enviar, ya que el pedido no se puede editar después de crearlo",
                          icon: "warning",
                          buttons: true,
                        }).then((val) => {
                          if (val) insertOrder()
                        });
                      }}
                    >
                      {!submitButtonState ? <span>Enviar</span> : <span><div className="button-loader"></div></span>}
                    </button>
                  )}
                </div>
              </div>
              :
              <Error />
        }

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
                  placeholder="Nombre"
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

        {showImagePickerModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                width: "1100px",
                maxWidth: "96%",
                maxHeight: "90vh",
                padding: "18px",
                overflow: "auto",
                boxSizing: "border-box"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ margin: 0 }}>Buscar por imagen</h3>

                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    setShowImagePickerModal(false);
                    setActiveRowIndex(null);
                  }}
                >
                  Cerrar
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                <input
                  className="my_input"
                  type="text"
                  placeholder="Busca por nombre o categoría. Ej: chamarra, polera, quepi..."
                  value={imageSearchValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    setImageSearchValue(value);
                    getProducts(value);
                  }}
                  style={{ flex: 1 }}
                />

                <button
                  type="button"
                  className="btn primary"
                  onClick={() => getProducts(imageSearchValue)}
                >
                  Buscar
                </button>
              </div>

              <div style={{ marginBottom: "12px", color: "#666", fontSize: "13px" }}>
                Escribe algo como <b>chamarra</b>, <b>polera</b>, <b>quepi</b> o el nombre del producto.
              </div>

              {imagePickerLoading ? (
                <div style={{ padding: "30px 0", textAlign: "center" }}>Cargando productos...</div>
              ) : productList.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center" }}>No se encontraron productos.</div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: "14px"
                  }}
                >
                  {productList.map((product) => {
                    const imageValue = getProductImageValue(product);
                    const imageUrl = getProductImageUrl(imageValue);

                    return (
                      <button
                        key={product.product_id}
                        type="button"
                        onClick={() => applyProductToRow(activeRowIndex, product)}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "10px",
                          background: "#fff",
                          padding: "10px",
                          textAlign: "left",
                          cursor: "pointer"
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "150px",
                            borderRadius: "8px",
                            overflow: "hidden",
                            border: "1px solid #eee",
                            background: "#fafafa",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "10px"
                          }}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={product.name}
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ color: "#888", fontSize: "12px" }}>Sin imagen</span>
                          )}
                        </div>

                        <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "4px" }}>
                          {product.name}
                        </div>

                        <div style={{ fontSize: "13px", color: product.product_stock <= 5 ? "red" : "green" }}>
                          Stock: <b>{product.product_stock}</b>
                        </div>

                        <div style={{ fontSize: "13px", color: "#333", marginTop: "4px" }}>
                          Precio: <b>{product.selling_price}</b>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderAddNew
import React, { useEffect, useMemo, useState } from 'react'
import './ExpenseAddNew.scss'

import Select from 'react-select'
import swal from 'sweetalert';
import Loader from '../PageStates/Loader';
import Error from '../PageStates/Error';

// ✅ CAMBIO: helpers (número y dinero)
const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(2);
};

// ✅ CAMBIO: fecha local YYYY-MM-DD (evita ISO largo)
const getLocalISODate = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

function ExpenseAddNew() {
  const todayISO = getLocalISODate(); // ✅ CAMBIO (local)

  const [pageState, setPageState] = useState(1)
  const [permission, setPermission] = useState(null)

  const [supplierList, setSupplierList] = useState([])

  const [expenseRef, setExpenseRef] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [dueDate, setDueDate] = useState(todayISO)

  // ✅ CAMBIO: gasto libre (detalle + cantidad + tarifa)
  const [itemArray, setItemArray] = useState([{ detalle: "", quantity: 0, rate: 0 }])
  const [tax, setTax] = useState(0)

  // ✅ CAMBIO: subtotal + total calculados
  const subtotal = useMemo(() => {
    return itemArray.reduce((p, o) => p + (toNumber(o.quantity) * toNumber(o.rate)), 0);
  }, [itemArray]);

  const grandTotal = useMemo(() => {
    return subtotal + (subtotal * toNumber(tax) / 100);
  }, [subtotal, tax]);

  const [submitButtonState, setSubmitButtonState] = useState(false)

  // Modal proveedor
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierAddress, setNewSupplierAddress] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [newSupplierCelular, setNewSupplierCelular] = useState("");

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

  const getSuppliers = async (value) => {
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

  // ✅ CAMBIO: impresión tipo proformas (tajima)
  const imprimirGasto = (p) => {
    if (!p) return;

    const items = Array.isArray(p.items) ? p.items : [];

    const filas = items.map((it) => {
      const cant = toNumber(it.quantity);
      const pu = toNumber(it.rate);
      const det = String(it.detalle || "").replace(/\n/g, "<br/>");
      const tot = cant * pu;

      return `
        <tr>
          <td class="td-right" style="width:55px;">${cant}</td>
          <td class="td-left wrap">${det}</td>
          <td class="td-right" style="width:80px;">${money(pu)}</td>
          <td class="td-right" style="width:90px;">${money(tot)}</td>
        </tr>
      `;
    }).join("");

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Gasto ${p.ref || ""}</title>
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
        <div class="title">GASTO</div>
        <div class="small" style="margin-top:10px;">
          <div><b>Dir.:</b> Av. Juan Pablo II Ceja</div>
          <div>(El Alto lado Transito - Bolivia)</div>
          <div>Cel.: 75866135-75274747-77221750</div>
        </div>
      </div>

      <div class="col-right small" style="margin-top:14px;">
        <div>
          Ref:
          <span style="font-size:16px; font-weight:800;">
            ${p.ref || "--"}
          </span>
        </div>
        <div>Fecha: <b>${p.fecha || ""}</b></div>
      </div>
    </div>

    <hr />

    <div class="mid small">
      <div class="mid-left wrap">
        <div><b>Proveedor:</b> ${p.proveedor || ""}</div>
        <div><b>Vence:</b> ${p.vence || ""}</div>
        <div><b>Impuesto:</b> ${toNumber(p.tax)}%</div>
      </div>
      <div class="mid-right">
        <div class="muted"><b>Total:</b> ${money(p.total)}</div>
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
        <tr><td>Impuesto</td><td>${toNumber(p.tax)}%</td></tr>
        <tr><td>Total</td><td>${money(p.total)}</td></tr>
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

    // ✅ CAMBIO: validar detalle libre
    let invalid = false;
    itemArray.forEach(obj => {
      if (!String(obj.detalle || "").trim() || toNumber(obj.quantity) < 1 || toNumber(obj.rate) < 1) invalid = true;
    });
    if (invalid) {
      swal("¡Ups!", "Completa Detalle, Cantidad y Tarifa en todos los ítems", "error")
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

    // ✅ CAMBIO: mandamos detalle
    obj.item_array = itemArray.map(it => ({
      detalle: it.detalle,
      quantity: toNumber(it.quantity),
      rate: toNumber(it.rate),
    }));

    obj.tax = toNumber(tax)
    obj.grand_total = toNumber(grandTotal)

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
      window.dispatchEvent(new Event("caja_actualizada"));

      // ✅ CAMBIO: tomar expense_id si backend lo devuelve
      const expenseId = body?.info?.expense_id ?? body?.expense_id ?? "";

      // ✅ CAMBIO: swal con botón IMPRIMIR (como proformas)
      swal({
        title: "¡Éxito!",
        text: "Gasto creado exitosamente",
        icon: "success",
        buttons: {
          imprimir: { text: "IMPRIMIR", value: "print", visible: true, closeModal: true },
          ok: { text: "OK", value: "ok", visible: true, closeModal: true },
        },
      }).then((value) => {
        if (value === "print") {
          imprimirGasto({
            // ✅ CAMBIO: Ref puede ser expenseId si existe, si no usa expenseRef
            ref: expenseId ? String(expenseId) : String(expenseRef),
            fecha: todayISO,
            proveedor: selectedSupplier?.label || "",
            vence: dueDate,
            tax: toNumber(tax),
            total: toNumber(grandTotal),
            items: itemArray.map(it => ({
              detalle: it.detalle,
              quantity: toNumber(it.quantity),
              rate: toNumber(it.rate),
            })),
          });
        }
      });

      // Reset
      setExpenseRef('')
      setSelectedSupplier(null)
      setDueDate(todayISO)
      setItemArray([{ detalle: "", quantity: 0, rate: 0 }])
      setTax(0)
    } else {
      swal("¡Ups!", body.message, "error")
    }
  }

  // crear proveedor
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
          celular: newSupplierCelular,
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
        setNewSupplierCelular("");

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

                    <div style={{ flexGrow: "1", display: "flex", gap: "10px", alignItems: "center" }}>
                      <div style={{ flexGrow: 1 }}>
                        <Select
                          options={supplierList.map(x => ({ label: x.name, value: x.supplier_id }))}
                          value={selectedSupplier}
                          placeholder='Seleccionar proveedor...'
                          onChange={(val) => setSelectedSupplier(val)}
                          onMenuOpen={() => getSuppliers("")}
                          onInputChange={(val) => { getSuppliers(val || ""); return val; }}
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
                          <input
                            className='my_input'
                            style={{ width: "95%", height: "100%" }}
                            
                            value={obj.detalle}
                            onChange={(e) => {
                              let t = itemArray.map(x => ({ ...x }))
                              t[ind].detalle = e.target.value
                              setItemArray(t)
                            }}
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
                      t.push({ detalle: "", quantity: 0, rate: 0 })
                      setItemArray(t)
                    }}
                  >Suma +</button>

                  <div style={{ margin: "0 15px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", margin: "0.2rem 0" }}>
                      <div style={{ marginRight: "1rem", color: "rgb(98, 102, 100)" }} ><h4>Subtotal</h4></div>
                      <div style={{ width: "20%", marginRight: "8%" }}><p className='my_input'>{subtotal}</p></div>
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
                          text: "Revisa todo antes de enviar, el gasto no se puede editar después.",
                          icon: "warning",
                          buttons: true,
                        }).then((val) => { if (val) insertExpense() });
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

        {/* Modal "Nuevo proveedor" */}
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

                <input className="my_input" placeholder="Celular" value={newSupplierCelular}
                  onChange={(e) => setNewSupplierCelular(e.target.value.replace(/[^\d]/g, ""))} />
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

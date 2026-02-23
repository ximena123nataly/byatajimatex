import React, { useEffect, useMemo, useState } from 'react'
import './PurchasesAddNew.scss'

import Select from 'react-select'
import swal from 'sweetalert';
import Loader from '../PageStates/Loader';
import Error from '../PageStates/Error';

// Helpers
const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const money = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return "0.00";
    return num.toFixed(2);
};

const getLocalISODate = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

function PurchasesAddNew() {

    const todayISO = getLocalISODate();

    const [pageState, setPageState] = useState(1)
    const [permission, setPermission] = useState(null)

    const [supplierList, setSupplierList] = useState([])

    const [purchaseRef, setPurchaseRef] = useState('')
    const [selectedSupplier, setSelectedSupplier] = useState(null)
    const [dueDate, setDueDate] = useState(todayISO)

    const [itemArray, setItemArray] = useState([{ detalle: "", quantity: 0, rate: 0 }])
    const [tax, setTax] = useState(0)

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
    const [newSupplierCelular, setNewSupplierCelular] = useState("");
    const [savingSupplier, setSavingSupplier] = useState(false);

    // ================= PERMISOS =================

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
                            const p = body.permissions?.find(x => x.page === 'purchases');
                            if (p?.view && p?.create) setPermission(p);
                            else window.location.href = '/unauthorized';
                        });
                } else window.location.href = '/login';
            })
            .catch(console.log);
    }, [])

    useEffect(() => {
        if (permission !== null) setPageState(2);
    }, [permission])

    // ================= PROVEEDORES =================

    const getSuppliers = async (value) => {
        let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_suppiers_search`, {
            method: 'POST',
            headers: { 'Content-type': 'application/json; charset=UTF-8' },
            body: JSON.stringify({ search_value: value }),
            credentials: 'include'
        })
        let body = await result.json()
        setSupplierList(body.info?.suppliers || [])
    }

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

    // ================= IMPRIMIR =================

    const imprimirCompra = (p) => {
        if (!p) return;

        const items = Array.isArray(p.items) ? p.items : [];

        const filas = items.map((it) => {
            const cant = toNumber(it.quantity);
            const pu = toNumber(it.rate);
            const nombre = String(it.product_name || "").replace(/\n/g, "<br/>");
            const tot = cant * pu;

            return `
      <tr>
        <td class="td-right" style="width:55px;">${cant}</td>
        <td class="td-left wrap">${nombre}</td>
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
<title>Compra ${p.ref || ""}</title>
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
    <img class="logo" src="/tajima.png" />
    <div class="small">
      <div><b>BORDADOS COMPUTARIZADOS</b></div>
      <div>Y APLICACIONES TAJIMA TEXTIL</div>
      <div class="muted">E-mail: byatajima@gmail.com</div>
      <div class="muted">jhonnfya@hotmail.com</div>
    </div>
  </div>

  <div class="col-center">
    <div class="title">COMPRA</div>
    <div class="small" style="margin-top:10px;">
      <div><b>Dir.:</b> Av. Juan Pablo II Ceja</div>
      <div>(El Alto lado Transito - Bolivia)</div>
      <div>Cel.: 75866135-75274747-77221750</div>
    </div>
  </div>

  <div class="col-right small" style="margin-top:14px;">
    <div>Ref: <span style="font-size:16px;font-weight:800;">${p.ref || "--"}</span></div>
    <div>Fecha: <b>${p.fecha}</b></div>
  </div>
</div>

<hr/>

<div class="mid small">
  <div class="mid-left wrap">
    <div><b>Proveedor:</b> ${p.proveedor}</div>
    <div><b>Vence:</b> ${p.vence}</div>
    <div><b>Impuesto:</b> ${p.tax}%</div>
  </div>
  <div class="mid-right">
    <div class="muted"><b>Total:</b> ${money(p.total)}</div>
  </div>
</div>

<hr/>

<table>
<thead>
<tr>
<th style="width:55px;" class="td-right">Cant</th>
<th class="td-left">Producto</th>
<th style="width:80px;" class="td-right">P/U</th>
<th style="width:90px;" class="td-right">Total</th>
</tr>
</thead>
<tbody>
${filas}
</tbody>
</table>

<div class="totals">
<table>
<tr><td>Impuesto</td><td>${p.tax}%</td></tr>
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
            swal("Bloqueado", "Permite ventanas emergentes para imprimir.", "warning");
            return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
    };
    // ================= GUARDAR =================

    const insertPurchase = async () => {

        if (!purchaseRef) {
            swal("¡Ups!", "La referencia no puede estar vacía", "error")
            return;
        }

        if (!selectedSupplier) {
            swal("¡Ups!", "Selecciona proveedor", "error")
            return;
        }

        let obj = {
            purchase_reference: purchaseRef,
            supplier_id: selectedSupplier.value,
            due_date: dueDate,
            item_array: itemArray,
            tax: tax,
            grand_total: grandTotal
        }

        setSubmitButtonState(true)

        let response = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/addPurchase`, {
            method: 'POST',
            headers: { 'Content-type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(obj),
            credentials: 'include'
        })

        let body = await response.json()
        setSubmitButtonState(false)

        if (body.operation === 'success') {

            const purchaseId = body?.info?.purchase_id ?? body?.purchase_id ?? "";

            swal({
                title: "¡Éxito!",
                text: "Compra creada exitosamente",
                icon: "success",
                buttons: {
                    imprimir: { text: "IMPRIMIR", value: "print", visible: true },
                    ok: { text: "OK", value: "ok", visible: true },
                },
            }).then((value) => {
                if (value === "print") {
                    imprimirCompra({
                        ref: purchaseId || purchaseRef,
                        proveedor: selectedSupplier.label,
                        total: grandTotal,
                        items: itemArray
                    });
                }
            });

            setPurchaseRef('')
            setSelectedSupplier(null)
            setDueDate(todayISO)
            setItemArray([{ detalle: "", quantity: 0, rate: 0 }])
            setTax(0)
        } else {
            swal("¡Ups!", body.message, "error")
        }
    }

    // ================= RENDER =================

    return (
        <div className='purchasesaddnew'>
            <div style={{ overflow: "scroll", height: "100%" }}>
                <div className='purchase-header'>
                    <div className='title'>Añadir nueva compra</div>
                </div>

                {
                    pageState === 1 ?
                        <Loader />
                        :
                        pageState === 2 ?
                            <div className="card">
                                <div className="container">
                                    <div className="container" style={{ display: "flex", flexDirection: "column" }}>

                                        <h4 style={{ marginLeft: "10px", marginTop: "5px", color: "darkseagreen", fontWeight: "bold" }}>
                                            Detalles básicos de compra
                                        </h4>

                                        <div style={{ display: "flex", marginTop: "5px" }}>

                                            <div style={{ flexGrow: "1", textAlign: "center" }}>
                                                <input
                                                    className='my_input'
                                                    type='text'
                                                    value={purchaseRef}
                                                    onChange={(e) => setPurchaseRef(e.target.value)}
                                                    placeholder='Referencia de compra'
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
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    className="btn info"
                                                    onClick={() => setShowSupplierModal(true)}
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
                                            Lista de productos
                                        </h4>

                                        <div style={{ margin: "0 15px" }}>
                                            <div style={{ display: "flex", textAlign: "center" }}>
                                                <div style={{ minWidth: "30%", fontWeight: "bold" }}>Detalle</div>
                                                <div style={{ minWidth: "20%", fontWeight: "bold" }}>Cantidad</div>
                                                <div style={{ minWidth: "20%", fontWeight: "bold" }}>Precio</div>
                                                <div style={{ minWidth: "20%", fontWeight: "bold" }}>Total</div>
                                                <div style={{ minWidth: "10%" }}></div>
                                            </div>

                                            {itemArray.map((obj, ind) => (
                                                <div key={ind} style={{ display: "flex", alignItems: "center", margin: "0.3rem 0" }}>

                                                    <div style={{ minWidth: "30%" }}>
                                                        <input
                                                            className='my_input'
                                                            value={obj.detalle}
                                                            onChange={(e) => {
                                                                let t = [...itemArray];
                                                                t[ind].detalle = e.target.value;
                                                                setItemArray(t);
                                                            }}
                                                        />
                                                    </div>

                                                    <div style={{ minWidth: "20%" }}>
                                                        <input
                                                            className='my_input'
                                                            type="number"
                                                            value={obj.quantity}
                                                            onChange={(e) => {
                                                                let t = [...itemArray];
                                                                t[ind].quantity = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                                                setItemArray(t);
                                                            }}
                                                        />
                                                    </div>

                                                    <div style={{ minWidth: "20%" }}>
                                                        <input
                                                            className='my_input'
                                                            type="number"
                                                            value={obj.rate}
                                                            onChange={(e) => {
                                                                let t = [...itemArray];
                                                                t[ind].rate = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                                                setItemArray(t);
                                                            }}
                                                        />
                                                    </div>

                                                    <div style={{ minWidth: "20%" }}>
                                                        <p className='my_input'>{money(obj.quantity * obj.rate)}</p>
                                                    </div>

                                                    <div style={{ minWidth: "10%" }}>
                                                        {itemArray.length > 1 &&
                                                            <button
                                                                className='btn danger'
                                                                onClick={() => {
                                                                    let t = [...itemArray];
                                                                    t.splice(ind, 1);
                                                                    setItemArray(t);
                                                                }}
                                                            >
                                                                ✕
                                                            </button>
                                                        }
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            className='btn info'
                                            style={{ maxWidth: "15%", margin: "0 15px" }}
                                            onClick={() => setItemArray([...itemArray, { detalle: "", quantity: 0, rate: 0 }])}
                                        >
                                            + Agregar
                                        </button>

                                        <div style={{ margin: "0 15px" }}>

                                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                                <h4 style={{ marginRight: "1rem" }}>Subtotal</h4>
                                                <p className='my_input' style={{ width: "20%" }}>{money(subtotal)}</p>
                                            </div>

                                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                                <h4 style={{ marginRight: "1rem" }}>Impuesto (%)</h4>
                                                <input
                                                    className='my_input'
                                                    style={{ width: "20%" }}
                                                    type="number"
                                                    value={tax}
                                                    onChange={(e) => setTax(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                                                />
                                            </div>

                                            <hr style={{ width: "50%", marginLeft: "auto" }} />

                                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                                <h3 style={{ marginRight: "1rem" }}>Total general</h3>
                                                <p className='my_input' style={{ width: "20%" }}>{money(grandTotal)}</p>
                                            </div>
                                        </div>

                                        <button
                                            className='btn success'
                                            style={{ alignSelf: "center", marginTop: "20px" }}
                                            disabled={submitButtonState}
                                            onClick={() => {
                                                swal({
                                                    title: "¿Estás seguro?",
                                                    text: "Revisa todo antes de enviar.",
                                                    icon: "warning",
                                                    buttons: true,
                                                }).then((val) => { if (val) insertPurchase() });
                                            }}
                                        >
                                            {!submitButtonState ? "Enviar" : <div className="button-loader"></div>}
                                        </button>

                                    </div>
                                    
                                </div>
                            </div>
                            :
                            <Error />
                }
            </div>
        </div>
    )
}

export default PurchasesAddNew
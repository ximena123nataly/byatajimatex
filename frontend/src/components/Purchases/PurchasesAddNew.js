import React, { useEffect, useState } from 'react'
import './PurchasesAddNew.scss'

import Select from 'react-select'
import swal from 'sweetalert';
import Loader from '../PageStates/Loader';
import Error from '../PageStates/Error';

function PurchasesAddNew() {

    const [pageState, setPageState] = useState(1)
    const [permission, setPermission] = useState(null)

    const [supplierList, setSupplierList] = useState([])
    const [productList, setProductList] = useState([])

    const [purchaseRef, setPurchaseRef] = useState('')
    const [selectedSupplier, setSelectedSupplier] = useState(null)
    const [date, setDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const today = new Date().toISOString().slice(0, 10);
    const [dueDate, setDueDate] = useState(today);

    const [itemArray, setItemArray] = useState([
        { product_id: null, product_name: null, quantity: 0, rate: 0 }
    ])

    const [tax, setTax] = useState(0)
    const [grandTotal, setGrandTotal] = useState(0)
    const [submitButtonState, setSubmitButtonState] = useState(false)

    //  Verificar permisos
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
                } else {
                    window.location.href = '/login';
                }
            })
    }, [])

    useEffect(() => {
        if (permission !== null) setPageState(2);
    }, [permission])

    //  recalcular total
    useEffect(() => {
        let subtotal = itemArray.reduce((p, o) => p + (o.quantity * o.rate), 0)
        setGrandTotal(subtotal + (subtotal * tax / 100))
    }, [itemArray, tax])

    //  Buscar productos
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

    //  Buscar proveedores
    const getSuppliers = async (value) => {
        let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_suppliers_search`, {
            method: 'POST',
            headers: { 'Content-type': 'application/json; charset=UTF-8' },
            body: JSON.stringify({ search_value: value }),
            credentials: 'include'
        })
        let body = await result.json()
        setSupplierList(body.info.suppliers)
    }

    //  Insertar compra
    const insertPurchase = async () => {

        if (purchaseRef === "") {
            swal("Oops!", "La referencia no puede estar vacía", "error")
            return;
        }

        if (selectedSupplier === null) {
            swal("Oops!", "Selecciona un proveedor", "error")
            return;
        }

        let flag = false;
        itemArray.forEach(obj => {
            if (obj.product_id === null || obj.quantity < 1 || obj.rate < 1) {
                flag = true;
            }
        });

        if (flag) {
            swal("Oops!", "Revisa los productos ingresados", "error")
            return;
        }

        let obj = {
            purchase_reference: purchaseRef,
            supplier_id: selectedSupplier.value,
            due_date: dueDate,
            item_array: itemArray,
            tax,
            grand_total: grandTotal
        }

        setSubmitButtonState(true)

        let response = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/add_purchase`, {
            method: 'POST',
            headers: { 'Content-type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(obj),
            credentials: 'include'
        })

        let body = await response.json()
        setSubmitButtonState(false)

        if (body.operation === 'success') {
            swal("Éxito", "Compra registrada correctamente", "success")

            setPurchaseRef('')
            setSelectedSupplier(null)
            setDueDate(today)
            setItemArray([{ product_id: null, product_name: null, quantity: 0, rate: 0 }])
            setTax(0)
            setGrandTotal(0)

        } else {
            swal("Oops!", body.message, "error")
        }
    }

    return (
        <div className='orderaddnew'>
            <div style={{ overflow: "scroll", height: "100%" }}>

                <div className='order-header'>
                    <div className='title'>Añadir nueva compra</div>
                </div>

                <div className="card">
                    <div className="container" style={{ display: "flex", flexDirection: "column" }}>

                        <h3 style={{ marginLeft: "10px", marginTop: "5px", color: "darkseagreen" }}>
                            Detalles básicos de la compra
                        </h3>

                        <div style={{ display: "flex", marginTop: "5px" }}>

                            <div style={{ flexGrow: "1", textAlign: "center" }}>
                                <input
                                    className='my_input'
                                    type='text'
                                    value={purchaseRef}
                                    onChange={(e) => setPurchaseRef(e.target.value)}
                                    placeholder='Referencia'
                                />
                            </div>

                            <div style={{ flexGrow: "1", textAlign: "center" }}>
                                <Select
                                    options={supplierList.map(x => ({
                                        label: x.name,
                                        value: x.supplier_id
                                    }))}
                                    value={selectedSupplier}
                                    placeholder='Selecciona proveedor...'
                                    onChange={(val) => setSelectedSupplier(val)}
                                    onMenuOpen={() => getSuppliers("")}
                                    onInputChange={(val) => {
                                        getSuppliers(val || "");
                                        return val;
                                    }}
                                    classNamePrefix="react-dropdown-dark"
                                />
                            </div>

                            <div style={{ flexGrow: "1", textAlign: "center" }}>
                                <input
                                    className='my_input'
                                    type='date'
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>

                        </div>

                        <h3 style={{ marginLeft: "10px", marginTop: "5px", color: "darkseagreen" }}>
                            Lista de productos
                        </h3>

                        <div style={{ margin: "0 15px" }}>

                            <div style={{ display: "flex", textAlign: "center" }}>
                                <div style={{ minWidth: "30%", fontWeight: "bold" }}>Producto</div>
                                <div style={{ minWidth: "20%", fontWeight: "bold" }}>Cantidad</div>
                                <div style={{ minWidth: "20%", fontWeight: "bold" }}>Costo</div>
                                <div style={{ minWidth: "20%", fontWeight: "bold" }}>Total</div>
                                <div style={{ minWidth: "10%" }}></div>
                            </div>

                            {itemArray.map((obj, ind) => (
                                <div key={ind}
                                    style={{
                                        display: "flex",
                                        textAlign: "center",
                                        alignItems: "center",
                                        height: "2.5rem",
                                        margin: "0.3rem 0"
                                    }}>

                                    <div style={{ minWidth: "30%" }}>
                                        <Select
                                            options={productList.map(x => ({
                                                label: x.name,
                                                value: x.product_id
                                            }))}
                                            value={obj.product_id ?
                                                { label: obj.product_name, value: obj.product_id }
                                                : null}
                                            placeholder='Selecciona producto...'
                                            onChange={(val) => {
                                                let t = [...itemArray]
                                                t[ind].product_id = val.value
                                                t[ind].product_name = val.label
                                                t[ind].quantity = 1
                                                t[ind].rate = parseFloat(
                                                    productList.find(x => x.product_id === val.value).purchase_price
                                                )
                                                setItemArray(t)
                                            }}
                                            classNamePrefix="react-dropdown-dark"
                                        />
                                    </div>

                                    <div style={{ minWidth: "20%" }}>
                                        <input
                                            className='my_input'
                                            type="number"
                                            value={obj.quantity}
                                            onChange={(e) => {
                                                let t = [...itemArray]
                                                t[ind].quantity = Number(e.target.value)
                                                setItemArray(t)
                                            }}
                                        />
                                    </div>

                                    <div style={{ minWidth: "20%" }}>
                                        <input
                                            className='my_input'
                                            type="number"
                                            value={obj.rate}
                                            onChange={(e) => {
                                                let t = [...itemArray]
                                                t[ind].rate = Number(e.target.value)
                                                setItemArray(t)
                                            }}
                                        />
                                    </div>

                                    <div style={{ minWidth: "20%" }}>
                                        <p className='my_input'>
                                            {obj.quantity * obj.rate}
                                        </p>
                                    </div>

                                    <div style={{ minWidth: "10%" }}>
                                        {itemArray.length > 1 && (
                                            <button
                                                className='btn danger'
                                                onClick={() => {
                                                    let t = [...itemArray]
                                                    t.splice(ind, 1)
                                                    setItemArray(t)
                                                }}
                                            >X</button>
                                        )}
                                    </div>

                                </div>
                            ))}

                        </div>

                        <button
                            className='btn info'
                            style={{ maxWidth: "15%", margin: "0 15px" }}
                            onClick={() =>
                                setItemArray([
                                    ...itemArray,
                                    { product_id: null, product_name: null, quantity: 0, rate: 0 }
                                ])
                            }
                        >
                            Sumar +
                        </button>

                        <div style={{ margin: "0 15px" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <h3>Total general</h3>
                                <div style={{ width: "20%", marginLeft: "1rem" }}>
                                    <p className='my_input'>
                                        {itemArray.reduce((p, o) => p + (o.quantity * o.rate), 0)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            className='btn success'
                            style={{ alignSelf: "center" }}
                            onClick={insertPurchase}
                        >
                            Guardar Compra
                        </button>

                    </div>
                </div>

            </div>
        </div>
    )
}

export default PurchasesAddNew
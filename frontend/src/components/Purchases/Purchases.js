import React, { useEffect, useState } from 'react'
import { Link } from "react-router-dom"
import { Modal } from 'react-bootstrap';
import './Purchases.scss'
import Table from '../Table/Table'

import moment from 'moment'
import 'moment/locale/es';
import swal from 'sweetalert';
import Loader from '../PageStates/Loader';
import Error from '../PageStates/Error';

function Purchases() {

    const [pageState, setPageState] = useState(1)
    const [permission, setPermission] = useState(null)

    const [purchases, setPurchases] = useState([])
    const [purchaseCount, setPurchaseCount] = useState(0)

    const [searchInput, setSearchInput] = useState("")
    const [sortColumn, setSortColumn] = useState("")
    const [sortOrder, setSortOrder] = useState("")
    const [tablePage, setTablePage] = useState(1)
    const [data, setData] = useState([])

    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [filterFrom, setFilterFrom] = useState(null)
    const [filterTo, setFilterTo] = useState(null)

    const [viewModalShow, setViewModalShow] = useState(false)
    const [viewPurchaseDetails, setViewPurchaseDetails] = useState(null)

    useEffect(() => {
        const today = new Date().toISOString().split("T")[0]
        setDateFrom(today)
        setDateTo(today)
    }, [])

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
                            const p = body.permissions?.find(x => x.page === 'purchases');
                            if (p?.view && p?.create) {
                                setPermission(p)
                            } else {
                                window.location.href = '/unauthorized'
                            }
                        })
                } else {
                    window.location.href = '/login'
                }
            })
    }, [])

    const getPurchases = async (sv, sc, so, scv) => {
        const result = await fetch(
            `${process.env.REACT_APP_BACKEND_ORIGIN}/getPurchases`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    start_value: sv,
                    sort_column: sc,
                    sort_order: so,
                    search_value: scv,
                    date_from: filterFrom,
                    date_to: filterTo,
                }),
            }
        );

        const body = await result.json();

        if (body.operation === "success") {
            setPurchases(body.purchases);
            setPurchaseCount(body.purchases.length);
        } else {
            throw new Error("Error al obtener compras");
        }
    };

    useEffect(() => {
        if (permission) {
            getPurchases((tablePage - 1) * 10, sortColumn, sortOrder, searchInput)
                .then(() => setPageState(2))
                .catch(() => setPageState(3))
        }
    }, [permission, tablePage, sortColumn, sortOrder, searchInput])

    const deletePurchase = async (id) => {
        const result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/delete_purchase`, {
            method: 'POST',
            headers: { 'Content-type': 'application/json; charset=UTF-8' },
            credentials: 'include',
            body: JSON.stringify({ purchase_id: id })
        })

        const body = await result.json()
        if (body.operation === 'success') {
            getPurchases((tablePage - 1) * 10, sortColumn, sortOrder, searchInput)
            swal('Éxito', body.message, 'success')
        } else {
            swal('Error', 'Algo salió mal', 'error')
        }
    }

    useEffect(() => {
        if (purchases.length) {
            setData(purchases.map((p, i) => ({
                sl: i + 1,
                purchase_ref: p.purchase_ref,
                supplier_name: p.supplier_name,
                due_date: moment(p.due_date).format('D [de] MMMM, YYYY'),
                grand_total: p.grand_total,
                addedon: moment(p.timeStamp).format('D [de] MMMM, YYYY'),
                action: (
                    <>
                        <button className="btn warning" onClick={() => viewModalInit(p.purchase_id)}>Ver</button>
                        {permission.delete &&
                            <button className="btn danger ms-2"
                                onClick={() => {
                                    swal({
                                        title: "¿Eliminar compra?",
                                        icon: "warning",
                                        buttons: true,
                                        dangerMode: true,
                                    }).then(ok => ok && deletePurchase(p.purchase_id))
                                }}>
                                Eliminar
                            </button>}
                    </>
                )
            })))
        } else setData([])
    }, [purchases])

    const viewModalInit = (id) => {
        setViewPurchaseDetails(purchases.find(p => p.purchase_id === id))
        setViewModalShow(true)
    }

    return (
        <div className="purchases">
            <div className="purchase-header">

                <div className="title-row">
                    <div className="title">Compras</div>
                    <Link to="/compras/addnew" className="btn success">
                        Agregar nuevo
                    </Link>
                </div>

            </div>

            {pageState === 1 ? <Loader /> :
                pageState === 2 ?
                    <div className="card">
                        <div className="container">
                            <Table
                                headers={['N°', 'Ref.', 'Proveedor', 'Vence', 'Total', 'Fecha', 'Acción']}
                                columnOriginalNames={["purchase_ref", "supplier_name", "due_date", "grand_total", "timeStamp"]}
                                sortColumn={sortColumn}
                                setSortColumn={setSortColumn}
                                sortOrder={sortOrder}
                                setSortOrder={setSortOrder}
                                data={data}
                                data_count={purchaseCount}
                                searchInput={searchInput}
                                setSearchInput={setSearchInput}
                                current_page={tablePage}
                                tablePageChangeFunc={setTablePage}
                            />
                        </div>
                    </div>
                    : <Error />}
        </div>
    )
}

export default Purchases
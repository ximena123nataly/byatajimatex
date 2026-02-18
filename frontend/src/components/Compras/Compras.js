import React, { useEffect, useState } from 'react'
import { Link } from "react-router-dom"
import moment from 'moment'
import 'moment/locale/es'
import Table from '../Table/Table'
import './Compras.scss'

//estados principales
const Compras = () => {

    const [compras, setCompras] = useState([]);
    const [loading, setLoading] = useState([]);

    const [fechaInicio, setFechaInicio] = useState('')
    const [fechaFin, setFechaFin] = useState('')

    //función para traer compras
    const getCompras = async () => {
        setLoading(true)
        try {
            const res = await fetch('http://localhost:5000/compras', {
                credentials: "include"
            })

            const data = await res.json()
            setCompras(data)
        } catch (error) {
            console.error(error)
        }
        setLoading(false)
    }

    //useEffect inicial
    useEffect(() => {
        getCompras()
    }, [])

    //columnas de la tabla
    const headers = [
        'Fecha',
        'Proveedor',
        'Descripción',
        'Total',
        'Pagado',
        'Saldo',
        'Método'
    ];

    const columnOriginalNames = [
        'fecha',
        'proveedor',
        'descripcion',
        'total',
        'pagado',
        'saldo',
        'metodo_pago'
    ];


    //render
    return (
        <div className="compras">

            <div className="compras-header">
                <h2>Compras</h2>

                <Link to="/compras/add">
                    <button className="btn btn-primary">
                        + Nueva Compra
                    </button>
                </Link>
            </div>

            <Table
                columns={columnas}
                data={compras}
                loading={loading}
            />

        </div>
    )
}

export default Compras

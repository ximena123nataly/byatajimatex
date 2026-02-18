import React, { useEffect, useState } from 'react'
import { Link } from "react-router-dom"
import Table from '../Table/Table'
import './Compras.scss'

const Compras = () => {

    const [compras, setCompras] = useState([]);
    const [loading, setLoading] = useState(false);

    const [searchInput, setSearchInput] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [dataCount, setDataCount] = useState(0);
    const [sortColumn, setSortColumn] = useState("");
    const [sortOrder, setSortOrder] = useState("");

    // traer compras
    const getCompras = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/compras', {
                credentials: "include"
            });

            const data = await res.json();

            setCompras(Array.isArray(data) ? data : []);
            setDataCount(Array.isArray(data) ? data.length : 0);

        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    useEffect(() => {
        getCompras();
    }, []);

    const headers = [
        'Fecha',
        'Proveedor',
        'Descripción',
        'Total',
        'Pagado',
        'Saldo',
        'Método de pago'
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

    return (
        <div className="compras">

            <div className="compras-header">
                <h2 className="title">Compras</h2>

                <Link to="/compras/addnew">

                    <button className="btn success">
                        Agregar nuevo
                    </button>
                </Link>
            </div>

            <div className="card">
                <div className="container">

                    <Table
                        headers={headers}
                        columnOriginalNames={columnOriginalNames}
                        data={compras}
                        searchInput={searchInput}
                        setSearchInput={setSearchInput}
                        current_page={currentPage}
                        data_count={dataCount}
                        tablePageChangeFunc={setCurrentPage}
                        sortColumn={sortColumn}
                        setSortColumn={setSortColumn}
                        sortOrder={sortOrder}
                        setSortOrder={setSortOrder}
                    />

                </div>
            </div>

        </div>
    );
};

export default Compras;

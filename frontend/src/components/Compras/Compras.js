import React, { useEffect, useState } from 'react'
import { Link } from "react-router-dom"
import Table from '../Table/Table'
import './Compras.scss'
import moment from "moment";
import "moment/locale/es";

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

            const comprasFormateadas = Array.isArray(data)
                ? data.map(item => ({
                    ...item,
                    fecha: item.fecha
                        ? moment(item.fecha).format("DD/MM/YYYY")
                        : "-",
                    
                }))
                : [];

            setCompras(comprasFormateadas);
            

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
        'ID',
        'Fecha',
        'Proveedor',
        'Método de pago',
        'Referencia',
        'Total'
    ];



    const columnOriginalNames = [
        'id',
        'fecha',
        'proveedor',
        'metodo_pago',
        'referencia',
        'total'
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

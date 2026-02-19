import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ComprasAddNew.scss";

const ComprasAddNew = () => {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        proveedor: "",
        descripcion: "",
        total: "",
        pagado: "",
        metodo_pago: "",
        referencia: "",
        fecha: ""
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const saldoCalculado =
            parseFloat(formData.total || 0) -
            parseFloat(formData.pagado || 0);

        const fechaHoraActual = new Date().toISOString();


        const dataToSend = {
            ...formData,
            saldo: saldoCalculado,
            fecha: fechaHoraActual
        };


        try {
            const res = await fetch("http://localhost:5000/compras", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(dataToSend)
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error(errorData);
                alert("Error al guardar");
                return;
            }

            navigate("/compras");

        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="compras-add">

            <div className="compras-add-header">
                <h2 className="title">Nueva Compra</h2>
            </div>

            <div className="card">
                <div className="container">

                    <form onSubmit={handleSubmit} className="form">

                        <div className="form-group">
                            <label>Fecha</label>
                            <input
                                type="date"
                                name="fecha"
                                value={formData.fecha}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Proveedor</label>
                            <input
                                type="text"
                                name="proveedor"
                                value={formData.proveedor}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Descripción</label>
                            <input
                                type="text"
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Total</label>
                            <input
                                type="number"
                                step="0.01"
                                name="total"
                                value={formData.total}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Pagado</label>
                            <input
                                type="number"
                                step="0.01"
                                name="pagado"
                                value={formData.pagado}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Método de pago</label>
                            <input
                                type="text"
                                name="metodo_pago"
                                value={formData.metodo_pago}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Referencia</label>
                            <input
                                type="text"
                                name="referencia"
                                value={formData.referencia}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Saldo</label>
                            <input
                                type="number"
                                value={
                                    (formData.total || 0) -
                                    (formData.pagado || 0)
                                }
                                disabled
                            />
                        </div>

                        <div className="form-buttons">
                            <button type="submit" className="btn success">
                                Guardar
                            </button>

                            <button
                                type="button"
                                className="btn danger"
                                onClick={() => navigate("/compras")}
                            >
                                Cancelar
                            </button>
                        </div>

                    </form>

                </div>
            </div>

        </div>
    );
};

export default ComprasAddNew;

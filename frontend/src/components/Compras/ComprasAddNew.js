import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ComprasAddNew.scss";

const ComprasAddNew = () => {

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    referencia: "",
    proveedor: "",
    metodo_pago: "",
    fecha: ""
  });

  const [productos, setProductos] = useState([
    { descripcion: "", cantidad: 0, precio: 0 }
  ]);

  // actualizar datos principales
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // actualizar productos
  const handleProductoChange = (index, e) => {
    const newProductos = [...productos];
    newProductos[index][e.target.name] = e.target.value;
    setProductos(newProductos);
  };

  // agregar producto
  const addProducto = () => {
    setProductos([
      ...productos,
      { descripcion: "", cantidad: 0, precio: 0 }
    ]);
  };

  // eliminar producto
  const removeProducto = (index) => {
    const newProductos = productos.filter((_, i) => i !== index);
    setProductos(newProductos);
  };

  // total general
  const totalGeneral = productos.reduce(
    (acc, item) => acc + item.cantidad * item.precio,
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const horaActual = new Date().toTimeString().slice(0, 8);

    const dataToSend = {
      ...formData,
      hora: horaActual,
      productos
    };

    try {
      const res = await fetch("http://localhost:5000/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend)
      });

      if (!res.ok) {
        alert("Error al guardar");
        return;
      }

      navigate("/compras");

    } catch (error) {
      console.error(error);
    }
  };

  return (
  <div className="orderaddnew">

    <div className="order-header">
      <h2 className="title">Nueva Compra</h2>
    </div>

    <div className="card">
      <div className="container">

        <form onSubmit={handleSubmit}>

          {/* PARTE SUPERIOR */}
          <div className="top-form">
            <input
              type="text"
              name="referencia"
              placeholder="Referencia o celular"
              onChange={handleChange}
            />

            <input
              type="text"
              name="proveedor"
              placeholder="Proveedor"
              onChange={handleChange}
            />

            <input
              type="text"
              name="metodo_pago"
              placeholder="Método de pago"
              onChange={handleChange}
            />

            <input
              type="date"
              name="fecha"
              onChange={handleChange}
              required
            />
          </div>

          <h3 style={{ marginTop: "20px" }}>Productos</h3>

          <div className="productos-header">
            <span>Descripción</span>
            <span>Cantidad</span>
            <span>Precio</span>
            <span>Total</span>
          </div>

          {productos.map((producto, index) => (
            <div className="producto-row" key={index}>
              <input
                type="text"
                name="descripcion"
                value={producto.descripcion}
                onChange={(e) => handleProductoChange(index, e)}
              />

              <input
                type="number"
                name="cantidad"
                value={producto.cantidad}
                onChange={(e) => handleProductoChange(index, e)}
              />

              <input
                type="number"
                name="precio"
                value={producto.precio}
                onChange={(e) => handleProductoChange(index, e)}
              />

              <input
                type="number"
                value={producto.cantidad * producto.precio}
                disabled
              />

              <button
                type="button"
                className="btn danger"
                onClick={() => removeProducto(index)}
              >
                X
              </button>
            </div>
          ))}

          <button
            type="button"
            className="btn info"
            onClick={addProducto}
            style={{ marginTop: "10px" }}
          >
            + Agregar producto
          </button>

          <div style={{ marginTop: "30px" }}>
            <h3>Total general: {totalGeneral.toFixed(2)}</h3>
          </div>

          <div style={{ marginTop: "20px" }}>
            <button type="submit" className="btn success">
              Guardar
            </button>

            <button
              type="button"
              className="btn danger"
              style={{ marginLeft: "10px" }}
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

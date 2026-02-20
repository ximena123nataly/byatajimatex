import React from "react";
import { Link } from "react-router-dom";
import "./Purchases.scss";

const Purchases = () => {
  return (
    <div className="purchases">
      <div className="purchase-header">
        <h2 className="title">Compras</h2>
        <Link to="/purchases/addnew">
          <button className="btn success">+ Nueva Compra</button>
        </Link>
      </div>

      <div className="card">
        <div className="container">
          <p>Aquí irá la tabla de compras.</p>
        </div>
      </div>
    </div>
  );
};

export default Purchases;
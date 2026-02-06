import React, { useEffect, useState } from "react";
import "./Caja.scss";
import CajaTransacciones from "./CajaTransacciones";

function Caja() {
  const [caja, setCaja] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [transacciones, setTransacciones] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);

  const backend = process.env.REACT_APP_BACKEND_ORIGIN;

  const cargarCaja = async () => {
    setLoading(true);
    setLoadingTx(true);
    setMsg("");

    try {
      // 1) Traer caja
      const res = await fetch(`${backend}/api/caja/get_caja`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!data?.ok) {
        setCaja(null);
        setTransacciones([]);
        setMsg(data?.msg || "No se pudo cargar la caja");
        setLoading(false);
        setLoadingTx(false);
        return;
      }

      setCaja(data.caja);

      // 2) Traer transacciones
      const res2 = await fetch(`${backend}/api/caja/get_transacciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      const data2 = await res2.json();

      if (data2?.ok) {
        setTransacciones(data2.transacciones || []);
      } else {
        setTransacciones([]);
      }

    } catch (e) {
      setCaja(null);
      setTransacciones([]);
      setMsg("Error de conexión con el backend (Failed to fetch)");
    } finally {
      setLoading(false);
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    cargarCaja();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saldoNum = Number(caja?.saldo ?? 0);
  const saldoClass =
    saldoNum > 0 ? "saldo-positivo" : saldoNum < 0 ? "saldo-negativo" : "";

  return (
    <div className="caja-container">
      {/* TARJETA CAJA */}
      <div className="caja-card">
        <div className="caja-header">
          <h2>CAJA</h2>
          <button className="btn-refrescar" onClick={cargarCaja} disabled={loading}>
            {loading ? "..." : "Refrescar"}
          </button>
        </div>

        {loading ? (
          <p className="muted">Cargando...</p>
        ) : caja ? (
          <>
            <div className="row">
              <span>ID Caja:</span>
              <b>{caja.id_caja}</b>
            </div>

            <div className="row">
              <span>ID Usuario:</span>
              <b>{caja.id_usuario}</b>
            </div>

            <div className="row">
              <span>Nombre:</span>
              <b>{caja.nombre_caja}</b>
            </div>

            <div className="row saldo">
              <span>Saldo:</span>
              <b className={saldoClass}>Bs {saldoNum.toFixed(2)}</b>
            </div>
          </>
        ) : (
          <p className="muted">No hay caja.</p>
        )}

        {msg ? <div className="msg-error">{msg}</div> : null}
      </div>

      {/* TABLA TRANSACCIONES */}
      <CajaTransacciones transacciones={transacciones} loading={loadingTx} />
    </div>
  );
}

export default Caja;

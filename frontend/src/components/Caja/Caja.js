import React, { useEffect, useState } from "react";
import "./Caja.scss";

function Caja() {
  const [caja, setCaja] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const backend = process.env.REACT_APP_BACKEND_ORIGIN;

  const cargarCaja = async () => {
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${backend}/api/caja/get_caja`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!data?.ok) {
        setCaja(null);
        setMsg(data?.msg || "No se pudo cargar la caja");
      } else {
        setCaja(data.caja);
      }
    } catch (e) {
      setCaja(null);
      setMsg("Error de conexión con el backend (Failed to fetch)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCaja();
    
  }, []);

  const saldoNum = Number(caja?.saldo ?? 0);
  const saldoClass =
    saldoNum > 0 ? "saldo-positivo" : saldoNum < 0 ? "saldo-negativo" : "";

  return (
    <div className="caja-container">
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
    </div>
  );
}

export default Caja;

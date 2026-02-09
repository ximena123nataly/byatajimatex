import React, { useEffect, useState } from "react";
import "./Caja.scss";
import CajaTransacciones from "./CajaTransacciones";

function Caja() {
  const backend = process.env.REACT_APP_BACKEND_ORIGIN;

  const [caja, setCaja] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [transacciones, setTransacciones] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);

  // ✅ Admin: panel ver cajas
  const [isAdmin, setIsAdmin] = useState(false);
  const [cajas, setCajas] = useState([]);
  const [selectedCajaId, setSelectedCajaId] = useState("");

  // =============================
  // EMPLEADO: caja propia
  // =============================
  const cargarCajaMia = async () => {
    setLoading(true);
    setLoadingTx(true);
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
        setTransacciones([]);
        setMsg(data?.msg || "No se pudo cargar la caja");
        return;
      }

      setCaja(data.caja);

      const res2 = await fetch(`${backend}/api/caja/get_transacciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      const data2 = await res2.json();

      if (data2?.ok) setTransacciones(data2.transacciones || []);
      else setTransacciones([]);
    } catch (e) {
      setCaja(null);
      setTransacciones([]);
      setMsg("Error de conexión con el backend (Failed to fetch)");
    } finally {
      setLoading(false);
      setLoadingTx(false);
    }
  };

  // =============================
  // ADMIN: cargar lista de cajas
  // =============================
  const cargarCajasAdmin = async () => {
    try {
      const res = await fetch(`${backend}/api/caja/get_cajas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (data?.ok) {
        const list = data.cajas || [];
        setIsAdmin(true);
        setCajas(list);

        if (!selectedCajaId && list.length > 0) {
          setSelectedCajaId(String(list[0].id_caja));
        }

        return true;
      }

      setIsAdmin(false);
      setCajas([]);
      return false;
    } catch (e) {
      setIsAdmin(false);
      setCajas([]);
      return false;
    }
  };

  // =============================
  // ADMIN: cargar caja por id
  // =============================
  const cargarCajaPorId = async (id_caja) => {
    if (!id_caja) return;

    setLoading(true);
    setLoadingTx(true);
    setMsg("");

    try {
      const res = await fetch(`${backend}/api/caja/get_caja_by_id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id_caja }),
      });

      const data = await res.json();

      if (!data?.ok) {
        setCaja(null);
        setTransacciones([]);
        setMsg(data?.msg || "No se pudo cargar la caja");
        return;
      }

      setCaja(data.caja);

      const res2 = await fetch(`${backend}/api/caja/get_transacciones_by_caja`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id_caja }),
      });

      const data2 = await res2.json();

      if (data2?.ok) setTransacciones(data2.transacciones || []);
      else setTransacciones([]);
    } catch (e) {
      setCaja(null);
      setTransacciones([]);
      setMsg("Error de conexión con el backend (Failed to fetch)");
    } finally {
      setLoading(false);
      setLoadingTx(false);
    }
  };

  // =============================
  // refrescar
  // =============================
  const refrescar = async () => {
    if (isAdmin) {
      await cargarCajasAdmin();
      if (selectedCajaId) await cargarCajaPorId(selectedCajaId);
      return;
    }
    await cargarCajaMia();
  };

  // =============================
  // init
  // =============================
  useEffect(() => {
    (async () => {
      const esAdmin = await cargarCajasAdmin();
      if (!esAdmin) {
        await cargarCajaMia();
      }
    })();

    const handler = () => refrescar();
    window.addEventListener("caja_actualizada", handler);

    return () => window.removeEventListener("caja_actualizada", handler);
    // eslint-disable-next-line
  }, []);

  // admin cambia caja
  useEffect(() => {
    if (isAdmin && selectedCajaId) {
      cargarCajaPorId(selectedCajaId);
    }
    // eslint-disable-next-line
  }, [selectedCajaId, isAdmin]);

  const saldoNum = Number(caja?.saldo ?? 0);
  const saldoClass =
    saldoNum > 0 ? "saldo-positivo" : saldoNum < 0 ? "saldo-negativo" : "";

  return (
    <div style={{ overflowY: "auto", height: "calc(100vh - 80px)" }}>
      <div className="caja-container" style={{ display: "flex", gap: "18px", flexWrap: "wrap", alignItems: "flex-start" }}>

        {/* IZQUIERDA: CAJA */}
        <div className="caja-card">
          <div className="caja-header">
            <h2>CAJA</h2>

            <button className="btn-refrescar" onClick={refrescar} disabled={loading}>
              {loading ? "..." : "Refrescar"}
            </button>
          </div>

          {loading ? (
            <p className="muted">Cargando...</p>
          ) : caja ? (
            <>
              <div className="row"><span>ID Caja:</span><b>{caja.id_caja}</b></div>
              <div className="row"><span>ID Usuario:</span><b>{caja.id_usuario}</b></div>
              <div className="row"><span>Nombre:</span><b>{caja.nombre_caja}</b></div>
              <div className="row saldo">
                <span>Saldo:</span>
                <b className={saldoClass}>Bs {saldoNum.toFixed(2)}</b>
              </div>
            </>
          ) : (
            <p className="muted">No hay caja.</p>
          )}

          {msg && <div className="msg-error">{msg}</div>}
        </div>

        {/* DERECHA: PANEL VER CAJAS (ADMIN) */}
        {isAdmin && (
          <div
            className="caja-card"
            style={{
              width: "420px",
              minHeight: "230px",
              border: "3px solid #111",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: "12px" }}>Ver cajas</div>

            <label className="fw-bold" style={{ display: "block", marginBottom: "6px" }}>
              Selecciona usuario/caja
            </label>

            <select
              className="my_form_control"
              value={selectedCajaId}
              onChange={(e) => setSelectedCajaId(e.target.value)}
            >
              {cajas.map((c) => (
                <option key={c.id_caja} value={String(c.id_caja)}>
                  {c.usuario_nombre ? `${c.usuario_nombre} (${c.id_usuario})` : c.id_usuario} - Caja #{c.id_caja}
                </option>
              ))}
            </select>

            <div style={{ marginTop: "10px", fontSize: "13px", color: "#666" }}>
              Al cambiar la caja se actualiza la tarjeta y los movimientos.
            </div>
          </div>
        )}

        {/* ABAJO: MOVIMIENTOS */}
        <div style={{ width: "100%" }}>
          <CajaTransacciones transacciones={transacciones} loading={loadingTx} />
        </div>
      </div>
    </div>
  );
}

export default Caja;

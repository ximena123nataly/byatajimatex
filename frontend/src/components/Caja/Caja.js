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

  const [isAdmin, setIsAdmin] = useState(false);
  const [cajas, setCajas] = useState([]);
  const [selectedCajaId, setSelectedCajaId] = useState("");

  // TRASPASO DE SALDO
  const [showTraspaso, setShowTraspaso] = useState(false);
  const [usuariosDestino, setUsuariosDestino] = useState([]);
  const [destino, setDestino] = useState("");
  const [montoTraspaso, setMontoTraspaso] = useState("");
  const [loadingTraspaso, setLoadingTraspaso] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "ok", text: "" });

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 2500);
  };

  // EMPLEADO: caja propia
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

  // ADMIN: cargar lista de cajas
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

  // ADMIN: cargar caja por id
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

  const refrescar = async () => {
    if (isAdmin) {
      await cargarCajasAdmin();
      if (selectedCajaId) await cargarCajaPorId(selectedCajaId);
      return;
    }
    await cargarCajaMia();
  };

  // TRASPASO: cargar destinos
  const cargarDestinosTraspaso = async () => {
    try {
      const res = await fetch(`${backend}/api/caja/get_destinos_traspaso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (data?.ok) {
        setUsuariosDestino(data.usuarios || []);
      } else {
        setUsuariosDestino([]);
        showToast("err", data?.msg || "No se pudieron cargar los usuarios");
      }
    } catch (e) {
      console.log(e);
      setUsuariosDestino([]);
      showToast("err", "Error cargando usuarios destino");
    }
  };

  // TRASPASO: abrir confirmación
  const abrirConfirmacionTraspaso = () => {
    if (!destino) return showToast("err", "Selecciona un destino");

    const montoNum = Number(montoTraspaso);
    if (!montoTraspaso || isNaN(montoNum) || montoNum <= 0) {
      return showToast("err", "Monto inválido");
    }

    setShowConfirm(true);
  };

  // TRASPASO: confirmar
  const confirmarTraspaso = async () => {
    const montoNum = Number(montoTraspaso);
    setLoadingTraspaso(true);

    try {
      const res = await fetch(`${backend}/api/caja/traspaso_saldo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id_usuario_destino: destino,
          monto: montoNum,
        }),
      });

      const data = await res.json();

      if (!data?.ok) {
        showToast("err", data?.msg || "Error en traspaso");
        return;
      }

      showToast("ok", "Traspaso realizado");

      setShowConfirm(false);
      setShowTraspaso(false);
      setDestino("");
      setMontoTraspaso("");

      await refrescar();
      window.dispatchEvent(new Event("caja_actualizada"));
    } catch (e) {
      showToast("err", "Error de conexión (Failed to fetch)");
    } finally {
      setLoadingTraspaso(false);
    }
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAdmin && selectedCajaId) {
      cargarCajaPorId(selectedCajaId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCajaId, isAdmin]);

  const saldoNum = Number(caja?.saldo ?? 0);
  const saldoClass =
    saldoNum > 0 ? "saldo-positivo" : saldoNum < 0 ? "saldo-negativo" : "";

  return (
    <div style={{ overflowY: "auto", height: "calc(100vh - 80px)" }}>
      {/* ✅ BORDE tipo Productos */}
      <div className="card">
        <div className="container">
          <div
            className="caja-container"
            style={{
              display: "flex",
              gap: "18px",
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
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

                  <button
                    className="btn-traspaso"
                    onClick={async () => {
                      await cargarDestinosTraspaso();
                      setShowTraspaso(true);
                    }}
                    disabled={loading}
                  >
                    TRASPASAR SALDO
                  </button>
                </>
              ) : (
                <p className="muted">No hay caja.</p>
              )}

              {msg && <div className="msg-error">{msg}</div>}
            </div>

            {isAdmin && (
              <div
                className="caja-card"
                style={{ width: "420px", minHeight: "230px", border: "3px solid #111" }}
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
                      {c.usuario_nombre || "Usuario"} - Caja #{c.id_caja}
                    </option>
                  ))}
                </select>

                <div style={{ marginTop: "10px", fontSize: "13px", color: "#666" }}>
                  Al cambiar la caja se actualiza la tarjeta y los movimientos.
                </div>
              </div>
            )}

            <div style={{ width: "100%" }}>
              <CajaTransacciones transacciones={transacciones} loading={loadingTx} />
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          MODAL TRASPASO
      ========================= */}
      {showTraspaso && (
        <div className="caja-modal-backdrop">
          <div className="caja-modal-box">
            <h3 style={{ marginTop: 0 }}>Traspasar saldo</h3>

            <div className="caja-modal-grid">
              <div>
                <label>Destino</label>
                <select
                  className="my_form_control"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                >
                  <option value="">Seleccionar usuario</option>
                  {usuariosDestino.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.user_name} - Caja #{u.id_caja}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Monto</label>
                <input
                  className="my_form_control"
                  type="number"
                  value={montoTraspaso}
                  onChange={(e) => setMontoTraspaso(e.target.value)}
                  placeholder="Monto a traspasar"
                />
              </div>
            </div>

            <div className="caja-modal-actions">
              <button
                onClick={() => {
                  setShowTraspaso(false);
                  setShowConfirm(false);
                }}
                disabled={loadingTraspaso}
              >
                Cancelar
              </button>

              <button onClick={abrirConfirmacionTraspaso} disabled={loadingTraspaso}>
                {loadingTraspaso ? "..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="caja-modal-backdrop">
          <div className="caja-modal-box">
            <h3 style={{ marginTop: 0 }}>Confirmar traspaso</h3>

            <p style={{ margin: "10px 0", color: "#333" }}>
              ¿Seguro que quieres traspasar{" "}
              <b>Bs {Number(montoTraspaso || 0).toFixed(2)}</b>?
            </p>

            <div className="caja-modal-actions">
              <button onClick={() => setShowConfirm(false)} disabled={loadingTraspaso}>
                Cancelar
              </button>

              <button onClick={confirmarTraspaso} disabled={loadingTraspaso}>
                {loadingTraspaso ? "..." : "Sí, traspasar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`toast-msg ${toast.type === "ok" ? "toast-ok" : "toast-err"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

export default Caja;

import React, { useState } from "react";

/** =========================
 * Helpers
 * ========================= */
const fmtFecha = (v) => {
  if (!v) return "-";

  if (typeof v === "string") {
    const fecha = v.split("T")[0];
    const [y, m, d] = fecha.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
    return v;
  }

  return "-";
};

const fmtHora = (v) => {
  if (!v) return "-";
  if (typeof v === "string" && v.includes(":")) return v;
  const d = new Date(v);
  return d.toLocaleTimeString("es-BO", { hour12: false });
};

const safeJson = (v) => {
  try {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    return JSON.parse(v);
  } catch {
    return [];
  }
};

/** =========================
 * Component
 * ========================= */
export default function CajaTransacciones({ transacciones, loading }) {
  const [show, setShow] = useState(false);

  const [mov, setMov] = useState(null);
  const [tipoDetalle, setTipoDetalle] = useState("");
  const [detalle, setDetalle] = useState(null);

  const [loadingDet, setLoadingDet] = useState(false);
  const [errDet, setErrDet] = useState("");

  const abrir = () => setShow(true);
  const cerrar = () => {
    setShow(false);
    setMov(null);
    setTipoDetalle("");
    setDetalle(null);
    setLoadingDet(false);
    setErrDet("");
  };

  const verDetalle = async (id_transaccion) => {
    setLoadingDet(true);
    setErrDet("");
    setMov(null);
    setTipoDetalle("");
    setDetalle(null);
    abrir();

    try {
      const r = await fetch(
        `${process.env.REACT_APP_BACKEND_ORIGIN}/api/caja/get_movimiento_detalle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id_transaccion }),
        }
      );

      const b = await r.json();

      if (!b.ok) {
        setErrDet(b.msg || "No se pudo cargar el detalle");
      } else {
        setMov(b.mov);
        setTipoDetalle(b.tipo_detalle || "");
        setDetalle(b.detalle);
      }
    } catch (e) {
      setErrDet("Error de conexión al servidor");
    } finally {
      setLoadingDet(false);
    }
  };

  /** =========================
   * Render Detalle
   * ========================= */
  const renderGeneral = () => {
    if (!mov) return null;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: 12,
        }}
      >
        <div>
          <b>Tipo:</b>{" "}
          <span
            className={`badge ${mov.tipo === "INGRESO" ? "badge-in" : "badge-out"
              }`}
          >
            {mov.tipo}
          </span>
        </div>

        <div>
          <b>Origen:</b> {mov.origen}
        </div>

        <div>
          <b>Monto:</b> Bs {Number(mov.monto || 0).toFixed(2)}
        </div>

        <div>
          <b>Referencia:</b> {mov.nro_registro || "-"}
        </div>

        <div>
          <b>Fecha:</b> {fmtFecha(mov.fecha)}
        </div>

        <div>
          <b>Hora:</b> {fmtHora(mov.hora)}
        </div>

        <div>
          <b>Caja:</b> #{mov.id_caja}
        </div>

        <div>
          <b>Usuario:</b> {mov.id_usuario}
        </div>
      </div>
    );
  };

  const renderDetalle = () => {
    if (loadingDet) return <p className="muted">Cargando detalle...</p>;
    if (errDet) return <p style={{ color: "red" }}>{errDet}</p>;
    if (!mov) return null;

    // Siempre mostramos info general arriba
    const general = renderGeneral();

    /** ===== TRASPASO ===== */
    if (tipoDetalle === "TRASPASO") {
      const arr = Array.isArray(detalle) ? detalle : [];
      const eg = arr.find((x) => x.tipo === "EGRESO");
      const ing = arr.find((x) => x.tipo === "INGRESO");

      return (
        <>
          {general}
          <hr />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}>
              <h4 style={{ marginTop: 0 }}>Origen (Sale)</h4>
              <div>
                <b>Usuario:</b> {eg?.user_name || eg?.id_usuario || "-"}
              </div>
              <div>
                <b>Caja:</b> #{eg?.id_caja || "-"}
              </div>
              <div>
                <b>Monto:</b> Bs {Number(eg?.monto || 0).toFixed(2)}
              </div>
            </div>

            <div style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}>
              <h4 style={{ marginTop: 0 }}>Destino (Entra)</h4>
              <div>
                <b>Usuario:</b> {ing?.user_name || ing?.id_usuario || "-"}
              </div>
              <div>
                <b>Caja:</b> #{ing?.id_caja || "-"}
              </div>
              <div>
                <b>Monto:</b> Bs {Number(ing?.monto || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </>
      );
    }

    /** ===== PROFORMA ===== */
    if (tipoDetalle === "PROFORMA") {
      if (!detalle)
        return (
          <>
            {general}
            <p className="muted">No se encontró detalle de proforma.</p>
          </>
        );

      const items = safeJson(detalle.items);

      return (
        <>
          {general}
          <hr />
          <h4>Detalle de Proforma</h4>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <b>Proforma:</b> {detalle.proforma_id || detalle.id || "-"}
            </div>
            <div>
              <b>Estado:</b> {detalle.estado || "-"}
            </div>
            <div>
              <b>Cliente:</b> {detalle.cliente || "-"}
            </div>
            <div>
              <b>Celular:</b> {detalle.celular || "-"}
            </div>
            <div>
              <b>Total:</b> {detalle.total_general ?? detalle.total ?? "-"}
            </div>
            <div>
              <b>Anticipo:</b> {detalle.anticipo ?? "-"}
            </div>
            <div>
              <b>Saldo:</b> {detalle.saldo ?? "-"}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <table className="tabla-caja" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cant.</th>
                  <th>Detalle</th>
                  <th>Precio</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{it.cantidad ?? it.quantity ?? "-"}</td>
                    <td>{it.detalle ?? it.product_name ?? "-"}</td>
                    <td>{it.precio_unitario ?? it.rate ?? "-"}</td>
                    <td>{it.total ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    /** ===== VENTA ===== */
    if (tipoDetalle === "VENTA") {
      if (!detalle)
        return (
          <>
            {general}
            <p className="muted">No se encontró detalle de la venta.</p>
          </>
        );

      const items = safeJson(detalle.items);

      return (
        <>
          {general}
          <hr />
          <h4>Detalle de Venta</h4>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <b>Ref:</b> {detalle.order_ref || detalle.order_id || "-"}
            </div>
            <div>
              <b>Total:</b> {detalle.grand_total ?? "-"}
            </div>
            <div>
              <b>Cliente:</b> {detalle.customer_name || detalle.customer_id || "-"}
            </div>
            <div>
              <b>Fecha:</b> {fmtFecha(detalle.timeStamp)}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <table className="tabla-caja" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Precio</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{it.product_name || it.detalle || "-"}</td>
                    <td>{it.quantity || it.cantidad || "-"}</td>
                    <td>{it.rate || it.precio_unitario || "-"}</td>
                    <td>{(Number(it.quantity || 0) * Number(it.rate || 0)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    /** ===== GASTO ===== */
    if (tipoDetalle === "GASTO") {
      if (!detalle)
        return (
          <>
            {general}
            <p className="muted">No se encontró detalle del gasto.</p>
          </>
        );

      return (
        <>
          {general}
          <hr />
          <h4>Detalle de Gasto</h4>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <b>Ref:</b> {detalle.expense_ref || detalle.expense_id || "-"}
            </div>
            <div>
              <b>Total:</b> {detalle.grand_total ?? detalle.total ?? "-"}
            </div>
            <div>
              <b>Proveedor:</b> {detalle.supplier_name || detalle.supplier_id || "-"}
            </div>
            <div>
              <b>Fecha:</b> {fmtFecha(detalle.timeStamp)}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <b>Descripción:</b> {detalle.description || detalle.expense_description || "-"}
            </div>
          </div>
        </>
      );
    }

    /** ===== Default ===== */
    return (
      <>
        {general}
        <p className="muted">Sin detalle extra para este movimiento.</p>
      </>
    );
  };

  return (
    <div className="caja-card caja-tx-card">
      <div className="caja-tx-header">
        <h3>Movimientos</h3>
      </div>

      {loading ? (
        <p className="muted">Cargando movimientos...</p>
      ) : !transacciones || transacciones.length === 0 ? (
        <p className="muted">Aún no hay movimientos.</p>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla-caja">
            <thead>
              <tr>
                <th>ID_TRANSACCION</th>
                <th>ID_USUARIO</th>
                <th>ID_CAJA</th>
                <th>TIPO</th>
                <th>ORIGEN</th>
                <th>NRO_REGISTRO</th>
                <th>MONTO</th>
                <th>FECHA</th>
                <th>HORA</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>

            <tbody>
              {transacciones.map((t) => (
                <tr key={t.id_transaccion}>
                  <td>{t.id_transaccion}</td>
                  <td>{t.id_usuario}</td>
                  <td>{t.id_caja}</td>

                  <td>
                    <span
                      className={`badge ${t.tipo === "INGRESO" ? "badge-in" : "badge-out"
                        }`}
                    >
                      {t.tipo}
                    </span>
                  </td>

                  <td>{t.origen}</td>
                  <td>{t.nro_registro || "-"}</td>
                  <td>Bs {Number(t.monto || 0).toFixed(2)}</td>
                  <td>{fmtFecha(t.fecha)}</td>
                  <td>{fmtHora(t.hora)}</td>

                  <td>
                    <button
                      className="btn-ver"
                      onClick={() => verDetalle(t.id_transaccion)}
                    >
                      Ver
                    </button>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {show && (
        <div
          className="caja-modal-backdrop"
          onClick={cerrar}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            className="caja-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "920px",
              maxWidth: "95vw",
              maxHeight: "90vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Detalle del movimiento</h3>
              <button className="btn btn-outline-danger" onClick={cerrar}>
                X
              </button>
            </div>

            <div style={{ marginTop: 12 }}>{renderDetalle()}</div>
          </div>
        </div>
      )}
    </div>
  );
}

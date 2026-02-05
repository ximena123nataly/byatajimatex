import React, { useEffect, useState } from "react";
import "./Caja.scss";
import CajaTransacciones from "./CajaTransacciones";

const API = process.env.REACT_APP_BACKEND_ORIGIN || "http://localhost:5000";

export default function Caja() {
  const [idCaja] = useState(1); // por ahora fijo Caja 1

  const [caja, setCaja] = useState(null);
  const [transacciones, setTransacciones] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [tipo, setTipo] = useState("INGRESO");
  const [monto, setMonto] = useState("");
  const [nroRegistro, setNroRegistro] = useState("");

  const [userId, setUserId] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    setMsg("");

    try {
      //  0) user_id logueado (lo pedimos aquí dentro del try para que no reviente si falla)
      const rt = await fetch(`${API}/verifiy_token`, {
        method: "POST",
        credentials: "include",
      });
      const jt = await rt.json();

      if (jt?.operation === "success") {
        setUserId(jt?.user_id || jt?.id_usuario || jt?.id || null);
      } else {
        setUserId(null);
      }

      //  1) Caja
      const r1 = await fetch(`${API}/api/caja/get_caja`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id_caja: idCaja }),
      });

      const j1 = await r1.json();
      if (!j1.ok) throw new Error(j1.msg || "Error cargando caja");
      setCaja(j1.caja);

      //  2) Transacciones
      const r2 = await fetch(`${API}/api/caja/get_transacciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id_caja: idCaja }),
      });

      const j2 = await r2.json();
      if (!j2.ok) throw new Error(j2.msg || "Error cargando transacciones");
      setTransacciones(j2.transacciones || []);
    } catch (e) {
      setMsg(" " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
   
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setMsg(" Monto inválido");
      return;
    }

    setSaving(true);
    try {
      const r = await fetch(`${API}/api/caja/registrar_transaccion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id_caja: idCaja,
          tipo,
          nro_registro: nroRegistro?.trim() ? nroRegistro.trim() : null,
          monto: montoNum,
        }),
      });

      const j = await r.json();
      if (!j.ok) throw new Error(j.msg || "No se pudo registrar");

      setMonto("");
      setNroRegistro("");
      setMsg(" Registro guardado");
      await loadAll();
    } catch (e) {
      setMsg("x " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="caja-wrap">
      <div className="caja-top">
        {/*  Resumen */}
        <div className="caja-card">
          <div className="caja-card-header">
            <h3>Caja</h3>
            <button className="btn-outline" onClick={loadAll} disabled={loading || saving}>
              Refrescar
            </button>
          </div>

          {loading ? (
            <div className="muted">Cargando...</div>
          ) : caja ? (
            <>
              {/*  TODO esto está dentro de "caja ?" para que no truene cuando caja es null */}
              <div className="row">
                <span>ID Caja:</span>
                <b>{caja.id_caja}</b>
              </div>

              <div className="row">
                <span>ID Usuario (caja):</span>
                <b>{caja.id_usuario ?? "-"}</b>
              </div>

            
              <div className="row">
                <span>Nombre:</span>
                <b>{caja.nombre_caja}</b>
              </div>

              <div className="row">
                <span>Saldo:</span>
                <b className="saldo">{Number(caja.saldo).toFixed(2)}</b>
              </div>
            </>
          ) : (
            <div className="muted">No hay caja</div>
          )}

          {msg ? <div className="msg">{msg}</div> : null}
        </div>

        {/*  Nuevo movimiento */}
        <div className="caja-card">
          <h3>Nuevo movimiento</h3>

          <form onSubmit={onSubmit} className="form">
            <label>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={saving}>
              <option value="INGRESO">INGRESO</option>
              <option value="EGRESO">EGRESO</option>
            </select>

            <label>Monto</label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej: 50"
              step="0.01"
              disabled={saving}
            />

            <label>Nro registro (opcional)</label>
            <input
              type="text"
              value={nroRegistro}
              onChange={(e) => setNroRegistro(e.target.value)}
              placeholder="Ej: PROF-0001"
              disabled={saving}
            />

            <button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </form>
        </div>
      </div>

      {/*  Tabla */}
      <div className="caja-card">
        <h3>Transacciones</h3>
        <CajaTransacciones transacciones={transacciones} loading={loading} />
      </div>
    </div>
  );
}

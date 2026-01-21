import React, { useMemo, useState } from "react";
import "./proformas.scss";

export default function Proformas() {
  const todayISO = new Date().toISOString().slice(0, 10);

  const [fecha, setFecha] = useState(todayISO);
  const [cliente, setCliente] = useState("");
  const [celular, setCelular] = useState("");

  // ✅ NÚMERO DE PROFORMA (temporal)
  const [proformaRef] = useState("0000001");

  // ✅ ESTADO DEL DOCUMENTO
  const [estadoProforma, setEstadoProforma] = useState("ACTIVA"); // ACTIVA | CANCELADA

  // ✅ Anticipo (pago parcial)
  const [anticipo, setAnticipo] = useState("0");

  // ✅ filas
  const [rows, setRows] = useState([
    { cantidad: "1", detalle: "", precio_unitario: "0", modo_oferta: false },
  ]);

  const bloqueada = estadoProforma === "CANCELADA";

  const addRow = () => {
    if (bloqueada) return;
    setRows((prev) => [
      ...prev,
      { cantidad: "1", detalle: "", precio_unitario: "0", modo_oferta: false },
    ]);
  };

  const removeRow = (index) => {
    if (bloqueada) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index, key, value) => {
    if (bloqueada) return;
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [key]: value } : r))
    );
  };

  const toNumber = (v) => {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const cleanInt = (v) => {
    const onlyDigits = String(v).replace(/\D+/g, "");
    const noLeadingZeros = onlyDigits.replace(/^0+(?=\d)/, "");
    return noLeadingZeros === "" ? "0" : noLeadingZeros;
  };

  const cleanMoney = (v) => {
    let s = String(v).replace(",", ".");
    s = s.replace(/[^0-9.]/g, "");
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
    s = s.replace(/^0+(?=\d)/, "");
    return s === "" ? "0" : s;
  };

  const cleanMoneyOrEmpty = (v) => {
    let s = String(v).replace(",", ".");
    s = s.replace(/[^0-9.]/g, "");
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
    s = s.replace(/^0+(?=\d)/, "");
    return s === "" ? "0" : s;
  };

  const OFERTAS = {
    "2x20": { cantidad: "2", precio_unitario: "20" },
    "2x30": { cantidad: "2", precio_unitario: "30" },
    "4x30": { cantidad: "4", precio_unitario: "30" },
  };

  const aplicarOferta = (index, key) => {
    if (bloqueada) return;
    const oferta = OFERTAS[key];
    if (!oferta) return;

    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              modo_oferta: true,
              cantidad: oferta.cantidad,
              precio_unitario: oferta.precio_unitario,
            }
          : r
      )
    );
  };

  const quitarOferta = (index) => {
    if (bloqueada) return;
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, modo_oferta: false } : r))
    );
  };

  const rowTotal = (r) => {
    if (r.modo_oferta) return toNumber(r.precio_unitario);
    return toNumber(r.cantidad) * toNumber(r.precio_unitario);
  };

  const totalGeneral = useMemo(
    () => rows.reduce((acc, r) => acc + rowTotal(r), 0),
    [rows]
  );

  const anticipoNum = useMemo(() => toNumber(anticipo), [anticipo]);

  const saldo = useMemo(() => {
    if (estadoProforma === "CANCELADA") return 0;
    const s = totalGeneral - anticipoNum;
    return s > 0 ? s : 0;
  }, [totalGeneral, anticipoNum, estadoProforma]);

  const estadoPago = useMemo(() => {
    if (estadoProforma === "CANCELADA") return "ANULADA";
    if (totalGeneral <= 0) return "—";
    if (saldo === 0 && totalGeneral > 0) return "CANCELADO";
    return "PENDIENTE";
  }, [estadoProforma, totalGeneral, saldo]);

  const clampAnticipo = () => {
    if (bloqueada) return;
    const a = toNumber(anticipo);
    if (a > totalGeneral) setAnticipo(String(totalGeneral.toFixed(2)));
    if (a < 0) setAnticipo("0");
  };

  const pagarTodo = () => {
    if (bloqueada) return;
    setAnticipo(totalGeneral.toFixed(2));
  };

  const anularProforma = () => {
    if (window.confirm("¿Anular esta proforma?")) {
      setEstadoProforma("CANCELADA");
      setAnticipo("0");
    }
  };

  return (
    <div className="print-area container-fluid p-3">
      <div className="print-area">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h2 className="m-0">Proforma</h2>
            <div className="proforma-ref">N° {proformaRef}</div>

            {estadoProforma === "CANCELADA" && (
              <div className="badge-anulada">PROFORMA ANULADA</div>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            <label className="form-label m-0">Fecha:</label>
            <input
              type="date"
              className="form-control"
              style={{ width: 180 }}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={bloqueada}
            />
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-body">
            <div className="row g-2">
              <div className="col-12 col-md-6">
                <label className="form-label">Cliente</label>
                <input
                  className="form-control"
                  placeholder="Nombre del cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  disabled={bloqueada}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Celular</label>
                <input
                  className="form-control"
                  placeholder="Celular"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  disabled={bloqueada}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <button
                className="btn btn-sm btn-primary no-print"
                onClick={addRow}
                disabled={bloqueada}
              >
                + Agregar fila
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered align-middle proforma-table">
                {/* ✅ COLGROUP: fija anchos y NO se chuequea en impresión */}
                <colgroup>
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "53%" }} />
                  <col style={{ width: "15%" }} />
                  <col className="no-print" style={{ width: "0%" }} />
                  <col style={{ width: "20%" }} />
                  <col className="no-print" style={{ width: "0%" }} />
                </colgroup>

                <thead>
                  <tr>
                    <th>Cantidad</th>
                    <th>Detalle</th>
                    <th>Precio Unitario</th>
                    <th className="no-print">Oferta</th>
                    <th>Total</th>
                    <th className="no-print"></th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="form-control"
                          value={r.cantidad}
                          disabled={bloqueada || r.modo_oferta}
                          onChange={(e) =>
                            updateRow(i, "cantidad", cleanInt(e.target.value))
                          }
                          onBlur={() =>
                            updateRow(i, "cantidad", cleanInt(r.cantidad))
                          }
                        />
                      </td>

                      <td>
                        {/* ✅ PANTALLA: textarea (NO imprime) */}
                        <textarea
                          className="form-control detalle-textarea auto-grow no-print"
                          value={r.detalle}
                          rows={1}
                          disabled={bloqueada}
                          onChange={(e) => {
                            updateRow(i, "detalle", e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = e.target.scrollHeight + "px";
                          }}
                          onInput={(e) => {
                            e.target.style.height = "auto";
                            e.target.style.height = e.target.scrollHeight + "px";
                          }}
                          style={{ overflow: "hidden", resize: "none" }}
                          placeholder="Detalle del Bordado"
                        />

                        {/* ✅ IMPRESIÓN: texto plano (no se repite) */}
                        <div className="only-print detalle-print">
                          {r.detalle}
                        </div>
                      </td>

                      <td>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="form-control"
                          value={r.precio_unitario}
                          disabled={bloqueada || r.modo_oferta}
                          onChange={(e) =>
                            updateRow(
                              i,
                              "precio_unitario",
                              cleanMoney(e.target.value)
                            )
                          }
                          onBlur={() =>
                            updateRow(
                              i,
                              "precio_unitario",
                              cleanMoney(r.precio_unitario)
                            )
                          }
                        />
                      </td>

                      <td className="no-print">
                        {!r.modo_oferta ? (
                          <select
                            className="form-select"
                            defaultValue=""
                            disabled={bloqueada}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) return;
                              aplicarOferta(i, val);
                              e.target.value = "";
                            }}
                          >
                            <option value="">Oferta</option>
                            <option value="2x20">2 en 20 Bs</option>
                            <option value="2x30">2 en 30 Bs</option>
                            <option value="4x30">4 en 30 Bs</option>
                          </select>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => quitarOferta(i)}
                            disabled={bloqueada}
                          >
                            Quitar
                          </button>
                        )}
                      </td>

                      <td className="fw-bold">{rowTotal(r).toFixed(2)}</td>

                      <td className="no-print">
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeRow(i)}
                          disabled={bloqueada || rows.length === 1}
                          title="Eliminar"
                        >
                          X
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr>
                    <td colSpan="3" className="text-end fw-bold">
                      TOTAL GENERAL
                    </td>
                    <td className="no-print"></td>
                    <td className="fw-bold">{totalGeneral.toFixed(2)}</td>
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="row g-2 mt-2">
              <div className="col-12 col-md-4">
                <label className="form-label">Adelanto (Bs)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="form-control print-keep"
                  value={anticipo}
                  onChange={(e) =>
                    setAnticipo(cleanMoneyOrEmpty(e.target.value))
                  }
                  onBlur={clampAnticipo}
                  disabled={bloqueada}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Saldo (Bs)</label>
                <input
                  type="text"
                  className="form-control print-keep"
                  value={saldo.toFixed(2)}
                  disabled
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Estado</label>
                <input
                  type="text"
                  className="form-control print-keep"
                  value={estadoPago}
                  disabled
                />
              </div>
            </div>

            <div className="d-flex gap-2 no-print mt-3">
              <button
                className="btn btn-success"
                onClick={() =>
                  alert(
                    `Luego: Guardar en BD\nTotal: ${totalGeneral.toFixed(
                      2
                    )}\nAdelanto: ${anticipoNum.toFixed(
                      2
                    )}\nSaldo: ${saldo.toFixed(2)}\nEstado: ${estadoPago}`
                  )
                }
                disabled={bloqueada}
              >
                Guardar
              </button>

              <button
                className="btn btn-outline-secondary"
                onClick={() => window.print()}
              >
                Imprimir
              </button>

              <button
                className="btn btn-outline-primary"
                onClick={pagarTodo}
                disabled={bloqueada || totalGeneral <= 0}
                title="Pagar el total"
              >
                Cancelar pago
              </button>

              <button
                className="btn btn-outline-danger"
                onClick={anularProforma}
                disabled={bloqueada}
                title="Anular proforma"
              >
                Anular
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

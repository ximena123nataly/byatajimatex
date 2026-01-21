import React, { useMemo, useState } from "react";
import "./proformas.scss";

export default function Proformas() {
  const todayISO = new Date().toISOString().slice(0, 10);

  const [fecha, setFecha] = useState(todayISO);
  const [cliente, setCliente] = useState("");
  const [celular, setCelular] = useState("");

  // ✅ ahora cada fila puede ser normal o "oferta"
  const [rows, setRows] = useState([
    { cantidad: "1", detalle: "", precio_unitario: "0", modo_oferta: false },
  ]);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { cantidad: "1", detalle: "", precio_unitario: "0", modo_oferta: false },
    ]);
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index, key, value) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [key]: value } : r))
    );
  };

  // Convierte a número SOLO para cálculos
  const toNumber = (v) => {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  // Cantidad: solo enteros, sin ceros a la izquierda
  const cleanInt = (v) => {
    const onlyDigits = String(v).replace(/\D+/g, "");
    const noLeadingZeros = onlyDigits.replace(/^0+(?=\d)/, "");
    return noLeadingZeros === "" ? "0" : noLeadingZeros;
  };

  // Precio: permite decimales, sin ceros raros al inicio
  const cleanMoney = (v) => {
    let s = String(v).replace(",", ".");
    s = s.replace(/[^0-9.]/g, "");
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
    s = s.replace(/^0+(?=\d)/, "");
    return s === "" ? "0" : s;
  };

  // ✅ ofertas (paquetes)
  const OFERTAS = {
    "2x20": { cantidad: "2", precio_unitario: "20" },
    "2x30": { cantidad: "2", precio_unitario: "30" },
    "4x30": { cantidad: "4", precio_unitario: "30" },
  };

  // ✅ aplicar oferta a la fila
  const aplicarOferta = (index, key) => {
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

  // ✅ quitar oferta (vuelve a modo normal, no borra detalle)
  const quitarOferta = (index) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, modo_oferta: false } : r))
    );
  };

  // ✅ total por fila:
  // - normal: cantidad * precio_unitario
  // - oferta: total = precio del paquete (precio_unitario)
  const rowTotal = (r) => {
    if (r.modo_oferta) return toNumber(r.precio_unitario);
    return toNumber(r.cantidad) * toNumber(r.precio_unitario);
  };

  const totalGeneral = useMemo(
    () => rows.reduce((acc, r) => acc + rowTotal(r), 0),
    [rows]
  );

  return (
    <div className="print-area container-fluid p-3">

      {/* ✅ SOLO ESTO SE IMPRIME */}
      <div className="print-area">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="m-0">Proforma</h2>

          <div className="d-flex align-items-center gap-2">
            <label className="form-label m-0">Fecha:</label>
            <input
              type="date"
              className="form-control"
              style={{ width: 180 }}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
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
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Celular</label>
                <input
                  className="form-control"
                  placeholder="Ej: 7xxxxxxx"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0">Detalle</h5>

              {/* ✅ NO SE IMPRIME */}
              <button
                className="btn btn-sm btn-primary no-print"
                onClick={addRow}
              >
                + Agregar fila
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>Cantidad</th>
                    <th>Detalle</th>
                    <th style={{ width: 180 }}>Precio Unitario</th>

                    {/* ✅ NO SE IMPRIME */}
                    <th className="no-print" style={{ width: 160 }}>
                      Oferta
                    </th>

                    <th style={{ width: 160 }}>Total</th>

                    {/* ✅ NO SE IMPRIME */}
                    <th className="no-print" style={{ width: 70 }}></th>
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
                          disabled={r.modo_oferta}
                          onChange={(e) =>
                            updateRow(i, "cantidad", cleanInt(e.target.value))
                          }
                          onBlur={() =>
                            updateRow(i, "cantidad", cleanInt(r.cantidad))
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="form-control"
                          placeholder="Ej: Bordado apache policía, nombre, etc."
                          value={r.detalle}
                          onChange={(e) =>
                            updateRow(i, "detalle", e.target.value)
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="form-control"
                          value={r.precio_unitario}
                          disabled={r.modo_oferta}
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

                      {/* ✅ NO SE IMPRIME */}
                      <td className="no-print">
                        {!r.modo_oferta ? (
                          <select
                            className="form-select"
                            defaultValue=""
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
                            title="Quitar oferta"
                          >
                            Quitar
                          </button>
                        )}
                      </td>

                      <td className="fw-bold">{rowTotal(r).toFixed(2)}</td>

                      {/* ✅ NO SE IMPRIME */}
                      <td className="no-print">
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeRow(i)}
                          disabled={rows.length === 1}
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
                    {/* ✅ ANTES ERA 4, AHORA ES 3 porque "Oferta" NO se imprime */}
                    <td colSpan="3" className="text-end fw-bold">
                      TOTAL GENERAL
                    </td>
                    <td className="fw-bold">{totalGeneral.toFixed(2)}</td>

                    {/* ✅ NO SE IMPRIME */}
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ✅ NO SE IMPRIME */}
            <div className="d-flex gap-2 no-print">
              <button
                className="btn btn-success"
                onClick={() => alert("Luego: Guardar en BD")}
              >
                Guardar
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => window.print()}
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

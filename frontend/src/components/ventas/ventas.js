import React, { useMemo, useState } from "react";
import "./ventas.scss";

export default function Ventas() {
  const todayISO = new Date().toISOString().slice(0, 10);

  // ====== DATOS DE VENTA ======
  const [fecha, setFecha] = useState(todayISO);
  const [cliente, setCliente] = useState("");
  const [celular, setCelular] = useState("");
  const [nota, setNota] = useState("");

  // ====== MOCK DE PRODUCTOS (LUEGO VIENE DE BD) ======
  const [productos, setProductos] = useState([
    { product_id: "P1", name: "Apache Policía (Nombre)", price: 30, stock: 120 },
    { product_id: "P2", name: "Parche Wiphala", price: 80, stock: 50 },
    { product_id: "P3", name: "Bordado (por prenda)", price: 1.5, stock: 9999 }, // servicio
  ]);

  // ====== FILAS ======
  const [rows, setRows] = useState([
    { product_id: "", detalle: "", cantidad: "1", precio_unitario: "0" },
  ]);

  const [guardando, setGuardando] = useState(false);

  // ====== HELPERS ======
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

  // textarea auto-grow (para detalle)
  const autoGrow = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { product_id: "", detalle: "", cantidad: "1", precio_unitario: "0" },
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

  // cuando elige producto, auto llena precio
  const onSelectProducto = (index, product_id) => {
    const p = productos.find((x) => x.product_id === product_id);
    if (!p) {
      updateRow(index, "product_id", "");
      updateRow(index, "precio_unitario", "0");
      return;
    }
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              product_id,
              precio_unitario: String(p.price),
            }
          : r
      )
    );
  };

  const rowTotal = (r) => toNumber(r.cantidad) * toNumber(r.precio_unitario);

  const totalGeneral = useMemo(
    () => rows.reduce((acc, r) => acc + rowTotal(r), 0),
    [rows]
  );

  // ====== VALIDACIONES ======
  const validar = () => {
    if (rows.length === 0) return "Agrega al menos una fila.";

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.product_id) return `Fila ${i + 1}: selecciona un producto.`;
      if (toNumber(r.cantidad) <= 0) return `Fila ${i + 1}: cantidad inválida.`;
      if (toNumber(r.precio_unitario) < 0) return `Fila ${i + 1}: precio inválido.`;

      const p = productos.find((x) => x.product_id === r.product_id);
      if (!p) return `Fila ${i + 1}: producto no encontrado.`;

      // control stock (solo si no es servicio)
      if (p.stock !== 9999 && toNumber(r.cantidad) > p.stock) {
        return `Fila ${i + 1}: no hay stock suficiente (stock: ${p.stock}).`;
      }
    }

    return null;
  };

  // ====== CONFIRMAR VENTA (DEMO: SIN BD, DESCUENTA EN MEMORIA) ======
  const confirmarVenta = async () => {
    const err = validar();
    if (err) {
      alert(err);
      return;
    }

    setGuardando(true);

    // simula “guardado”
    await new Promise((r) => setTimeout(r, 400));

    // descontar stock en memoria
    setProductos((prev) =>
      prev.map((p) => {
        const usado = rows
          .filter((r) => r.product_id === p.product_id)
          .reduce((acc, r) => acc + toNumber(r.cantidad), 0);

        if (p.stock === 9999) return p;
        return { ...p, stock: Math.max(0, p.stock - usado) };
      })
    );

    // limpiar formulario
    setRows([{ product_id: "", detalle: "", cantidad: "1", precio_unitario: "0" }]);
    setCliente("");
    setCelular("");
    setNota("");

    setGuardando(false);
    alert("✅ Venta registrada (modo demo) y stock descontado.");
  };

  return (
    <div className="container-fluid p-3 ventas">
      {/* ✅ SOLO ESTO SE IMPRIME */}
      <div className="print-area">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="m-0">Ventas</h2>

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

        {/* DATOS CLIENTE */}
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
                  placeholder="Celular"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                />
              </div>

              <div className="col-12">
            
                
              </div>
            </div>
          </div>
        </div>

        {/* TABLA */}
        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0">Detalle de venta</h5>
              <button className="btn btn-sm btn-primary no-print" onClick={addRow}>
                + Agregar fila
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th style={{ width: 260 }}>Producto</th>
                    
                    <th style={{ width: 120 }}>Cantidad</th>
                    <th style={{ width: 160 }}>Precio Unitario</th>
                    <th style={{ width: 140 }}>Total</th>
                    <th className="no-print" style={{ width: 70 }}></th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r, i) => {
                    const p = productos.find((x) => x.product_id === r.product_id);

                    return (
                      <tr key={i}>
                        <td>
                          <select
                            className="form-select no-print"
                            value={r.product_id}
                            onChange={(e) => onSelectProducto(i, e.target.value)}
                          >
                            <option value="">-- Selecciona --</option>
                            {productos.map((p) => (
                              <option key={p.product_id} value={p.product_id}>
                                {p.name}
                                {p.stock !== 9999 ? ` (stk ${p.stock})` : ""}
                              </option>
                            ))}
                          </select>

                          {/* ✅ En impresión mostramos texto plano */}
                          <div className="print-only">
                            <b>{p ? p.name : "-"}</b>
                          </div>

                          {p && (
                            <small className="text-muted no-print">
                              {p.stock !== 9999 ? `Stock: ${p.stock}` : "Servicio"}
                            </small>
                          )}
                        </td>

                        

                        <td>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="form-control"
                            value={r.cantidad}
                            onChange={(e) =>
                              updateRow(i, "cantidad", cleanInt(e.target.value))
                            }
                            onBlur={() => updateRow(i, "cantidad", cleanInt(r.cantidad))}
                          />
                        </td>

                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="form-control"
                            value={r.precio_unitario}
                            onChange={(e) =>
                              updateRow(i, "precio_unitario", cleanMoney(e.target.value))
                            }
                            onBlur={() =>
                              updateRow(i, "precio_unitario", cleanMoney(r.precio_unitario))
                            }
                          />
                        </td>

                        <td className="fw-bold">{rowTotal(r).toFixed(2)}</td>

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
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr>
                    <td colSpan="4" className="text-end fw-bold">
                      TOTAL GENERAL
                    </td>
                    <td className="fw-bold">{totalGeneral.toFixed(2)}</td>
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="d-flex gap-2 no-print">
              <button
                className="btn btn-success"
                disabled={guardando}
                onClick={confirmarVenta}
              >
                {guardando ? "Guardando..." : "Confirmar venta"}
              </button>

              <button className="btn btn-outline-secondary" onClick={() => window.print()}>
                Imprimir
              </button>
            </div>
          </div>
        </div>

        {/* STOCK (solo para ver en demo) - NO SE IMPRIME */}
        <div className="card mt-3 no-print">
          <div className="card-body">
            <h6 className="m-0 mb-2">Stock (demo)</h6>
            <ul className="m-0">
              {productos.map((p) => (
                <li key={p.product_id}>
                  {p.name} — <b>{p.stock === 9999 ? "∞" : p.stock}</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

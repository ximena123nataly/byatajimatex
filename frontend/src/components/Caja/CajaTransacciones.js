import React, { useState } from "react";
import moment from "moment";

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

const safe = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(2);
};

const formatProforma = (v) => String(v ?? "").padStart(7, "0");

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

  /** =========================
   * Fetch detalle (reutilizable)
   * ========================= */
  const fetchDetalleMovimiento = async (id_transaccion) => {
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
    if (!b.ok) throw new Error(b.msg || "No se pudo cargar el detalle");
    return b; // { ok, mov, tipo_detalle, detalle }
  };

  /** =========================
   * Ver detalle (abre modal)
   * ========================= */
  const verDetalle = async (id_transaccion) => {
    setLoadingDet(true);
    setErrDet("");
    setMov(null);
    setTipoDetalle("");
    setDetalle(null);
    abrir();

    try {
      const b = await fetchDetalleMovimiento(id_transaccion);
      setMov(b.mov);
      setTipoDetalle(b.tipo_detalle || "");
      setDetalle(b.detalle);
    } catch (e) {
      setErrDet(e.message || "Error de conexión al servidor");
    } finally {
      setLoadingDet(false);
    }
  };

  /** =========================
   * PRINT HELPERS
   * (abre ventana y manda a imprimir)
   * ========================= */
  const abrirPrint = (html, title = "Imprimir") => {
    const w = window.open("", "_blank", "width=980,height=720");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    // el html ya trae window.print()
  };

  /** =========================
   * PRINT: PROFORMA (Mismo formato que proformas.js)
   * ========================= */
  const imprimirProformaLike = (p) => {
    if (!p) return;

    // OJO: en proformas.js los items vienen como p.detalle (array)
    // acá el backend puede devolver items en p.items (string JSON) o p.detalle
    const itemsArr = Array.isArray(p.detalle)
      ? p.detalle
      : safeJson(p.items || p.detalle);

    const filas = itemsArr
      .map((it) => {
        const cant = toNumber(it.cantidad ?? it.quantity);
        const pu = toNumber(it.precio_unitario ?? it.rate);
        const tot = toNumber(it.total ?? cant * pu);

        const ofertaTxt =
          it.oferta && it.oferta !== "Sin oferta" ? `(${safe(it.oferta)})` : "";
        const det = safe(it.detalle || it.product_name || "").replace(/\n/g, "<br/>");

        return `
          <tr>
            <td class="td-right" style="width:55px;">${cant}</td>
            <td class="td-left wrap">${det}</td>
            <td class="td-center" style="width:120px;">${ofertaTxt}</td>
            <td class="td-right" style="width:80px;">${money(pu)}</td>
            <td class="td-right" style="width:90px;">${money(tot)}</td>
          </tr>
        `;
      })
      .join("");

    const notasHTML =
      p.notas && String(p.notas).trim() !== ""
        ? `<div class="small wrap" style="margin-top:8px;"><b>Notas:</b> ${safe(p.notas).replace(
            /\n/g,
            "<br/>"
          )}</div>`
        : "";

    const fechaPrint = p.fecha ? moment.utc(p.fecha).format("YYYY-MM-DD") : "";
    const horaPrint = p.hora ? String(p.hora).slice(0, 8) : "";

    const fechaEntregaPrint = p.fecha_entrega
      ? moment.utc(p.fecha_entrega).format("YYYY-MM-DD")
      : "";
    const horaEntregaPrint = p.hora_entrega ? String(p.hora_entrega).slice(0, 5) : "";

    const entregadoTxt = Number(p.entregado) === 1 ? "SI" : "NO";

    const nro = p.proforma_id || formatProforma(p.id);

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Proforma ${safe(nro)}</title>
  <style>
    @page { size: letter portrait; margin: 0; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111; }
    .ticket { width: 8.5in; height: 5.5in; box-sizing: border-box; padding: 0.35in 0.45in; margin: 0 auto; overflow: hidden; }
    .wrap { word-break: break-word; overflow-wrap: anywhere; }
    .small { font-size: 11px; line-height: 1.25; }
    .muted { color: #444; }
    .title { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .col-left  { width: 33%; }
    .col-center{ width: 34%; text-align: center; }
    .col-right { width: 33%; text-align: right; }
    .logo { width: 170px; height: auto; display: block; margin-bottom: 6px; }
    hr { border: 0; border-top: 1px solid #ddd; margin: 10px 0; }
    .mid { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .mid-left { width: 55%; }
    .mid-right{ width: 45%; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    thead th { font-size: 12px; text-align: left; border-bottom: 1px solid #ddd; padding: 7px 6px; }
    tbody td { font-size: 12px; border-bottom: 1px dashed #eee; padding: 7px 6px; vertical-align: top; }
    .td-right { text-align: right; }
    .td-center { text-align: center; }
    .td-left { text-align: left; }
    .totals { width: 260px; margin-left: auto; margin-top: 10px; }
    .totals table { width: 100%; border-collapse: collapse; margin-top: 0; }
    .totals td { font-size: 12px; padding: 6px 6px; border: 0; }
    .box-nro { border: 1px solid #ddd; border-radius: 6px; padding: 10px 12px; display: inline-block; }
    .nro { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <div class="col-left">
        <img class="logo" src="/tajima.png" alt="logo"/>
        <div class="small">
          <b>BORDADOS COMPUTARIZADOS</b><br/>
          Y APLICACIONES TAJIMA TEXTIL<br/>
          <span class="muted">E-mail:</span> byatajima@gmail.com<br/>
          <span class="muted"> </span> jhonfya@hotmail.com
        </div>
      </div>

      <div class="col-center">
        <div class="title">PROFORMA</div>
        <div class="small muted" style="margin-top:8px;">
          Dir.: Av. Juan Pablo II Ceja<br/>
          (El Alto lado Tránsito - Bolivia)<br/>
          Cel: 75866135-75274747-77221750
        </div>
      </div>

      <div class="col-right">
        <div class="box-nro">
          <div class="small muted">N°</div>
          <div class="nro">${safe(nro)}</div>
          <div class="small muted">Fecha: ${safe(fechaPrint)}</div>
          <div class="small muted">Hora: ${safe(horaPrint)}</div>
        </div>
      </div>
    </div>

    <hr/>

    <div class="mid">
      <div class="mid-left small">
        <div><b>Cliente:</b> ${safe(p.cliente)}</div>
        <div><b>Celular:</b> ${safe(p.celular)}</div>
        ${notasHTML}
      </div>

      <div class="mid-right small">
        <div><b>Entregado:</b> ${entregadoTxt}</div>
        <div><b>Fecha de entrega:</b> ${safe(fechaEntregaPrint)} ${safe(horaEntregaPrint)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:55px;" class="td-right">Cant</th>
          <th>Detalle</th>
          <th style="width:120px;" class="td-center"></th>
          <th style="width:80px;" class="td-right">P/U</th>
          <th style="width:90px;" class="td-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${filas || `<tr><td colspan="Heading>i;">(Sin ítems)</td></tr>`}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr>
          <td class="td-left"><b>Anticipo</b></td>
          <td class="td-right">${money(p.anticipo)}</td>
        </tr>
        <tr>
          <td class="td-left"><b>Total</b></td>
          <td class="td-right">${money(p.total_general)}</td>
        </tr>
        <tr>
          <td class="td-left"><b>Saldo</b></td>
          <td class="td-right">${money(p.saldo)}</td>
        </tr>
      </table>
    </div>
  </div>

  <script>
    window.onload = function() { window.print(); window.close(); };
  </script>
</body>
</html>
    `;

    abrirPrint(html, `Proforma ${nro}`);
  };

  /** =========================
   * PRINT: VENTA (simple, pero ya “bonito”)
   * Si quieres 100% igual a Orders.js, dime y lo clonamos exacto.
   * ========================= */
  const imprimirVentaLike = (o) => {
    if (!o) return;
    const items = safeJson(o.items);

    const rows = items
      .map((it) => {
        const q = toNumber(it.quantity);
        const r = toNumber(it.rate);
        const total = q * r;
        return `
          <tr>
            <td>${safe(it.product_name)}</td>
            <td class="right">${q}</td>
            <td class="right">${money(r)}</td>
            <td class="right">${money(total)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Venta ${safe(o.order_ref || "")}</title>
  <style>
    @page { size: letter portrait; margin: 16mm; }
    body { font-family: Arial, sans-serif; color:#111; }
    .head { display:flex; justify-content:space-between; margin-bottom:10px; }
    h2 { margin:0; }
    table { width:100%; border-collapse:collapse; margin-top:12px; }
    th, td { border-bottom:1px solid #ddd; padding:8px 6px; font-size:12px; }
    .right { text-align:right; }
  </style>
</head>
<body>
  <div class="head">
    <div>
      <h2>VENTA</h2>
      <div><b>Ref:</b> ${safe(o.order_ref || "")}</div>
      <div><b>Cliente:</b> ${safe(o.customer_name || "")}</div>
    </div>
    <div style="text-align:right;">
      <div><b>Fecha:</b> ${safe(fmtFecha(o.timeStamp))}</div>
      <div><b>Total:</b> Bs ${money(o.grand_total)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th class="right">Cant</th>
        <th class="right">P/U</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="4">(Sin ítems)</td></tr>`}
    </tbody>
  </table>

  <script>
    window.onload = function(){ window.print(); window.close(); };
  </script>
</body>
</html>
    `;
    abrirPrint(html, "Venta");
  };

  /** =========================
   * PRINT: GASTO
   * ========================= */
  const imprimirGastoLike = (e) => {
    if (!e) return;

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Gasto ${safe(e.expense_ref || "")}</title>
  <style>
    @page { size: letter portrait; margin: 16mm; }
    body { font-family: Arial, sans-serif; color:#111; }
    h2 { margin:0 0 10px 0; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size:12px; }
  </style>
</head>
<body>
  <h2>GASTO</h2>
  <div class="grid">
    <div><b>Ref:</b> ${safe(e.expense_ref || "")}</div>
    <div><b>Fecha:</b> ${safe(fmtFecha(e.timeStamp))}</div>
    <div><b>Proveedor:</b> ${safe(e.supplier_name || "")}</div>
    <div><b>Total:</b> Bs ${money(e.grand_total)}</div>
    <div style="grid-column:1/-1;"><b>Descripción:</b> ${safe(e.description || "")}</div>
  </div>

  <script>
    window.onload = function(){ window.print(); window.close(); };
  </script>
</body>
</html>
    `;
    abrirPrint(html, "Gasto");
  };

  /** =========================
   * PRINT: decide según tipo
   * ========================= */
  const imprimirDesdeModal = () => {
    if (!mov) return;

    const t = String(tipoDetalle || "").toUpperCase();

    // Si el movimiento trae detalle proforma/venta/gasto, usamos el formato correspondiente
    if (t === "PROFORMA") return imprimirProformaLike(detalle);
    if (t === "VENTA") return imprimirVentaLike(detalle);
    if (t === "GASTO") return imprimirGastoLike(detalle);

    // TRASPASO u otros: simple
    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Movimiento ${safe(mov?.id_transaccion || "")}</title>
  <style>
    @page { size: letter portrait; margin: 16mm; }
    body { font-family: Arial, sans-serif; color:#111; }
    h2 { margin:0 0 10px 0; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size:12px; }
  </style>
</head>
<body>
  <h2>Detalle del movimiento</h2>
  <div class="grid">
    <div><b>Tipo:</b> ${safe(mov.tipo)}</div>
    <div><b>Origen:</b> ${safe(mov.origen)}</div>
    <div><b>Monto:</b> Bs ${money(mov.monto)}</div>
    <div><b>Referencia:</b> ${safe(mov.nro_registro || "-")}</div>
    <div><b>Fecha:</b> ${safe(fmtFecha(mov.fecha))}</div>
    <div><b>Hora:</b> ${safe(fmtHora(mov.hora))}</div>
    <div><b>Caja:</b> #${safe(mov.id_caja)}</div>
    <div><b>Usuario:</b> ${safe(mov.id_usuario)}</div>
  </div>

  <script>
    window.onload = function(){ window.print(); window.close(); };
  </script>
</body>
</html>
    `;
    abrirPrint(html, "Movimiento");
  };

  /** =========================
   * Render Detalle (modal)
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
          <span className={`badge ${mov.tipo === "INGRESO" ? "badge-in" : "badge-out"}`}>
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

    const general = renderGeneral();

    // TRASPASO
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

    // PROFORMA
    if (tipoDetalle === "PROFORMA") {
      if (!detalle)
        return (
          <>
            {general}
            <p className="muted">No se encontró detalle de proforma.</p>
          </>
        );

      const items = Array.isArray(detalle.detalle) ? detalle.detalle : safeJson(detalle.items);

      return (
        <>
          {general}
          <hr />
          <h4>Detalle de Proforma</h4>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <b>Proforma:</b> {detalle.proforma_id || formatProforma(detalle.id) || "-"}
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
              <b>Total:</b> {detalle.total_general ?? "-"}
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
                  <th>P/U</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((it, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{it.cantidad ?? it.quantity ?? "-"}</td>
                      <td>{it.detalle ?? it.product_name ?? "-"}</td>
                      <td>{it.precio_unitario ?? it.rate ?? "-"}</td>
                      <td>{it.total ?? (toNumber(it.cantidad ?? it.quantity) * toNumber(it.precio_unitario ?? it.rate)).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ color: "#666" }}>
                      Sin ítems
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    // VENTA
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
                  <th>P/U</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((it, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{it.product_name || "-"}</td>
                      <td>{it.quantity || "-"}</td>
                      <td>{it.rate || "-"}</td>
                      <td>{(toNumber(it.quantity) * toNumber(it.rate)).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ color: "#666" }}>
                      Sin ítems
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    // GASTO
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
                    <span className={`badge ${t.tipo === "INGRESO" ? "badge-in" : "badge-out"}`}>
                      {t.tipo}
                    </span>
                  </td>

                  <td>{t.origen}</td>
                  <td>{t.nro_registro || "-"}</td>
                  <td>Bs {Number(t.monto || 0).toFixed(2)}</td>
                  <td>{fmtFecha(t.fecha)}</td>
                  <td>{fmtHora(t.hora)}</td>

                  {/* SOLO VER (sin imprimir aquí) */}
                  <td>
                    <button className="btn-ver" onClick={() => verDetalle(t.id_transaccion)}>
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <h3 style={{ margin: 0 }}>Detalle del movimiento</h3>

              <div style={{ display: "flex", gap: 8 }}>
                {!!mov && (
                  <button className="btn-ver" onClick={imprimirDesdeModal}>
                    Imprimir
                  </button>
                )}
                <button className="btn btn-outline-danger" onClick={cerrar}>
                  X
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>{renderDetalle()}</div>
          </div>
        </div>
      )}
    </div>
  );
}

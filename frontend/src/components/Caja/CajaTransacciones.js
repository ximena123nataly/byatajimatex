import React, { useMemo, useState } from "react";
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
  if (typeof v === "string" && v.includes(":")) return v.slice(0, 8);
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

  const [busqueda, setBusqueda] = useState("");

  const transaccionesFiltradas = useMemo(() => {
    const texto = String(busqueda || "").toLowerCase().trim();

    if (!texto) return transacciones || [];

    return (transacciones || []).filter((t) =>
      [
        t.id_transaccion,
        t.id_usuario,
        t.id_caja,
        t.tipo,
        t.origen,
        t.nro_registro,
        t.monto,
        t.fecha,
        t.hora,
        t.detalle,
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .some((v) => v.includes(texto))
    );
  }, [transacciones, busqueda]);

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
   * PRINT ENGINE (popup / iframe fallback)
   * ========================= */
  const abrirPrint = (html) => {
    // 1) intenta popup
    const w = window.open("", "_blank", "width=980,height=720");
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      return;
    }

    // 2) fallback: iframe oculto (si popup bloqueado)
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch { }
    }, 2000);
  };

  const basePrintStyles = `
<style>
  @page { size: A4; margin: 12mm; }
  html, body { background: #fff; }
  body { font-family: Arial, Helvetica, sans-serif; color:#111; }
  .wrap { word-break: break-word; overflow-wrap: anywhere; }
  .muted { color:#555; }
  .row { display:flex; justify-content: space-between; gap: 14px; }
  .col { flex: 1; }
  .print-wrap { width: 100%; }
  .print-header{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap: 12px;
    padding-bottom: 10px;
    border-bottom: 2px solid #111;
    margin-bottom: 12px;
  }
  .brand{
    display:flex;
    gap: 12px;
    align-items:flex-start;
    min-width: 280px;
  }
  .brand img{
    width: 125px;
    height: auto;
    object-fit: contain;
  }
  .brand .company{
    font-size: 11px;
    line-height: 1.25;
  }
  .brand .company b{ font-size: 12px; }
  .docbox{ text-align:right; min-width: 260px; }
  .doc-title{
    font-size: 20px;
    font-weight: 900;
    letter-spacing: .5px;
  }
  .doc-sub{
    margin-top: 6px;
    font-size: 11px;
    line-height: 1.35;
  }
  .section-title{
    font-size: 18px;
    font-weight: 900;
    margin: 12px 0 10px;
  }
  .kv{
    display:grid;
    grid-template-columns: 120px 1fr;
    gap: 6px 10px;
    font-size: 12px;
    line-height: 1.35;
  }
  .k{ color:#333; font-weight: 800; }
  .v{ color:#111; }
  .badge{
    display:inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 900;
    border: 1px solid #111;
    vertical-align: middle;
  }
  .badge-in{ background:#e8fff1; border-color:#16a34a; color:#166534; }
  .badge-out{ background:#fff1f2; border-color:#ef4444; color:#991b1b; }
  .hr{ border: 0; border-top: 1px solid #ddd; margin: 12px 0; }
  .card{
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 10px 12px;
  }
  .card h4{ margin: 0 0 8px 0; font-size: 14px; }
  table{ width:100%; border-collapse: collapse; margin-top: 10px; }
  th, td{ font-size: 12px; padding: 8px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  th{ text-align:left; font-weight: 800; }
  .right{ text-align:right; }
  .center{ text-align:center; }
  .totals{
    width: 260px;
    margin-left: auto;
    margin-top: 10px;
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 8px 10px;
  }
  .totals .line{
    display:flex;
    justify-content: space-between;
    font-size: 12px;
    padding: 4px 0;
  }
  .totals .line b{ font-weight: 900; }
</style>
`;

  const tituloPorTipo = (tipo) => {
    const t = String(tipo || "").toUpperCase();
    if (t === "PROFORMA") return "PROFORMA";
    if (t === "GASTO") return "GASTO";
    if (t === "VENTA") return "VENTA";
    if (t === "TRASPASO") return "TRASPASO";
    return "MOVIMIENTO";
  };

  const headerTajima = (titulo) => {
    const logoUrl = `${window.location.origin}${process.env.PUBLIC_URL || ""}/tajima.png`;
    return `
      <div class="print-header">
        <div class="brand">
          <img src="${logoUrl}" alt="TAJIMA"/>
          <div class="company">
            <b>BORDADOS COMPUTARIZADOS</b><br/>
            Y APLICACIONES TAJIMA TEXTIL<br/>
            <span class="muted">E-mail:</span> byatajima@gmail.com<br/>
            <span class="muted"></span> jhonfya@hotmail.com
          </div>
        </div>

        <div class="docbox">
          <div class="doc-title">${safe(titulo)}</div>
          <div class="doc-sub">
            Dir.: Av. Juan Pablo II Ceja<br/>
            (El Alto lado Tránsito - Bolivia)<br/>
            Cel: 75866135-75274747-77221750
          </div>
        </div>
      </div>
    `;
  };

  /** =========================
   * PRINT TEMPLATE: Detalle del movimiento (bonito)
   * - sirve para PROFORMA / VENTA / GASTO / TRASPASO
   * ========================= */
  const buildHtmlMovimientoBonito = ({ mov, tipo_detalle, detalle }) => {
    const titulo = tituloPorTipo(tipo_detalle);

    const badgeClass = mov?.tipo === "INGRESO" ? "badge badge-in" : "badge badge-out";
    const now = new Date();
    const impFecha = moment(now).format("DD/MM/YYYY");
    const impHora = moment(now).format("HH:mm:ss");

    const bloqueGeneral = `
      <div class="section-title">Detalle del movimiento</div>

      <div class="row">
        <div class="col">
          <div class="kv">
            <div class="k">Tipo:</div>
            <div class="v"><span class="${badgeClass}">${safe(mov?.tipo)}</span></div>

            <div class="k">Monto:</div>
            <div class="v">Bs ${money(mov?.monto)}</div>

            <div class="k">Fecha:</div>
            <div class="v">${safe(fmtFecha(mov?.fecha))}</div>

            <div class="k">Caja:</div>
            <div class="v">#${safe(mov?.id_caja)}</div>
          </div>
        </div>

        <div class="col">
          <div class="kv">
            <div class="k">Origen:</div>
            <div class="v">${safe(mov?.origen)}</div>

            <div class="k">Referencia:</div>
            <div class="v wrap">${safe(mov?.nro_registro || "-")}</div>

            <div class="k">Detalle del trapaso:</div>
            <div class="v wrap">${safe(mov?.detalle || "-")}</div>

            <div class="k">Hora:</div>
            <div class="v">${safe(fmtHora(mov?.hora))}</div>

            <div class="k">Usuario:</div>
            <div class="v">${safe(mov?.id_usuario)}</div>
          </div>
        </div>
      </div>
    `;

    // === TRASPASO: mostrar Origen/Destino
    let extra = "";
    if (String(tipo_detalle).toUpperCase() === "TRASPASO") {
      const arr = Array.isArray(detalle) ? detalle : [];
      const eg = arr.find((x) => x.tipo === "EGRESO");
      const ing = arr.find((x) => x.tipo === "INGRESO");

      extra = `
        <div class="hr"></div>
        <div class="row">
          <div class="col card">
            <h4>Origen (Sale)</h4>
            <div class="kv">
              <div class="k">Usuario:</div>
              <div class="v">${safe(eg?.user_name || eg?.id_usuario || "-")}</div>
              <div class="k">Caja:</div>
              <div class="v">#${safe(eg?.id_caja || "-")}</div>
              <div class="k">Monto:</div>
              <div class="v">Bs ${money(eg?.monto)}</div>
            </div>
          </div>

          <div class="col card">
            <h4>Destino (Entra)</h4>
            <div class="kv">
              <div class="k">Usuario:</div>
              <div class="v">${safe(ing?.user_name || ing?.id_usuario || "-")}</div>
              <div class="k">Caja:</div>
              <div class="v">#${safe(ing?.id_caja || "-")}</div>
              <div class="k">Monto:</div>
              <div class="v">Bs ${money(ing?.monto)}</div>
            </div>
          </div>
        </div>
      `;
    }

    // === PROFORMA: imprimir como “mini proforma” + items
    if (String(tipo_detalle).toUpperCase() === "PROFORMA" && detalle) {
      const itemsArr = Array.isArray(detalle.detalle)
        ? detalle.detalle
        : safeJson(detalle.items || detalle.detalle);

      const filas = itemsArr
        .map((it) => {
          const cant = toNumber(it.cantidad ?? it.quantity);
          const pu = toNumber(it.precio_unitario ?? it.rate);
          const tot = toNumber(it.total ?? cant * pu);
          const det = safe(it.detalle || it.product_name || "").replace(/\n/g, "<br/>");
          return `
            <tr>
              <td class="right">${cant}</td>
              <td class="wrap">${det}</td>
              <td class="right">${money(pu)}</td>
              <td class="right">${money(tot)}</td>
            </tr>
          `;
        })
        .join("");

      const nro = detalle.proforma_id || formatProforma(detalle.id);
      extra = `
        <div class="hr"></div>
        <div class="section-title">Proforma</div>

        <div class="row">
          <div class="col">
            <div class="kv">
              <div class="k">N°:</div><div class="v">${safe(nro)}</div>
              <div class="k">Cliente:</div><div class="v">${safe(detalle.cliente || "-")}</div>
              <div class="k">Celular:</div><div class="v">${safe(detalle.celular || "-")}</div>
            </div>
          </div>
          <div class="col">
            <div class="kv">
              <div class="k">Estado:</div><div class="v">${safe(detalle.estado || "-")}</div>
              <div class="k">Entregado:</div><div class="v">${Number(detalle.entregado) === 1 ? "SI" : "NO"}</div>
              <div class="k">Entrega:</div><div class="v">${safe(detalle.fecha_entrega ? moment.utc(detalle.fecha_entrega).format("YYYY-MM-DD") : "-")} ${safe(detalle.hora_entrega ? String(detalle.hora_entrega).slice(0, 5) : "")}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="right" style="width:70px;">Cant</th>
              <th>Detalle</th>
              <th class="right" style="width:90px;">P/U</th>
              <th class="right" style="width:100px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${filas || `<tr><td colspan="4" class="muted">(Sin ítems)</td></tr>`}
          </tbody>
        </table>

        <div class="totals">
          <div class="line"><span>Anticipo</span><b>Bs ${money(detalle.anticipo)}</b></div>
          <div class="line"><span>Total</span><b>Bs ${money(detalle.total_general)}</b></div>
          <div class="line"><span>Saldo</span><b>Bs ${money(detalle.saldo)}</b></div>
        </div>
      `;
    }

    // === VENTA: detalle + items
    if (String(tipo_detalle).toUpperCase() === "VENTA" && detalle) {
      const items = safeJson(detalle.items);
      const filas = items
        .map((it) => {
          const q = toNumber(it.quantity);
          const r = toNumber(it.rate);
          const t = q * r;
          return `
            <tr>
              <td class="wrap">${safe(it.product_name || "-")}</td>
              <td class="right">${q}</td>
              <td class="right">${money(r)}</td>
              <td class="right">${money(t)}</td>
            </tr>
          `;
        })
        .join("");

      extra = `
        <div class="hr"></div>
        <div class="section-title">Venta</div>

        <div class="row">
          <div class="col">
            <div class="kv">
              <div class="k">Ref:</div><div class="v">${safe(detalle.order_ref || detalle.order_id || "-")}</div>
              <div class="k">Cliente:</div><div class="v">${safe(detalle.customer_name || detalle.customer_id || "-")}</div>
            </div>
          </div>
          <div class="col">
            <div class="kv">
              <div class="k">Fecha:</div><div class="v">${safe(fmtFecha(detalle.timeStamp))}</div>
              <div class="k">Total:</div><div class="v">Bs ${money(detalle.grand_total)}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th class="right" style="width:80px;">Cant</th>
              <th class="right" style="width:90px;">P/U</th>
              <th class="right" style="width:100px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${filas || `<tr><td colspan="4" class="muted">(Sin ítems)</td></tr>`}
          </tbody>
        </table>
      `;
    }

    // === GASTO: detalle bonito
    if (String(tipo_detalle).toUpperCase() === "GASTO" && detalle) {
      extra = `
        <div class="hr"></div>
        <div class="section-title">Gasto</div>

        <div class="row">
          <div class="col">
            <div class="kv">
              <div class="k">Ref:</div><div class="v">${safe(detalle.expense_ref || detalle.expense_id || "-")}</div>
              <div class="k">Proveedor:</div><div class="v">${safe(detalle.supplier_name || detalle.supplier_id || "-")}</div>
            </div>
          </div>
          <div class="col">
            <div class="kv">
              <div class="k">Fecha:</div><div class="v">${safe(fmtFecha(detalle.timeStamp))}</div>
              <div class="k">Total:</div><div class="v">Bs ${money(detalle.grand_total ?? detalle.total)}</div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:10px;">
          <h4>Descripción</h4>
          <div class="wrap" style="font-size:12px; line-height:1.4;">
            ${safe(detalle.description || detalle.expense_description || "-").replace(/\n/g, "<br/>")}
          </div>
        </div>
      `;
    }

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${safe(titulo)} - Movimiento ${safe(mov?.id_transaccion || "")}</title>
  ${basePrintStyles}
</head>
<body>
  <div class="print-wrap">
    ${headerTajima(titulo)}
    <div class="muted" style="font-size:11px; display:flex; justify-content:flex-end; gap:12px;">
      <div><b>Impreso:</b> ${safe(impFecha)} ${safe(impHora)}</div>
      <div><b>ID Movimiento:</b> ${safe(mov?.id_transaccion || "-")}</div>
    </div>

    ${bloqueGeneral}
    ${extra}

  </div>

  <script>
    window.onload = function(){
      window.print();
      window.close();
    };
  </script>
</body>
</html>
    `;
    return html;
  };

  /** =========================
   * PRINT: por fila (bonito)
   * ========================= */
  const imprimirMovimientoBonito = async (id_transaccion) => {
    try {
      const b = await fetchDetalleMovimiento(id_transaccion);
      const html = buildHtmlMovimientoBonito({
        mov: b.mov,
        tipo_detalle: b.tipo_detalle || "",
        detalle: b.detalle,
      });
      abrirPrint(html);
    } catch (e) {
      alert(e.message || "No se pudo imprimir el movimiento");
    }
  };

  /** =========================
   * (Opcional) imprimir desde modal (ya cargado)
   * ========================= */
  const imprimirDesdeModal = () => {
    if (!mov) return;
    const html = buildHtmlMovimientoBonito({
      mov,
      tipo_detalle: tipoDetalle || "",
      detalle,
    });
    abrirPrint(html);
  };

  /** =========================
   * PRINT TEMPLATE: Detalle del movimiento (térmica 80mm)
   * ========================= */
  const buildHtmlMovimientoTermico = ({ mov, tipo_detalle, detalle }) => {
    const titulo = tituloPorTipo(tipo_detalle);
    const now = new Date();
    const impFecha = moment(now).format("DD/MM/YYYY");
    const impHora = moment(now).format("HH:mm");
    const logoUrl = `${window.location.origin}${process.env.PUBLIC_URL || ""}/tajima.png`;

    // ---- bloque ítems según tipo ----
    let itemsHtml = "";

    if (String(tipo_detalle).toUpperCase() === "PROFORMA" && detalle) {
      const itemsArr = Array.isArray(detalle.detalle)
        ? detalle.detalle
        : safeJson(detalle.items || detalle.detalle);

      const filas = itemsArr.map((it) => {
        const cant = toNumber(it.cantidad ?? it.quantity);
        const pu = toNumber(it.precio_unitario ?? it.rate);
        const tot = toNumber(it.total ?? cant * pu);
        const det = safe(it.detalle || it.product_name || "").replace(/\n/g, "<br/>");
        return `
          <tr>
            <td class="td-right" style="width:28px;">${cant}</td>
            <td class="td-left wrap">${det}</td>
            <td class="td-right" style="width:52px;">${money(pu)}</td>
            <td class="td-right" style="width:56px;">${money(tot)}</td>
          </tr>`;
      }).join("");

      const nro = detalle.proforma_id || formatProforma(detalle.id);
      itemsHtml = `
        <hr class="sep-dashed"/>
        <div class="info-row"><span>Proforma N°:</span><span>${safe(nro)}</span></div>
        <div class="info-row"><span>Cliente:</span><span class="wrap">${safe(detalle.cliente || "-")}</span></div>
        <div class="info-row"><span>Celular:</span><span>${safe(detalle.celular || "-")}</span></div>
        <div class="info-row"><span>Estado:</span><span>${safe(detalle.estado || "-")}</span></div>
        <hr class="sep-solid"/>
        <table>
          <thead>
            <tr>
              <th style="width:28px;" class="td-right">Cant</th>
              <th class="td-left">Detalle</th>
              <th style="width:52px;" class="td-right">P/U</th>
              <th style="width:56px;" class="td-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${filas || `<tr><td colspan="4" class="td-left" style="padding:3px;">(Sin ítems)</td></tr>`}
          </tbody>
        </table>
        <div class="totals">
          <div class="t-row"><span>Anticipo:</span><span>${money(detalle.anticipo)}</span></div>
          <div class="t-row"><span>Total:</span><span>${money(detalle.total_general)}</span></div>
          <div class="t-row grande"><span>SALDO:</span><span>${money(detalle.saldo)}</span></div>
        </div>`;
    }

    if (String(tipo_detalle).toUpperCase() === "VENTA" && detalle) {
      const items = safeJson(detalle.items);
      const filas = items.map((it) => {
        const q = toNumber(it.quantity);
        const r = toNumber(it.rate);
        return `
          <tr>
            <td class="td-right" style="width:28px;">${q}</td>
            <td class="td-left wrap">${safe(it.product_name || "-")}</td>
            <td class="td-right" style="width:52px;">${money(r)}</td>
            <td class="td-right" style="width:56px;">${money(q * r)}</td>
          </tr>`;
      }).join("");

      itemsHtml = `
        <hr class="sep-dashed"/>
        <div class="info-row"><span>Ref:</span><span class="wrap">${safe(detalle.order_ref || detalle.order_id || "-")}</span></div>
        <div class="info-row"><span>Cliente:</span><span class="wrap">${safe(detalle.customer_name || detalle.customer_id || "-")}</span></div>
        <hr class="sep-solid"/>
        <table>
          <thead>
            <tr>
              <th style="width:28px;" class="td-right">Cant</th>
              <th class="td-left">Producto</th>
              <th style="width:52px;" class="td-right">P/U</th>
              <th style="width:56px;" class="td-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${filas || `<tr><td colspan="4" class="td-left" style="padding:3px;">(Sin ítems)</td></tr>`}
          </tbody>
        </table>
        <div class="totals">
          <div class="t-row grande"><span>TOTAL:</span><span>${money(detalle.grand_total)}</span></div>
        </div>`;
    }

    if (String(tipo_detalle).toUpperCase() === "GASTO" && detalle) {
      itemsHtml = `
        <hr class="sep-dashed"/>
        <div class="info-row"><span>Ref:</span><span class="wrap">${safe(detalle.expense_ref || detalle.expense_id || "-")}</span></div>
        <div class="info-row"><span>Proveedor:</span><span class="wrap">${safe(detalle.supplier_name || detalle.supplier_id || "-")}</span></div>
        <div class="info-row"><span>Total:</span><span>${money(detalle.grand_total ?? detalle.total)}</span></div>
        <hr class="sep-dashed"/>
        <div style="font-size:10px; line-height:1.4;" class="wrap">
          ${safe(detalle.description || detalle.expense_description || "-").replace(/\n/g, "<br/>")}
        </div>`;
    }

    if (String(tipo_detalle).toUpperCase() === "TRASPASO") {
      const arr = Array.isArray(detalle) ? detalle : [];
      const eg = arr.find((x) => x.tipo === "EGRESO");
      const ing = arr.find((x) => x.tipo === "INGRESO");
      itemsHtml = `
        <hr class="sep-dashed"/>
        <div class="bold" style="font-size:10px; margin-bottom:2px;">Origen (Sale)</div>
        <div class="info-row"><span>Caja:</span><span>#${safe(eg?.id_caja || "-")}</span></div>
        <div class="info-row"><span>Monto:</span><span>Bs ${money(eg?.monto)}</span></div>
        <hr class="sep-dashed"/>
        <div class="bold" style="font-size:10px; margin-bottom:2px;">Destino (Entra)</div>
        <div class="info-row"><span>Caja:</span><span>#${safe(ing?.id_caja || "-")}</span></div>
        <div class="info-row"><span>Monto:</span><span>Bs ${money(ing?.monto)}</span></div>`;
    }

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${safe(titulo)} - Mov ${safe(mov?.id_transaccion || "")}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Lucida Console', Courier, monospace;
      font-size: 11px;
      color: #000;
      width: 80mm;
    }
    .ticket { width: 80mm; padding: 4mm 4mm 8mm 4mm; }
    .center { text-align: center; }
    .bold   { font-weight: 700; -webkit-text-stroke: 0.3px #000; text-shadow: 0.3px 0 0 #000; }
    .wrap   { word-break: break-word; overflow-wrap: anywhere; }
    .empresa-nombre { font-size: 13px; font-weight: 800; text-align: center; -webkit-text-stroke: 0.4px #000; text-shadow: 0.4px 0 0 #000; }
    .empresa-sub    { font-size: 10px; text-align: center; line-height: 1.3; }
    .sep-solid  { border: 0; border-top: 1px solid #000; margin: 3px 0; }
    .sep-dashed { border: 0; border-top: 1px dashed #000; margin: 3px 0; }
    .num-mov { font-size: 15px; font-weight: 800; text-align: center; margin: 2px 0; -webkit-text-stroke: 0.5px #000; text-shadow: 0.5px 0 0 #000; }
    .info-row { display: flex; justify-content: space-between; font-size: 10px; gap: 4px; }
    .info-row span:first-child { font-weight: 700; -webkit-text-stroke: 0.3px #000; text-shadow: 0.3px 0 0 #000; }
    .badge { font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 999px; border: 1px solid #000; }
    .badge-in  { border-color: #16a34a; }
    .badge-out { border-color: #ef4444; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      font-size: 10px; text-align: left;
      border-top: 1px solid #000; border-bottom: 1px solid #000;
      padding: 2px;
    }
    tbody td { font-size: 10px; padding: 2px; vertical-align: top; border-bottom: 1px dashed #ccc; }
    tbody tr:last-child td { border-bottom: 1px solid #000; }
    .td-right { text-align: right; }
    .td-left  { text-align: left; }
    .totals { margin-top: 4px; font-size: 11px; }
    .totals .t-row { display: flex; justify-content: space-between; padding: 1px 0; }
    .totals .t-row.grande {
      font-size: 13px; font-weight: 800;
      border-top: 1px solid #000; margin-top: 2px; padding-top: 2px;
      -webkit-text-stroke: 0.4px #000; text-shadow: 0.4px 0 0 #000;
    }
    .firma { margin-top: 10mm; border-top: 1px solid #000; text-align: center; font-size: 10px; padding-top: 2px; }
  </style>
</head>
<body>
  <div class="ticket">

    <div class="center" style="margin-bottom:4px;">
      <img src="${logoUrl}" alt="TAJIMA" style="width:30mm; height:auto; display:block; margin:0 auto;" />
    </div>

    <div class="empresa-nombre">BYATAJIMATEX</div>
    <div class="empresa-sub">
      BORDADOS COMPUTARIZADOS<br/>
      Y APLICACIONES<br/>
      Av. Juan Pablo II Ceja<br/>
      (El Alto lado Tránsito - Bolivia)<br/>
      Cel.: 75866135 · 75274747 · 77221750<br/>
      byatajima@gmail.com
    </div>

    <hr class="sep-solid"/>
    <div class="center bold" style="font-size:11px; margin-bottom:1px;">DETALLE DE MOVIMIENTO</div>
    <div class="center bold" style="font-size:11px;">${safe(titulo)}</div>
    <div class="num-mov">ID #${safe(mov?.id_transaccion || "--")}</div>

    <hr class="sep-dashed"/>
    <div class="info-row"><span>Fecha:</span><span>${safe(fmtFecha(mov?.fecha))}</span></div>
    <div class="info-row"><span>Hora:</span><span>${safe(fmtHora(mov?.hora))}</span></div>
    <div class="info-row"><span>Impreso:</span><span>${safe(impFecha)} ${safe(impHora)}</span></div>

    <hr class="sep-dashed"/>
    <div class="info-row"><span>Tipo:</span><span><span class="badge ${mov?.tipo === "INGRESO" ? "badge-in" : "badge-out"}">${safe(mov?.tipo)}</span></span></div>
    <div class="info-row"><span>Monto:</span><span>Bs ${money(mov?.monto)}</span></div>
    <div class="info-row"><span>Origen:</span><span>${safe(mov?.origen)}</span></div>
    <div class="info-row"><span>Referencia:</span><span class="wrap">${safe(mov?.nro_registro || "-")}</span></div>
    <div class="info-row"><span>Caja:</span><span>#${safe(mov?.id_caja)}</span></div>
    <div class="info-row"><span>Usuario:</span><span>${safe(mov?.id_usuario)}</span></div>
    ${mov?.detalle ? `<div class="info-row"><span>Detalle:</span><span class="wrap">${safe(mov.detalle)}</span></div>` : ""}

    ${itemsHtml}

    <div class="firma">Firma / Sello</div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;
    return html;
  };

  const imprimirTermicaDesdeModal = () => {
    if (!mov) return;
    const html = buildHtmlMovimientoTermico({
      mov,
      tipo_detalle: tipoDetalle || "",
      detalle,
    });
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) {
      alert("Tu navegador bloqueó la ventana de impresión. Permite pop-ups.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  /** =========================
   * Render detalle (modal)
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
          <b>Detalle: {mov.detalle || "-"} </b>
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
                      <td>
                        {it.total ??
                          (
                            toNumber(it.cantidad ?? it.quantity) *
                            toNumber(it.precio_unitario ?? it.rate)
                          ).toFixed(2)}
                      </td>
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
      <div
        className="caja-tx-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0 }}>Movimientos</h3>

        <div
          style={{
            position: "relative",
            width: "280px",
            maxWidth: "100%",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "15px",
              color: "#666",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>

          <input
            type="text"
            className="my_form_control"
            placeholder="Buscar movimiento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: "100%",
              paddingLeft: "36px",
            }}
          />
        </div>
      </div>

      {loading ? (
        <p className="muted">Cargando movimientos...</p>
      ) : !transacciones || transacciones.length === 0 ? (
        <p className="muted">Aún no hay movimientos.</p>
      ) : transaccionesFiltradas.length === 0 ? (
        <p className="muted">No se encontraron movimientos.</p>
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
              {transaccionesFiltradas.map((t) => (
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
                  <td className="wrap">{t.nro_registro || "-"}</td>
                  <td>Bs {Number(t.monto || 0).toFixed(2)}</td>
                  <td>{fmtFecha(t.fecha)}</td>
                  <td>{fmtHora(t.hora)}</td>

                  {/* ✅ VER + IMPRIMIR (POR CADA FILA) */}
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                      <button className="btn-ver" onClick={() => verDetalle(t.id_transaccion)}>
                        Ver
                      </button>


                    </div>
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
                <button className="btn btn-outline-danger" onClick={cerrar}>
                  X
                </button>
              </div>

            </div>

            <div style={{ marginTop: 12 }}>
              {renderDetalle()}

              {!!mov && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    marginTop: 20,
                    borderTop: "1px solid #eee",
                    paddingTop: 12,
                  }}
                >
                  <button
                    className="btn-ver"
                    onClick={imprimirTermicaDesdeModal}
                    style={{ padding: "10px 18px", fontWeight: 600 }}
                  >
                    Imprimir Térmica
                  </button>
                  <button
                    className="btn-ver"
                    onClick={imprimirDesdeModal}
                    style={{ padding: "10px 18px", fontWeight: 600 }}
                  >
                    Imprimir
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
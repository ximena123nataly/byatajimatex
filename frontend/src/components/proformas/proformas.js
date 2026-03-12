import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "react-bootstrap/Modal";
import "./proformas.scss";
import Table from "../Table/Table";

import moment from "moment";
import "moment/locale/es";
import swal from "sweetalert";

import Loader from "../PageStates/Loader";
import Error from "../PageStates/Error";
import { useLocation } from "react-router-dom";

function Proformas() {
  const [pageState, setPageState] = useState(1);
  const [permission, setPermission] = useState(null);

  const [proformas, setProformas] = useState([]);
  const [count, setCount] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [sortColumn, setSortColumn] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [data, setData] = useState([]);

  const [viewModalShow, setViewModalShow] = useState(false);
  const [selected, setSelected] = useState(null);
  const [payCliente, setPayCliente] = useState("");
  const [payCelular, setPayCelular] = useState("");
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const onlyPendientes = params.get("pendientes") === "1";

  const formatProforma = (id) => String(id ?? "").padStart(7, "0");

  const clickNoFocusAsync = (fn) => async (e) => {
    const el = e?.currentTarget;
    if (el) el.blur();

    try {
      await fn();
    } finally {
      setTimeout(() => {
        if (el) el.blur();
        if (document?.activeElement && typeof document.activeElement.blur === "function") {
          document.activeElement.blur();
        }
      }, 0);
    }
  };
  const [filterFrom, setFilterFrom] = useState(null);
  const [filterTo, setFilterTo] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDesde(today);
    setHasta(today);
  }, []);


  useEffect(() => {
    moment.locale("es");

    fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/verifiy_token`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((body) => {
        if (body.operation === "success") {
          fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_permission`, {
            method: "POST",
            credentials: "include",
          })
            .then((res) => res.json())
            .then((body) => {
              const p = body.permissions?.find((x) => x.page === "proformas");
              if (p?.view) setPermission(p);
              else window.location.href = "/unauthorized";
            });
        } else {
          window.location.href = "/login";
        }
      })
      .catch(console.log);
  }, []);

  const getProformas = async (sv, sc, so, scv) => {
    const result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_proformas`, {
      method: "POST",
      headers: { "Content-type": "application/json; charset=UTF-8" },
      body: JSON.stringify({
        start_value: sv,
        sort_column: sc,
        sort_order: so,
        search_value: scv,
        only_pendientes: onlyPendientes,


        desde: filterFrom || null,
        hasta: filterTo || null,


      }),

      credentials: "include",
    });

    const body = await result.json();
    setProformas(body.info?.proformas || []);
    setCount(body.info?.count || 0);
  };

  useEffect(() => {
    if (permission !== null) {
      getProformas((tablePage - 1) * 10, sortColumn, sortOrder, searchInput)
        .then(() => setPageState(2))
        .catch(() => setPageState(3));
    }
  }, [permission, tablePage, sortColumn, sortOrder, searchInput, onlyPendientes]);



  const deleteProforma = async (id) => {
    const result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/delete_proforma`, {
      method: "POST",
      headers: { "Content-type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ id }),
      credentials: "include",
    });

    const body = await result.json();

    if (body.operation === "success") {
      getProformas((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
      swal("Éxito", body.message || "Proforma eliminada", "success");
    } else {
      swal("¡Ups!", body.message || "Algo salió mal", "error");
    }
  };

  const entregarProforma = async (id, saldoActual = 0) => {
    try {
      if (Number(saldoActual) > 0) {
        const p = proformas.find((x) => Number(x.id) === Number(id));
        const nombreCliente = p?.cliente || "";
        const celularCliente = p?.celular || "";

        const input = await swal({
          title: "Cobro antes de entregar",
          text: `${nombreCliente}${celularCliente ? "   " + celularCliente : ""}\nSaldo pendiente: ${Number(saldoActual).toFixed(2)}`,
          content: {
            element: "input",
            attributes: {
              placeholder: "Monto a cobrar",
              type: "number",
              min: "0",
              step: "0.01",
            },
          },
          buttons: ["Cancelar", "Cobrar y entregar"],
          dangerMode: true,
        });

        if (input === null) return;

        const monto = Number(input);
        if (!Number.isFinite(monto) || monto <= 0) {
          swal("¡Ups!", "Monto inválido", "error");
          return;
        }
        if (monto > Number(saldoActual)) {
          swal("¡Ups!", "No puedes cobrar más que el saldo", "error");
          return;
        }

        const cobrarRes = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/cobrar_proforma`, {
          method: "POST",
          headers: { "Content-type": "application/json; charset=UTF-8" },
          body: JSON.stringify({ id, monto }),
          credentials: "include",
        });

        const cobrarBody = await cobrarRes.json();

        if (cobrarBody.operation !== "success") {
          swal("¡Ups!", cobrarBody.message || "No se pudo cobrar", "error");
          return;
        }
      }

      const ok = await swal({
        title: "¿Entregar pedido?",
        text: "Esto marcará la proforma como ENTREGADA.",
        icon: "warning",
        buttons: ["Cancelar", "Sí, entregar"],
        dangerMode: true,
      });

      if (!ok) return;

      const entregarRes = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/entregar_proforma`, {
        method: "POST",
        headers: { "Content-type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ id }),
        credentials: "include",
      });

      const entregarBody = await entregarRes.json();

      if (entregarBody.operation === "success") {
        swal("Éxito", entregarBody.message || "Proforma marcada como entregada", "success");
        getProformas((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
      } else {
        swal("¡Ups!", entregarBody.message || "No se pudo entregar", "error");
      }
    } catch (err) {
      console.log(err);
      swal("¡Ups!", "Error de conexión con el servidor", "error");
    }
  };

  const cobrarProforma = async (id, saldoActual) => {
    const saldoNum = Number(saldoActual);

    if (!Number.isFinite(saldoNum) || saldoNum <= 0) {
      swal("Info", "Esta proforma no tiene saldo pendiente", "info");
      return;
    }


    const p = proformas.find((x) => Number(x.id) === Number(id));
    const nombreCliente = p?.cliente || "";
    const celularCliente = p?.celular || "";

    const input = await swal({
      title: "Cobrar saldo",

      text: `${nombreCliente}${celularCliente ? "   " + celularCliente : ""}\nSaldo actual: ${saldoNum.toFixed(2)}`,
      content: {
        element: "input",
        attributes: {
          placeholder: "Monto a cobrar",
          type: "number",
          min: "0",
          step: "0.01",
        },
      },
      buttons: ["Cancelar", "Cobrar"],
    });

    if (input === null) return;

    const monto = Number(input);

    if (!Number.isFinite(monto) || monto <= 0) {
      swal("¡Ups!", "Monto inválido", "error");
      return;
    }

    if (monto > saldoNum) {
      swal("¡Ups!", "No puedes cobrar más que el saldo", "error");
      return;
    }

    const diff = Math.abs(monto - saldoNum);
    if (diff > 0.009) {
      swal("¡Ups!", "Debes pagar el saldo completo", "warning");
      return;
    }

    try {
      const result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/cobrar_proforma`, {
        method: "POST",
        headers: { "Content-type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ id, monto: saldoNum }),
        credentials: "include",
      });

      const body = await result.json();

      if (body.operation === "success") {
        swal("Éxito", body.message || "Pago registrado", "success");
        getProformas((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
      } else {
        swal("¡Ups!", body.message || "No se pudo cobrar", "error");
      }
    } catch (err) {
      console.log(err);
      swal("¡Ups!", "Error de conexión con el servidor", "error");
    }
  };

  const openViewModal = (obj) => {
    let parsed = obj;

    if (parsed?.detalle && typeof parsed.detalle === "string") {
      try {
        parsed = { ...parsed, detalle: JSON.parse(parsed.detalle) };
      } catch {
        parsed = { ...parsed, detalle: [] };
      }
    }

    if (!Array.isArray(parsed?.detalle)) {
      parsed = { ...parsed, detalle: [] };
    }

    setSelected(parsed);
    setViewModalShow(true);
  };

  const closeViewModal = () => {
    setSelected(null);
    setViewModalShow(false);
  };

  const rowClassByEntregado = (obj) => {
    const entregado = Number(obj?.entregado) === 1;
    return entregado ? "row-entregado" : "row-no-entregado";
  };
  const filtrarPorFechas = () => {
    setFilterFrom(desde || null);
    setFilterTo(hasta || null);
    setTablePage(1);
    getProformas(0, sortColumn, sortOrder, searchInput);
  };
  const fmtLargo = (fecha) => {
    if (!fecha) return "";
    const f = new Date(fecha);
    return f.toLocaleDateString("es-BO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };


  const imprimirReporteProformas = async () => {

    const res = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_proformas`, {
      method: "POST",
      headers: { "Content-type": "application/json; charset=UTF-8" },
      credentials: "include",
      body: JSON.stringify({
        imprimir: true,
        search_value: searchInput,
        only_pendientes: onlyPendientes,
        desde: filterFrom,
        hasta: filterTo,
      }),
    });


    const body = await res.json();
    const filasData = body.info?.proformas || [];

    const totalSaldoSum = filasData.reduce(
      (acc, p) => acc + Number(p.saldo || 0),
      0
    );

    const totalGeneralSum = filasData.reduce(
      (acc, p) => acc + Number(p.total_general || 0),
      0
    );


    const rangoTexto =
      desde && hasta
        ? `del ${fmtLargo(desde)} al ${fmtLargo(hasta)}`
        : desde && !hasta
          ? `del ${fmtLargo(desde)} al ${fmtLargo(moment().format("YYYY-MM-DD"))}`
          : !desde && hasta
            ? `del ${fmtLargo(moment().subtract(30, "days").format("YYYY-MM-DD"))} al ${fmtLargo(hasta)}`
            : `del ${fmtLargo(moment().startOf("month").format("YYYY-MM-DD"))} al ${fmtLargo(moment().format("YYYY-MM-DD"))}`;

    // ===== FILAS HTML =====
    const filas = filasData
      .map(
        (p, i) => `
      <tr>
        <td class="c-center">${i + 1}</td>
        <td class="c-center">${String(p.id ?? "").padStart(7, "0")}</td>
        <td class="c-left">${String(p.cliente || "")}</td>
<td class="c-center">
  ${Number(p.entregado) === 1 ? "ENTREGADO" : "NO ENTREGADO"}
</td>
<td class="c-right">${Number(p.total_general || 0).toFixed(2)}</td>

        <td class="c-right">${Number(p.saldo || 0).toFixed(2)}</td>
        <td class="c-center">${p.fecha ? moment.utc(p.fecha).format("YYYY-MM-DD") : ""}</td>
      </tr>
    `
      )
      .join("");

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Historial de Proformas</title>
  <style>
    @page { size: letter portrait; margin: 0; }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      font-family: Arial, sans-serif;
      color: #111;
    }

    .page{
      padding: 12mm;
      box-sizing: border-box;
    }

    /* ===== HEADER ===== */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .col-left  { width: 33%; }
    .col-center{ width: 34%; text-align: center; }
    .col-right { width: 33%; }

    .logo {
      width: 130px !important;
      max-width: 130px !important;
      height: auto !important;
      display:block;
      margin: 0 0 6px 0 !important;
    }

    .small { font-size: 11px; line-height: 1.25; }
    .muted { color:#444; }
    .title { font-size: 18px; font-weight: 800; letter-spacing: .4px; margin: 0; }

    /* Columna derecha alineada como tu ejemplo */
    .rightBox{
  display: flex;
  flex-direction: column;
  align-items: flex-start;  /* ← izquierda */
  text-align: left;         /* ← izquierda */
  gap: 2px;
  font-size: 11px;
  margin-top: 18px;
}
  .rline{
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
}

.lbl{
  width: 70px;        /* ancho fijo para alinear */
  font-weight: 700;
  text-align: left;
}

.val{
  text-align: left;
}

    /* Línea separadora debajo del header */
    .sep {
      border: 0;
      border-top: 1px solid #d9d9d9;
      margin: 10px 0 10px;
    }

    /* ===== META (rango / filas) ===== */
    .meta {
      display:flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      margin: 0 0 6px;
    }

    /* ===== TABLE (solo líneas horizontales) ===== */
    table { width:100%; border-collapse: collapse; }

    thead th{
      font-size: 12px;
      padding: 8px 6px;
      border-top: 2px solid #000;     /* línea gruesa arriba */
      border-bottom: 2px solid #000;  /* línea gruesa abajo */
    }

    tbody td{
      font-size: 12px;
      padding: 8px 6px;
      border-bottom: 1px solid #cfcfcf; /* solo horizontal */
    }

    /* sin líneas verticales */
    th, td { border-left: none !important; border-right: none !important; }

    /* última línea gruesa al final de la tabla */
    tbody tr:last-child td{
      border-bottom: 2px solid #000;
    }

    /* alineaciones */
    .c-left{ text-align:left; }
    .c-center{ text-align:center; }
    .c-right{ text-align:right; }

    /* ===== TOTALES ABAJO (como tu ejemplo) ===== */
    .totals{
      margin-top: 12px;
      border-top: 2px solid #000;
      padding-top: 8px;
      font-size: 12px;
      display:flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

  </style>
</head>
<body>
  <div class="page">

    <div class="header">
      <div class="col-left">
        <img class="logo" src="/tajima.png" alt="TAJIMA" />
        <div class="small">
          <div><b>BORDADOS COMPUTARIZADOS</b></div>
          <div>Y APLICACIONES TAJIMA TEXTIL</div>
          <div class="muted">E-mail: byatajima@gmail.com</div>
          <div class="muted">jhonnfya@hotmail.com</div>
        </div>
      </div>

      <div class="col-center">
        <div class="title">HISTORIAL DE PROFORMAS</div>
        <div class="small" style="margin-top:6px;">
          <div><b>Dir.:</b> Av. Juan Pablo II Ceja</div>
          <div>(El Alto lado Transito - Bolivia)</div>
          <div>Cel.: 75866135 - 75274747 - 77221750</div>
        </div>
      </div>

      <div class="col-right">
  <div class="rightBox">
    <div class="rline"><span class="lbl">página:</span><span class="val">1 de 1</span></div>
    <div class="rline"><span class="lbl">Fecha:</span><span class="val">${moment().format("YYYY-MM-DD")}</span></div>
    <div class="rline"><span class="lbl">Hora:</span><span class="val">${moment().format("HH:mm:ss")}</span></div>
  </div>
</div>
        
    </div>

    <hr class="sep" />

    <div class="meta">
      <div>${rangoTexto}</div>
      <div>Filas: <b>${filasData.length}</b></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:45px;" class="c-center">#</th>
          <th style="width:120px;" class="c-center">Proforma</th>
          <th class="c-left">Cliente</th>
          <th style="width:120px;" class="c-center">Entregado</th>
          <th style="width:110px;" class="c-right">Total</th>
          <th style="width:110px;" class="c-right">Saldo</th>
          <th style="width:120px;" class="c-center">Fecha</th>
        </tr>
      </thead>
      <tbody>
        ${filas || `<tr><td colspan="6" class="c-center" style="padding:10px;">Sin datos</td></tr>`}
      </tbody>
    </table>

    <!--  AQUI VA TU BLOQUE DE TOTALES -->
    <div class="totals">
      <div><b>TOTAL PROFORMAS:</b> ${filasData.length}</div>
      <div><b>SALDO TOTAL:</b> ${totalSaldoSum.toFixed(2)}</div>
      <div><b>MONTO TOTAL:</b> ${totalGeneralSum.toFixed(2)}</div>
    </div>

  </div>

  <script>
    window.onload = function(){
      window.print();
      window.onafterprint = function(){ window.close(); }
    }
  </script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) {
      swal("Bloqueado", "Permite pop-ups para imprimir.", "warning");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };
  const imprimirProforma = (p) => {
    if (!p) return;

    const toNumber = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const money = (n) => {
      const num = Number(n);
      if (!Number.isFinite(num)) return "0.00";
      return num.toFixed(2);
    };

    const safe = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const items = Array.isArray(p.detalle) ? p.detalle : [];

    const filas = items
      .map((it) => {
        const cant = toNumber(it.cantidad);
        const pu = toNumber(it.precio_unitario);
        const tot = toNumber(it.total);

        const ofertaTxt = it.oferta && it.oferta !== "Sin oferta" ? `(${safe(it.oferta)})` : "";
        const det = safe(it.detalle || "").replace(/\n/g, "<br/>");

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
        ? `<div class="small wrap" style="margin-top:8px;"><b>Notas:</b> ${safe(p.notas).replace(/\n/g, "<br/>")}</div>`
        : "";

    const fechaPrint = p.fecha ? moment.utc(p.fecha).format("YYYY-MM-DD") : "";
    const horaPrint = p.hora ? String(p.hora).slice(0, 8) : "";

    const fechaEntregaPrint = p.fecha_entrega ? moment.utc(p.fecha_entrega).format("YYYY-MM-DD") : "";
    const horaEntregaPrint = p.hora_entrega ? String(p.hora_entrega).slice(0, 5) : "";

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Proforma ${safe(formatProforma(p.id))}</title>
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
    .totals table { width: 100%; }
    .totals td { font-size: 12px; padding: 4px 6px; }
    .totals tr td:first-child { text-align: left; }
    .totals tr td:last-child { text-align: right; font-weight: 700; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <div class="col-left">
        <img class="logo" src="/tajima.png" alt="TAJIMA" />
        <div class="small">
          <div><b>BORDADOS COMPUTARIZADOS</b></div>
          <div>Y APLICACIONES TAJIMA TEXTIL</div>
          <div class="muted">E-mail: byatajima@gmail.com</div>
          <div class="muted">jhonnfya@hotmail.com</div>
        </div>
      </div>

      <div class="col-center">
        <div class="title">PROFORMA</div>
        <div class="small" style="margin-top:10px;">
          <div><b>Dir.:</b> Av. Juan Pablo II Ceja</div>
          <div>(El Alto lado Transito - Bolivia)</div>
          <div>Cel.: 75866135-75274747-77221750</div>
        </div>
      </div>

      <div class="col-right small" style="margin-top:14px;">
        <div>
          N°:
          <span style="font-size:20px; font-weight:800;">
            ${safe(formatProforma(p.id))}
          </span>
        </div>
        <div>Fecha: <b>${fechaPrint}</b></div>
        <div>Hora: <b>${horaPrint}</b></div>
      </div>
    </div>

    <hr />

    <div class="mid small">
      <div class="mid-left wrap">
        <div><b>Cliente:</b> ${safe(p.cliente || "")}</div>
        <div><b>Celular:</b> ${safe(p.celular || "")}</div>
        ${notasHTML}
      </div>
      <div class="mid-right">
        <div><b>Entregado:</b> ${Number(p.entregado) ? "SI" : "NO"}</div>
        <div class="muted"><b> Fecha de entrega:</b> ${fechaEntregaPrint} ${horaEntregaPrint}</div>
      </div>
    </div>

    <hr />

    <table>
      <thead>
        <tr>
          <th style="width:55px;" class="td-right">Cant</th>
          <th class="td-left">Detalle</th>
          <th style="width:120px;" class="td-center"></th>
          <th style="width:80px;" class="td-right">P/U</th>
          <th style="width:90px;" class="td-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${filas || `<tr><td colspan="5" style="padding:10px; font-size:12px;">(Sin ítems)</td></tr>`}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr><td>Anticipo</td><td>${money(p.anticipo ?? 0)}</td></tr>
        <tr><td>Total</td><td>${money(p.total_general ?? 0)}</td></tr>
        <tr><td>Saldo</td><td>${money(p.saldo ?? 0)}</td></tr>
      </table>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>
    `;

    const w = window.open("", "_blank", "width=900,height=650");
    if (!w) {
      swal("Bloqueado", "Tu navegador bloqueó la ventana de impresión. Permite pop-ups.", "warning");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  //IMPRESION DE PROFORMA EN IMPRESORA TERMINCA
  const imprimirProformaTermica = (p) => {
    if (!p) return;

    const toNumber = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const money = (n) => {
      const num = Number(n);
      if (!Number.isFinite(num)) return "0.00";
      return num.toFixed(2);
    };

    const safe = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const items = Array.isArray(p.detalle) ? p.detalle : [];

    const filas = items
      .map((it) => {
        const cant = toNumber(it.cantidad);
        const pu = toNumber(it.precio_unitario);
        const tot = toNumber(it.total);
        const ofertaTxt = it.oferta && it.oferta !== "Sin oferta" ? `<div class="oferta">${safe(it.oferta)}</div>` : "";
        const det = safe(it.detalle || "").replace(/\n/g, "<br/>");

        return `
          <tr>
            <td class="td-right" style="width:30px;">${cant}</td>
            <td class="td-left wrap">${det}${ofertaTxt}</td>
            <td class="td-right" style="width:55px;">${money(pu)}</td>
            <td class="td-right" style="width:60px;">${money(tot)}</td>
          </tr>
        `;
      })
      .join("");

    const notasHTML =
      p.notas && String(p.notas).trim() !== ""
        ? `<div class="notas"><b>Notas:</b> ${safe(p.notas).replace(/\n/g, "<br/>")}</div>`
        : "";

    const fechaPrint = p.fecha ? moment.utc(p.fecha).format("YYYY-MM-DD") : "";
    const horaPrint = p.hora ? String(p.hora).slice(0, 8) : "";
    const fechaEntregaPrint = p.fecha_entrega ? moment.utc(p.fecha_entrega).format("YYYY-MM-DD") : "";
    const horaEntregaPrint = p.hora_entrega ? String(p.hora_entrega).slice(0, 5) : "";

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Proforma ${safe(formatProforma(p.id))}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Lucida Console', Courier, monospace;
      font-size: 11px;
      color: #000;
      width: 80mm;
    }
    .ticket {
      width: 80mm;
      padding: 4mm 4mm 8mm 4mm;
    }
    .center { text-align: center; }
    .left   { text-align: left; }
    .right  { text-align: right; }
    .bold   { font-weight: 700; -webkit-text-stroke: 0.3px #000; text-shadow: 0.3px 0 0 #000; }
    .wrap   { word-break: break-word; overflow-wrap: anywhere; }
    .oferta { font-size: 10px; color: #333; font-style: italic; }
    .notas  { font-size: 10px; margin-top: 4px; border-top: 1px dashed #000; padding-top: 3px; }

    .empresa-nombre { font-size: 13px; font-weight: 800; text-align: center; -webkit-text-stroke: 0.4px #000; text-shadow: 0.4px 0 0 #000; }
    .empresa-sub    { font-size: 10px; text-align: center; line-height: 1.3; }

    .sep-solid  { border: 0; border-top: 1px solid #000; margin: 3px 0; }
    .sep-dashed { border: 0; border-top: 1px dashed #000; margin: 3px 0; }

    .num-proforma { font-size: 16px; font-weight: 800; text-align: center; margin: 2px 0; -webkit-text-stroke: 0.5px #000; text-shadow: 0.5px 0 0 #000; }

    .info-row { display: flex; justify-content: space-between; font-size: 10px; }
    .info-row span:first-child { font-weight: 700; -webkit-text-stroke: 0.3px #000; text-shadow: 0.3px 0 0 #000; }

    table { width: 100%; border-collapse: collapse; }
    thead th {
      font-size: 10px;
      text-align: left;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 2px 2px;
    }
    tbody td {
      font-size: 10px;
      padding: 2px 2px;
      vertical-align: top;
      border-bottom: 1px dashed #ccc;
    }
    tbody tr:last-child td { border-bottom: 1px solid #000; }
    .td-right  { text-align: right; }
    .td-center { text-align: center; }
    .td-left   { text-align: left; }

    .totals { margin-top: 4px; font-size: 11px; }
    .totals .t-row { display: flex; justify-content: space-between; padding: 1px 0; }
    .totals .t-row.grande { font-size: 13px; font-weight: 800; border-top: 1px solid #000; margin-top: 2px; padding-top: 2px; -webkit-text-stroke: 0.4px #000; text-shadow: 0.4px 0 0 #000; }

    .firma { margin-top: 10mm; border-top: 1px solid #000; text-align: center; font-size: 10px; padding-top: 2px; }
  </style>
</head>
<body>
  <div class="ticket">

    <!-- LOGO -->
    <div class="center" style="margin-bottom:4px;">
      <img src="/tajima.png" alt="TAJIMA" style="width:30mm; height:auto; display:block; margin:0 auto;" />
    </div>

    <!-- ENCABEZADO EMPRESA -->
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

    <!-- NÚMERO DE PROFORMA -->
    <div class="center bold" style="font-size:11px; margin-bottom:1px;">PROFORMA</div>
    <div class="num-proforma">N° ${safe(formatProforma(p.id))}</div>

    <hr class="sep-dashed"/>

    <!-- FECHA / HORA -->
    <div class="info-row"><span>Fecha:</span><span>${fechaPrint}</span></div>
    <div class="info-row"><span>Hora:</span><span>${horaPrint}</span></div>

    <hr class="sep-dashed"/>

    <!-- CLIENTE -->
    <div class="info-row"><span>Cliente:</span><span class="wrap">${safe(p.cliente || "-")}</span></div>
    <div class="info-row"><span>Celular:</span><span>${safe(p.celular || "-")}</span></div>
    <div class="info-row"><span>Entregado:</span><span>${Number(p.entregado) ? "SÍ" : "NO"}</span></div>
    ${fechaEntregaPrint ? `<div class="info-row"><span>F. entrega:</span><span>${fechaEntregaPrint} ${horaEntregaPrint}</span></div>` : ""}
    ${notasHTML}

    <hr class="sep-solid"/>

    <!-- DETALLE DE PRODUCTOS -->
    <table>
      <thead>
        <tr>
          <th style="width:30px;" class="td-right">Cant</th>
          <th class="td-left">Detalle</th>
          <th style="width:55px;" class="td-right">P/U</th>
          <th style="width:60px;" class="td-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${filas || `<tr><td colspan="4" class="td-left" style="padding:4px;">(Sin ítems)</td></tr>`}
      </tbody>
    </table>

    <!-- TOTALES -->
    <div class="totals">
      <div class="t-row"><span>Anticipo:</span><span>${money(p.anticipo ?? 0)}</span></div>
      <div class="t-row"><span>Total:</span><span>${money(p.total_general ?? 0)}</span></div>
      <div class="t-row grande"><span>SALDO:</span><span>${money(p.saldo ?? 0)}</span></div>
    </div>

    <div class="firma">Firma / Sello</div>

  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>
    `;

    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) {
      swal("Bloqueado", "Tu navegador bloqueó la ventana de impresión. Permite pop-ups.", "warning");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };
  //FIN IMPRESION TERMICA

  useEffect(() => {
    if (proformas.length !== 0) {
      const tArray = proformas.map((obj, i) => ({
        sl: i + 1,
        id: formatProforma(obj.id),
        cliente: obj.cliente || "",

        total_general: Number(obj.total_general || 0).toFixed(2),
        saldo: Number(obj.saldo || 0).toFixed(2),

        fecha: obj.fecha ? moment.utc(obj.fecha).format("D [de] MMMM, YYYY") : "",
        fecha_entrega: obj.fecha_entrega ? moment.utc(obj.fecha_entrega).format("D [de] MMMM, YYYY") : "",
        hora_entrega: obj.hora_entrega ? String(obj.hora_entrega).slice(0, 5) : "",

        action: (
          <div className="actionGrid">
            {Number(obj?.saldo) > 0 && (
              <button className="btn primary" onClick={clickNoFocusAsync(() => cobrarProforma(obj.id, obj.saldo))}>
                Cobrar
              </button>
            )}

            {Number(obj?.entregado) !== 1 && (
              <button className="btn success" onClick={clickNoFocusAsync(() => entregarProforma(obj.id, obj.saldo))}>
                Entregar
              </button>
            )}

            <button className="btn warning" onClick={clickNoFocusAsync(() => openViewModal(obj))}>
              Ver
            </button>

            {permission?.delete && (
              <button className="btn danger" onClick={clickNoFocusAsync(() => deleteProforma(obj.id))}>
                Eliminar
              </button>
            )}
          </div>
        ),

        _rowClass: rowClassByEntregado(obj),
      }));

      setData(tArray);
    } else {
      setData([]);
    }
  }, [proformas, permission]);

  return (
    <div className="products">
      <div className="products-scroll">
        <div className="proformas-header">


          {/* FILTROS (arriba) */}
          <div className="filters-bar">
            <div className="filters-left">
              <label>
                Desde:
                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </label>

              <label>
                Hasta:
                <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </label>

              <button className="btn primary" onClick={filtrarPorFechas}>
                Filtrar
              </button>

              <button className="btn warning" onClick={imprimirReporteProformas}>
                Imprimir reporte
              </button>
            </div>
          </div>

          {/* TITULO + BOTON (abajo, como Gastos/Ventas) */}
          <div className="title-row">
            <div className="title">Proformas</div>

            {permission?.create && (
              <Link to="/proformas/addnew" className="btn success" style={{ textDecoration: "none" }}>
                Agregar nueva
              </Link>
            )}
          </div>

        </div>

        {pageState === 1 ? (
          <Loader />
        ) : pageState === 2 ? (
          <div className="card">
            <div className="container">
              <Table
                headers={["N°", "Proforma", "Cliente", "Total", "Saldo", "Fecha", "Fecha entrega", "Hora entrega", "Acción"]}
                columnOriginalNames={[
                  ["sl", ""],
                  ["id", ""],
                  ["cliente", ""],
                  ["total_general", ""],
                  ["saldo", ""],
                  ["fecha", ""],
                  ["fecha_entrega", ""],
                  ["hora_entrega", ""],
                  ["action", ""],
                ]}
                data={data}
                data_count={count}
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                current_page={tablePage}
                tablePageChangeFunc={setTablePage}
                rowClassNameKey="_rowClass"
                setSortColumn={setSortColumn}
                setSortOrder={setSortOrder}
                sortColumn={sortColumn}
                sortOrder={sortOrder}
              />
            </div>
          </div>
        ) : (
          <Error />
        )}


        <Modal show={viewModalShow} onHide={closeViewModal} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>Detalle de Proforma</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {selected && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <div>
                      <b>Proforma:</b> {formatProforma(selected.id)}
                    </div>
                    <div>
                      <b>Cliente:</b> {selected.cliente || "-"}
                    </div>
                    <div>
                      <b>Celular:</b> {selected.celular || "-"}
                    </div>
                  </div>

                  <div>
                    <div>
                      <b>Fecha:</b>{" "}
                      {selected.fecha ? moment.utc(selected.fecha).format("D [de] MMMM, YYYY") : "-"}
                    </div>
                    <div>
                      <b>Hora:</b> {selected.hora || "-"}
                    </div>

                    <div>
                      <b>Fecha entrega:</b>{" "}
                      {selected.fecha_entrega ? moment.utc(selected.fecha_entrega).format("D [de] MMMM, YYYY") : "-"}
                    </div>
                    <div>
                      <b>Hora entrega:</b> {selected.hora_entrega ? String(selected.hora_entrega).slice(0, 5) : "-"}
                    </div>

                    <div>
                      <b>Estado:</b> {selected.estado || "-"}
                    </div>
                    <div>
                      <b>Entregado:</b> {selected.entregado ? "Sí" : "No"}
                    </div>
                  </div>
                </div>

                <hr />

                <div style={{ overflowX: "auto" }}>
                  <table className="table table-bordered" style={{ width: "100%", minWidth: "650px" }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Cant.</th>
                        <th>Detalle</th>
                        <th>Oferta</th>
                        <th>Precio</th>
                        <th>Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {(selected.detalle || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center" }}>
                            Sin ítems
                          </td>
                        </tr>
                      ) : (
                        (selected.detalle || []).map((it, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>{it.cantidad ?? "-"}</td>
                            <td style={{ whiteSpace: "pre-wrap" }}>{it.detalle ?? "-"}</td>
                            <td>{it.oferta ?? "Sin oferta"}</td>
                            <td>{it.precio_unitario ?? "-"}</td>
                            <td>{it.total ?? "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", marginTop: "1rem", gap: "12px", flexWrap: "wrap" }}>
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => imprimirProforma(selected)}
                    style={{ minWidth: "120px" }}
                  >
                    Imprimir
                  </button>

                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => imprimirProformaTermica(selected)}
                    style={{ minWidth: "130px" }}
                  >
                    🧾 Imprimir Térmica
                  </button>

                  <div style={{ minWidth: "280px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span><b>Total:</b></span>
                      <span>{selected.total_general ?? 0}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span><b>Anticipo / Monto pagado:</b></span>
                      <span>{selected.anticipo ?? 0}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span><b>Saldo:</b></span>
                      <span>{selected.saldo ?? 0}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </Modal.Body>
        </Modal>
      </div>
    </div >
  );
}

export default Proformas;

import React, { useEffect, useMemo, useState } from "react";
import "./proformas.scss";

import swal from "sweetalert";
import Error from "../PageStates/Error";
import Loader from "../PageStates/Loader";

// Fecha local (YYYY-MM-DD)
const getLocalISODate = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Hora local (HH:MM en formato 24h)
const getLocalTimeHHMM = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

function ProformasAddNew() {
  const [pageState, setPageState] = useState(1);
  const [permission, setPermission] = useState(null);


  const [notas, setNotas] = useState("");

  // Fecha/Hora local
  const todayISO = getLocalISODate();
  const nowHHMM = getLocalTimeHHMM();

  // Cabecera
  const [fecha, setFecha] = useState(todayISO);
  const [hora, setHora] = useState(nowHHMM);

  const [fechaEntrega, setFechaEntrega] = useState(todayISO);
  const [horaEntrega, setHoraEntrega] = useState(nowHHMM);

  // Cliente
  const [cliente, setCliente] = useState("");
  const [celular, setCelular] = useState("");

  // Montos
  const [anticipo, setAnticipo] = useState("0");
  const [descuento, setDescuento] = useState("0");

  // Ofertas (combo)
  const OFERTAS = [
    { label: "Sin oferta", cantidad: null, precio_total: null },
    { label: "2 x 20", cantidad: 2, precio_total: 20 },
    { label: "2 x 30", cantidad: 2, precio_total: 30 },
    { label: "4 x 30", cantidad: 4, precio_total: 30 },
  ];

  // Filas (detalle)
  const [rows, setRows] = useState([
    {
      cantidad: "1",
      detalle: "",
      foto_preview: null,
      foto_nombre: "",
      precio_unitario: "0",
      oferta: "Sin oferta",
    },
  ]);

  const [submitButtonState, setSubmitButtonState] = useState(false);
  const [proformaCreada, setProformaCreada] = useState("");

  const [previewImage, setPreviewImage] = useState(null);
  const [previewImageName, setPreviewImageName] = useState("");
  // Permisos
  useEffect(() => {
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
              if (p?.view && p?.create) setPermission(p);
              else window.location.href = "/unauthorized";
            });
        } else {
          window.location.href = "/login";
        }
      })
      .catch(console.log);
  }, []);

  useEffect(() => {
    if (permission !== null) setPageState(2);
  }, [permission]);

  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const money = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return "0.00";
    return num.toFixed(2);
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        cantidad: "1",
        detalle: "",
        foto_preview: null,
        foto_nombre: "",
        precio_unitario: "0",
        oferta: "Sin oferta",
      },
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

  const handleRowPhotoChange = (index, file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setRows((prev) =>
        prev.map((r, i) =>
          i === index
            ? {
              ...r,
              foto_preview: reader.result,
              foto_nombre: file.name || "",
            }
            : r
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const clearRowPhoto = (index) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
            ...r,
            foto_preview: null,
            foto_nombre: "",
          }
          : r
      )
    );
  };

  const rowsWithTotals = useMemo(() => {
    return rows.map((r) => {
      const cantidad = Math.max(0, toNumber(r.cantidad));
      const precio = Math.max(0, toNumber(r.precio_unitario));
      const total = cantidad * precio;
      return { ...r, total };
    });
  }, [rows]);

  const totalGeneral = useMemo(() => {
    return rowsWithTotals.reduce((acc, r) => acc + toNumber(r.total), 0);
  }, [rowsWithTotals]);

  const saldo = useMemo(() => {
    return totalGeneral - Math.max(0, toNumber(anticipo)) - Math.max(0, toNumber(descuento));
  }, [totalGeneral, anticipo, descuento]);

  //  IMPRESION
  const imprimirProforma = (p) => {
    const items = Array.isArray(p.items) ? p.items : [];

    const filas = items
      .map((it) => {
        const cant = toNumber(it.cantidad);
        const pu = toNumber(it.precio_unitario);
        const tot = toNumber(it.total);

        const ofertaTxt =
          it.oferta && it.oferta !== "Sin oferta" ? `(${it.oferta})` : "";

        const det = String(it.detalle || "").replace(/\n/g, "<br/>");

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

    const notasHTML = p.notas
      ? `<div class="small wrap" style="margin-top:8px;"><b>Notas:</b> ${String(p.notas).replace(/\n/g, "<br/>")}</div>`
      : "";

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Proforma ${p.proforma_id || ""}</title>
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
      ${p.proforma_id || "--"}
    </span>
  </div>
  <div>Fecha: <b>${p.fecha || ""}</b></div>
  <div>Hora: <b>${p.hora || ""}</b></div>
</div>

    </div>

    <hr />

    <div class="mid small">
      <div class="mid-left wrap">
        <div><b>Cliente:</b> ${p.cliente || ""}</div>
        <div><b>Celular:</b> ${p.celular || ""}</div>
        ${notasHTML}
      </div>
      <div class="mid-right">
        <div><b>Entregado:</b> ${p.entregado ? "SI" : "NO"}</div>
        <div class="muted"><b> Fecha de entrega:</b> ${p.fecha_entrega || ""} ${p.hora_entrega || ""}</div>
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
        <tr><td>Total</td><td>${money(p.total_general)}</td></tr>
        <tr><td>Anticipo</td><td>${money(p.anticipo)}</td></tr>        
        <tr><td>Descuento</td><td>${money(p.descuento ?? 0)}</td></tr>
        <tr><td>Saldo</td><td>${money(p.saldo)}</td></tr>
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

    const items = Array.isArray(p.items) ? p.items : [];

    const filas = items
      .map((it) => {
        const cant = toNumber(it.cantidad);
        const pu = toNumber(it.precio_unitario);
        const tot = toNumber(it.total);
        const ofertaTxt =
          it.oferta && it.oferta !== "Sin oferta"
            ? `<div class="oferta">${safe(it.oferta)}</div>`
            : "";
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

    const fechaPrint = p.fecha || "";
    const horaPrint = p.hora ? String(p.hora).slice(0, 8) : "";
    const fechaEntregaPrint = p.fecha_entrega || "";
    const horaEntregaPrint = p.hora_entrega ? String(p.hora_entrega).slice(0, 5) : "";

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Proforma ${safe(p.proforma_id || "")}</title>
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

    .info-row { display: flex; justify-content: space-between; font-size: 10px; gap: 6px; }
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
    .td-left   { text-align: left; }

    .totals { margin-top: 4px; font-size: 11px; }
    .totals .t-row { display: flex; justify-content: space-between; padding: 1px 0; }
    .totals .t-row.grande {
      font-size: 13px;
      font-weight: 800;
      border-top: 1px solid #000;
      margin-top: 2px;
      padding-top: 2px;
      -webkit-text-stroke: 0.4px #000;
      text-shadow: 0.4px 0 0 #000;
    }

    .firma { margin-top: 10mm; border-top: 1px solid #000; text-align: center; font-size: 10px; padding-top: 2px; }
  </style>
</head>
<body>
  <div class="ticket">

    <div class="center" style="margin-bottom:4px;">
      <img src="/tajima.png" alt="TAJIMA" style="width:30mm; height:auto; display:block; margin:0 auto;" />
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

    <div class="center bold" style="font-size:11px; margin-bottom:1px;">PROFORMA</div>
    <div class="num-proforma">N° ${safe(p.proforma_id || "--")}</div>

    <hr class="sep-dashed"/>

    <div class="info-row"><span>Fecha:</span><span>${fechaPrint}</span></div>
    <div class="info-row"><span>Hora:</span><span>${horaPrint}</span></div>

    <hr class="sep-dashed"/>

    <div class="info-row"><span>Cliente:</span><span class="wrap">${safe(p.cliente || "-")}</span></div>
    <div class="info-row"><span>Celular:</span><span>${safe(p.celular || "-")}</span></div>
    <div class="info-row"><span>Entregado:</span><span>${Number(p.entregado) ? "SÍ" : "NO"}</span></div>
    ${fechaEntregaPrint ? `<div class="info-row"><span>F. entrega:</span><span>${fechaEntregaPrint} ${horaEntregaPrint}</span></div>` : ""}
    ${notasHTML}

    <hr class="sep-solid"/>

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

    <div class="totals">
      <div class="t-row"><span>Total:</span><span>${money(p.total_general ?? 0)}</span></div>
      <div class="t-row"><span>Anticipo:</span><span>${money(p.anticipo ?? 0)}</span></div>      
      <div class="t-row"><span>Descuento:</span><span>${money(p.descuento ?? 0)}</span></div>
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
  const insertProforma = async () => {
    if (fecha.trim() === "") return swal("¡Ups!", "La fecha no puede estar vacía", "error");
    if (hora.trim() === "") return swal("¡Ups!", "La hora no puede estar vacía", "error");
    if (cliente.trim() === "") return swal("¡Ups!", "El cliente no puede estar vacío", "error");

    const validItems = rowsWithTotals.filter(
      (r) =>
        String(r.detalle || "").trim() !== "" &&
        toNumber(r.cantidad) > 0 &&
        toNumber(r.precio_unitario) > 0
    );

    if (validItems.length === 0) {
      swal("¡Ups!", "Agrega al menos 1 ítem válido", "error");
      return;
    }

    setSubmitButtonState(true);

    const horaDB = hora.length === 5 ? `${hora}:00` : hora;
    const horaEntregaDB = horaEntrega
      ? horaEntrega.length === 5
        ? `${horaEntrega}:00`
        : horaEntrega
      : null;

    const payload = {
      fecha,
      hora: horaDB,
      fecha_entrega: fechaEntrega || null,
      hora_entrega: horaEntregaDB,

      customer_id: null,

      cliente: cliente.trim(),
      celular: celular.trim(),


      notas: notas.trim() === "" ? null : notas.trim(),

      anticipo: toNumber(anticipo),
      descuento: toNumber(descuento),

      detalle: validItems.map((r) => ({
        cantidad: String(r.cantidad),
        detalle: String(r.detalle),
        foto_preview: r.foto_preview || null,
        foto_nombre: r.foto_nombre || "",
        precio_unitario: String(r.precio_unitario),
        oferta: String(r.oferta || "Sin oferta"),
        total: r.total,
      })),


      total_general: totalGeneral,
      saldo,

      estado: "ACTIVA",
      entregado: 0,
    };

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/add_proforma`, {
        method: "POST",
        headers: { "Content-type": "application/json; charset=UTF-8" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const body = await response.json();
      setSubmitButtonState(false);

      if (body.operation === "success") {
        const proformaId = body?.info?.proforma_id || "";
        setProformaCreada(proformaId);

        swal({
          title: "¡Éxito!",
          text: `Proforma creada (${proformaId})`,
          icon: "success",
          buttons: {
            ok: { text: "OK", value: "ok", visible: true, closeModal: true },
            thermal: { text: "Imprimir Térmica", value: "thermal", visible: true, closeModal: true },
            print: { text: "Imprimir", value: "print", visible: true, closeModal: true },
          },
        }).then((value) => {
          const proformaPrintData = {
            proforma_id: proformaId,
            fecha,
            hora: horaDB,
            cliente,
            celular,
            notas,
            estado: "ACTIVA",
            entregado: 0,
            fecha_entrega: fechaEntrega,
            hora_entrega: horaEntregaDB || "",
            anticipo: toNumber(anticipo),
            descuento: toNumber(descuento),
            total_general: totalGeneral,
            saldo,
            items: validItems.map((r) => ({
              cantidad: r.cantidad,
              detalle: r.detalle,
              foto_preview: r.foto_preview || null,
              foto_nombre: r.foto_nombre || "",
              precio_unitario: r.precio_unitario,
              oferta: r.oferta,
              total: r.total,
            })),

          };

          if (value === "print") {
            imprimirProforma(proformaPrintData);
          }

          if (value === "thermal") {
            imprimirProformaTermica(proformaPrintData);
          }
        });

        // Reset
        setFecha(getLocalISODate());
        setHora(getLocalTimeHHMM());
        setFechaEntrega("");
        setHoraEntrega("");

        setCliente("");
        setCelular("");
        setNotas(""); //  reset notas
        setAnticipo("0");
        setDescuento("0");
        setRows([
          {
            cantidad: "1",
            detalle: "",
            foto_preview: null,
            foto_nombre: "",
            precio_unitario: "0",
            oferta: "Sin oferta",
          },
        ]);

      } else {
        swal("¡Ups!", body.message || "No se pudo crear la proforma", "error");
      }
    } catch (err) {
      console.log(err);
      setSubmitButtonState(false);
      swal("¡Ups!", "Error de conexión con el servidor", "error");
    }
  };

  // layout
  const topRow = { display: "flex", gap: "18px", marginTop: "10px", flexWrap: "wrap", alignItems: "flex-end" };
  const boxCliente = { flex: "1 1 420px", minWidth: 260 };
  const boxSmall = { flex: "0 0 160px", minWidth: 140 }; //  más chico para fecha/hora

  const secondRow = { display: "flex", gap: "18px", marginTop: "10px", flexWrap: "wrap", alignItems: "flex-end" };
  const boxNota = { flex: "1 1 420px", minWidth: 260 };
  const boxCel = { flex: "0 0 220px", minWidth: 200 };

  return (
    <div className="productaddnew proformas-add">
      <div className="product-header">
        <div className="title">Agregar nueva proforma</div>

        <div style={{ marginTop: "0.25rem", fontSize: "0.9rem", color: "#666" }}>
          Proforma N°: <b>{proformaCreada ? proformaCreada : "Se asignará automáticamente"}</b>
        </div>
      </div>

      {pageState === 1 ? (
        <Loader />
      ) : pageState === 2 ? (
        <div className="card" style={{ maxHeight: "75vh", overflowY: "auto" }}>
          <div className="container" style={{ paddingBottom: "3rem" }}>

            {/*  FILA 1: CLIENTE + FECHA + HORA */}
            <div style={topRow}>
              <div style={boxCliente}>
                <label className="fw-bold">Cliente</label>
                <input className="my_input" type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} />
              </div>

              <div style={boxSmall}>
                <label className="fw-bold">Fecha</label>
                <input className="my_input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>

              <div style={boxSmall}>
                <label className="fw-bold">Hora</label>
                <input className="my_input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
              </div>
            </div>

            {/*  FILA 2: NOTA + CELULAR + ENTREGA */}
            <div style={secondRow}>
              <div style={boxNota}>
                <label className="fw-bold">Notas</label>
                <textarea
                  className="my_input"
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas adicionales..."
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={boxCel}>
                <label className="fw-bold">Celular</label>
                <input className="my_input" type="text" value={celular} onChange={(e) => setCelular(e.target.value)} />
              </div>

              <div style={boxSmall}>
                <label className="fw-bold">Fecha entrega</label>
                <input className="my_input" type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
              </div>

              <div style={boxSmall}>
                <label className="fw-bold">Hora entrega</label>
                <input className="my_input" type="time" value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)} />
              </div>
            </div>

            <hr />

            {rowsWithTotals.map((r, idx) => (
              <div key={idx} className="row" style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <div style={{ flex: "0 0 140px" }}>
                  <label>Cantidad</label>
                  <input className="my_input" type="number" value={r.cantidad} onChange={(e) => updateRow(idx, "cantidad", e.target.value)} />
                </div>

                <div style={{ flex: "1 1 420px", minWidth: "240px" }}>
                  <label>Detalle</label>
                  <textarea
                    className="my_input"
                    rows={1}
                    style={{
                      resize: "none",
                      overflow: "hidden",
                      minHeight: "38px",
                      lineHeight: "1.2",
                      paddingTop: "8px",
                      paddingBottom: "8px",
                      width: "100%",
                    }}
                    value={r.detalle}
                    onChange={(e) => {
                      updateRow(idx, "detalle", e.target.value);
                      e.target.style.height = "38px";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                  />
                </div>

                <div style={{ flex: "0 0 160px" }}>
                  <label>Foto</label>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label
                      className="btn info"
                      style={{
                        textAlign: "center",
                        cursor: "pointer",
                        marginBottom: 0,
                      }}
                    >
                      {r.foto_preview ? "Cambiar foto" : "Subir foto"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => handleRowPhotoChange(idx, e.target.files?.[0] || null)}
                      />
                    </label>

                    {r.foto_preview ? (
                      <div
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          padding: "6px",
                          background: "#fafafa",
                        }}
                      >
                        <img
                          src={r.foto_preview}
                          alt={r.foto_nombre || `foto-${idx + 1}`}
                          onClick={() => {
                            setPreviewImage(r.foto_preview);
                            setPreviewImageName(r.foto_nombre || `foto-${idx + 1}`);
                          }}
                          style={{
                            width: "100%",
                            height: "80px",
                            objectFit: "cover",
                            borderRadius: "4px",
                            display: "block",
                            cursor: "pointer",
                          }}
                        />


                        <div
                          style={{
                            fontSize: "11px",
                            marginTop: "4px",
                            wordBreak: "break-word",
                            color: "#555",
                          }}
                        >
                          {r.foto_nombre || "Imagen cargada"}
                        </div>

                        <button
                          type="button"
                          className="btn danger"
                          style={{ marginTop: "6px", width: "100%" }}
                          onClick={() => clearRowPhoto(idx)}
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          height: "80px",
                          border: "1px dashed #bbb",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#777",
                          fontSize: "12px",
                          background: "#fafafa",
                        }}
                      >
                        Sin foto
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ flex: "0 0 140px" }}>
                  <label>Precio</label>
                  <input className="my_input" type="number" value={r.precio_unitario} onChange={(e) => updateRow(idx, "precio_unitario", e.target.value)} />
                </div>


                <div style={{ flex: "0 0 150px" }}>
                  <label>Oferta</label>
                  <select
                    className="my_input"
                    value={r.oferta || "Sin oferta"}
                    onChange={(e) => {
                      const ofertaSel = OFERTAS.find((o) => o.label === e.target.value);
                      if (!ofertaSel || ofertaSel.cantidad === null) {
                        updateRow(idx, "oferta", "Sin oferta");
                        return;
                      }
                      updateRow(idx, "oferta", ofertaSel.label);
                      updateRow(idx, "cantidad", String(ofertaSel.cantidad));
                      updateRow(idx, "precio_unitario", String(ofertaSel.precio_total / ofertaSel.cantidad));
                    }}
                  >
                    {OFERTAS.map((o, i) => (
                      <option key={i} value={o.label}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: "0 0 140px" }}>
                  <label>Total</label>
                  <input className="my_input" value={r.total} readOnly />
                </div>

                <div style={{ flex: "0 0 60px", paddingTop: "22px" }}>
                  {rowsWithTotals.length > 1 && (
                    <button className="btn danger" onClick={() => removeRow(idx)}>
                      X
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button className="btn warning" onClick={addRow}>
              + Agregar ítem
            </button>

            <hr />

            <div className="row">
              <div className="col">
                <label>Anticipo</label>
                <input className="my_input" type="number" value={anticipo} onChange={(e) => setAnticipo(e.target.value)} />
              </div>
              <div className="col">
                <label>Total</label>
                <input className="my_input" value={totalGeneral} readOnly />
              </div>
              <div className="col">
                <label>Descuento</label>
                <input className="my_input" type="number" value={descuento} onChange={(e) => setDescuento(e.target.value)} />
              </div>
              <div className="col">
                <label>Saldo</label>
                <input className="my_input" value={saldo} readOnly />
              </div>
            </div>

            <div className="d-flex justify-content-center">
              <button className="btn success" disabled={submitButtonState} onClick={insertProforma}>
                Guardar
              </button>
            </div>

          </div>
        </div>
      ) : (
        <Error />
      )}
      {previewImage && (
        <div
          onClick={() => {
            setPreviewImage(null);
            setPreviewImageName("");
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "transparent",
              maxWidth: "90vw",
              maxHeight: "90vh"
            }}
          >
            <button
              type="button"
              onClick={() => {
                setPreviewImage(null);
                setPreviewImageName("");
              }}
              style={{
                position: "absolute",
                top: "-12px",
                right: "-12px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "none",
                background: "#fff",
                cursor: "pointer",
                fontSize: "18px",
                fontWeight: "bold",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)"
              }}
            >
              ×
            </button>

            <img
              src={previewImage}
              alt={previewImageName || "vista previa"}
              style={{
                display: "block",
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "6px",
                boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
                background: "#fff"
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ProformasAddNew;
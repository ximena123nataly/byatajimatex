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

  // ✅ NOTAS (ahora sí dentro del componente)
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

  // Ofertas (combo)
  const OFERTAS = [
    { label: "Sin oferta", cantidad: null, precio_total: null },
    { label: "2 x 20", cantidad: 2, precio_total: 20 },
    { label: "2 x 30", cantidad: 2, precio_total: 30 },
    { label: "4 x 30", cantidad: 4, precio_total: 30 },
  ];

  // Filas (detalle)
  const [rows, setRows] = useState([
    { cantidad: "1", detalle: "", precio_unitario: "0", oferta: "Sin oferta" },
  ]);

  const [submitButtonState, setSubmitButtonState] = useState(false);
  const [proformaCreada, setProformaCreada] = useState("");

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
      { cantidad: "1", detalle: "", precio_unitario: "0", oferta: "Sin oferta" },
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
    return totalGeneral - Math.max(0, toNumber(anticipo));
  }, [totalGeneral, anticipo]);

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
        <tr><td>Anticipo</td><td>${money(p.anticipo)}</td></tr>
        <tr><td>Total</td><td>${money(p.total_general)}</td></tr>
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

      //  ENVIAR NOTAS
      notas: notas.trim() === "" ? null : notas.trim(),

      anticipo: toNumber(anticipo),

      detalle: validItems.map((r) => ({
        cantidad: String(r.cantidad),
        detalle: String(r.detalle),
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
            cancel: { text: "OK", value: "ok", visible: true, closeModal: true },
            imprimir: { text: "Imprimir", value: "print", visible: true, closeModal: true },
          },
        }).then((value) => {
          if (value === "print") {
            imprimirProforma({
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
              total_general: totalGeneral,
              saldo,
              items: validItems.map((r) => ({
                cantidad: r.cantidad,
                detalle: r.detalle,
                precio_unitario: r.precio_unitario,
                oferta: r.oferta,
                total: r.total,
              })),
            });
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
        setRows([{ cantidad: "1", detalle: "", precio_unitario: "0", oferta: "Sin oferta" }]);
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
    <div className="productaddnew" style={{ overflowY: "auto", paddingBottom: "2rem" }}>
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

            {/*  FILA 1: CLIENTE + FECHA + HORA (fecha/hora más chicos) */}
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
    </div>
  );
}

export default ProformasAddNew;

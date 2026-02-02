import React, { useEffect, useMemo, useState } from "react";
import "./proformas.scss";

import swal from "sweetalert";
import Error from "../PageStates/Error";
import Loader from "../PageStates/Loader";

function ProformasAddNew() {
  const [pageState, setPageState] = useState(1);
  const [permission, setPermission] = useState(null);

  // Cabecera
  const todayISO = new Date().toISOString().slice(0, 10);

  const [fecha, setFecha] = useState(todayISO);
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5)); // HH:MM

  const [fechaEntrega, setFechaEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");

  const [entregado, setEntregado] = useState(false);
  const [estado, setEstado] = useState("ACTIVA");

  const [cliente, setCliente] = useState("");
  const [celular, setCelular] = useState("");

  // Montos
  const [anticipo, setAnticipo] = useState("0");

  // ✅ Ofertas (combo)
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

  // Seguridad / Permisos
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

  // ✅ IMPRESION (Media hoja carta)
  const imprimirProforma = (p) => {
    const items = Array.isArray(p.items) ? p.items : [];

    const filas = items
      .map((it) => {
        const cant = toNumber(it.cantidad);
        const pu = toNumber(it.precio_unitario);
        const tot = toNumber(it.total);
        const oferta = (it.oferta && it.oferta !== "Sin oferta") ? ` (${it.oferta})` : "";
        const det = String(it.detalle || "").replace(/\n/g, "<br/>");
        return `
          <tr>
            <td style="width:40px; text-align:right; padding:4px 6px;">${cant}</td>
            <td style="padding:4px 6px;">${det}${oferta}</td>
            <td style="width:70px; text-align:right; padding:4px 6px;">${money(pu)}</td>
            <td style="width:80px; text-align:right; padding:4px 6px;">${money(tot)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Proforma ${p.proforma_id || ""}</title>
  <style>
    @page { size: letter; margin: 0; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111; }

    /* Media hoja (mitad de carta) centrada */
    .ticket {
      width: 8.5in;
      height: 5.5in;
      box-sizing: border-box;
      padding: 0.35in 0.45in;
    }

    .row { display:flex; justify-content: space-between; gap: 12px; }
    .title { font-size: 16px; font-weight: 700; }
    .small { font-size: 12px; }
    .muted { color: #555; }

    .box {
      border-top: 1px solid #ddd;
      margin-top: 10px;
      padding-top: 10px;
    }

    table { width: 100%; border-collapse: collapse; }
    thead th {
      font-size: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
      padding: 6px;
    }
    tbody td { font-size: 12px; border-bottom: 1px dashed #eee; vertical-align: top; }
    .totals { margin-top: 10px; display:flex; justify-content: flex-end; }
    .totals table { width: 260px; }
    .totals td { font-size: 12px; padding: 4px 6px; }
    .totals tr td:first-child { text-align: left; }
    .totals tr td:last-child { text-align: right; font-weight: 700; }

    .footer { margin-top: 10px; font-size: 11px; color: #555; }
    .badge { font-weight: 700; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="row">
      <div>
        <div class="title">PROFORMA</div>
        <div class="small muted">N°: <span class="badge">${p.proforma_id || "--"}</span></div>
      </div>
      <div class="small" style="text-align:right;">
        <div>Fecha: <b>${p.fecha || ""}</b></div>
        <div>Hora: <b>${p.hora || ""}</b></div>
      </div>
    </div>

    <div class="box">
      <div class="row small">
        <div>
          <div><b>Cliente:</b> ${p.cliente || ""}</div>
          <div><b>Celular:</b> ${p.celular || ""}</div>
        </div>
        <div style="text-align:right;">
          <div><b>Estado:</b> ${p.estado || ""}</div>
          <div><b>Entregado:</b> ${p.entregado ? "SI" : "NO"}</div>
        </div>
      </div>

      ${
        p.fecha_entrega || p.hora_entrega
          ? `<div class="small muted" style="margin-top:6px;">
               Entrega: <b>${p.fecha_entrega || ""}</b> <b>${p.hora_entrega || ""}</b>
             </div>`
          : ""
      }
    </div>

    <div class="box">
      <table>
        <thead>
          <tr>
            <th style="width:40px; text-align:right;">Cant</th>
            <th>Detalle</th>
            <th style="width:70px; text-align:right;">P/U</th>
            <th style="width:80px; text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${filas || `<tr><td colspan="4" style="padding:8px; font-size:12px;">(Sin ítems)</td></tr>`}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr><td>Anticipo</td><td>${money(p.anticipo)}</td></tr>
          <tr><td>Total</td><td>${money(p.total_general)}</td></tr>
          <tr><td>Saldo</td><td>${money(p.saldo)}</td></tr>
        </table>
      </div>

      <div class="footer">
       
      </div>
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
    if (fecha.trim() === "") {
      swal("¡Ups!", "La fecha no puede estar vacía", "error");
      return;
    }
    if (hora.trim() === "") {
      swal("¡Ups!", "La hora no puede estar vacía", "error");
      return;
    }
    if (cliente.trim() === "") {
      swal("¡Ups!", "El cliente no puede estar vacío", "error");
      return;
    }

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

    // asegurar HH:MM:SS
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

      // customer_id interno (por ahora null)
      customer_id: null,

      cliente: cliente.trim(),
      celular: celular.trim(),

      anticipo: toNumber(anticipo),

      // guardamos también oferta
      detalle: validItems.map((r) => ({
        cantidad: String(r.cantidad),
        detalle: String(r.detalle),
        precio_unitario: String(r.precio_unitario),
        oferta: String(r.oferta || "Sin oferta"),
        total: r.total,
      })),

      total_general: totalGeneral,
      saldo,

      estado,
      entregado: entregado ? 1 : 0,
    };

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_ORIGIN}/add_proforma`,
        {
          method: "POST",
          headers: { "Content-type": "application/json; charset=UTF-8" },
          body: JSON.stringify(payload),
          credentials: "include",
        }
      );

      const body = await response.json();
      setSubmitButtonState(false);

      if (body.operation === "success") {
        const proformaId = body?.info?.proforma_id || "";
        setProformaCreada(proformaId);

        // ✅ SWEETALERT con boton IMPRIMIR
        swal({
          title: "¡Éxito!",
          text: `Proforma creada (${proformaId})`,
          icon: "success",
          buttons: {
            cancel: {
              text: "OK",
              value: "ok",
              visible: true,
              closeModal: true,
            },
            imprimir: {
              text: "Imprimir",
              value: "print",
              visible: true,
              closeModal: true,
            },
          },
        }).then((value) => {
          if (value === "print") {
            imprimirProforma({
              proforma_id: proformaId,
              fecha,
              hora: horaDB,
              cliente,
              celular,
              estado,
              entregado,
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

        // Reset formulario (no borramos proformaCreada)
        setFecha(todayISO);
        setHora(new Date().toTimeString().slice(0, 5));
        setFechaEntrega("");
        setHoraEntrega("");
        setEntregado(false);
        setEstado("ACTIVA");

        setCliente("");
        setCelular("");
        setAnticipo("0");
        setRows([
          { cantidad: "1", detalle: "", precio_unitario: "0", oferta: "Sin oferta" },
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

  return (
    <div className="productaddnew" style={{ overflowY: "auto", paddingBottom: "2rem" }}>
      <div className="product-header">
        <div className="title">Agregar nueva proforma</div>

        <div style={{ marginTop: "0.25rem", fontSize: "0.9rem", color: "#666" }}>
          Proforma N°:{" "}
          <b>{proformaCreada ? proformaCreada : "Se asignará automáticamente"}</b>
        </div>
      </div>

      {pageState === 1 ? (
        <Loader />
      ) : pageState === 2 ? (
        <div className="card" style={{ maxHeight: "75vh", overflowY: "auto" }}>
          <div className="container" style={{ paddingBottom: "3rem" }}>
            {/* Fecha + Hora */}
            <div className="row" style={{ display: "flex", marginTop: "0.5rem" }}>
              <div className="col">
                <label className="fw-bold">Fecha</label>
                <input
                  className="my_input"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>

              <div className="col">
                <label className="fw-bold">Hora</label>
                <input
                  className="my_input"
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                />
              </div>
            </div>

            {/* Cliente + Celular */}
            <div className="row" style={{ display: "flex", marginTop: "0.5rem" }}>
              <div className="col">
                <label className="fw-bold">Cliente</label>
                <input
                  className="my_input"
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                />
              </div>
              <div className="col">
                <label className="fw-bold">Celular</label>
                <input
                  className="my_input"
                  type="text"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                />
              </div>
            </div>

            {/* Estado + Entregado */}
            <div className="row" style={{ display: "flex", marginTop: "0.5rem" }}>
              <div className="col">
                <label className="fw-bold">Estado</label>
                <select
                  className="my_input"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                >
                  <option value="ACTIVA">ACTIVA</option>
                  <option value="ANULADA">ANULADA</option>
                </select>
              </div>

              <div className="col d-flex align-items-end" style={{ gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={entregado}
                  onChange={(e) => setEntregado(e.target.checked)}
                />
                <label className="fw-bold" style={{ margin: 0 }}>
                  Entregado
                </label>
              </div>
            </div>

            {/* Entrega */}
            <div className="row" style={{ display: "flex", marginTop: "0.5rem" }}>
              <div className="col">
                <label className="fw-bold">Fecha entrega</label>
                <input
                  className="my_input"
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                />
              </div>

              <div className="col">
                <label className="fw-bold">Hora entrega</label>
                <input
                  className="my_input"
                  type="time"
                  value={horaEntrega}
                  onChange={(e) => setHoraEntrega(e.target.value)}
                />
              </div>
            </div>

            <hr />

            {/* DETALLE (Detalle más ancho) */}
            {rowsWithTotals.map((r, idx) => (
              <div
                key={idx}
                className="row"
                style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}
              >
                {/* Cantidad */}
                <div style={{ flex: "0 0 140px" }}>
                  <label>Cantidad</label>
                  <input
                    className="my_input"
                    type="number"
                    value={r.cantidad}
                    onChange={(e) => updateRow(idx, "cantidad", e.target.value)}
                  />
                </div>

                {/* Detalle (GRANDE) */}
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

                {/* Precio */}
                <div style={{ flex: "0 0 140px" }}>
                  <label>Precio</label>
                  <input
                    className="my_input"
                    type="number"
                    value={r.precio_unitario}
                    onChange={(e) => updateRow(idx, "precio_unitario", e.target.value)}
                  />
                </div>

                {/* Oferta */}
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
                      updateRow(
                        idx,
                        "precio_unitario",
                        String(ofertaSel.precio_total / ofertaSel.cantidad)
                      );
                    }}
                  >
                    {OFERTAS.map((o, i) => (
                      <option key={i} value={o.label}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Total */}
                <div style={{ flex: "0 0 140px" }}>
                  <label>Total</label>
                  <input className="my_input" value={r.total} readOnly />
                </div>

                {/* X */}
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
                <input
                  className="my_input"
                  type="number"
                  value={anticipo}
                  onChange={(e) => setAnticipo(e.target.value)}
                />
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

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
  const [cliente, setCliente] = useState("");
  const [celular, setCelular] = useState("");
  const [proformaRef, setProformaRef] = useState("");
  // Montos
  const [anticipo, setAnticipo] = useState("0");
  // Filas (items)
  const [rows, setRows] = useState([
    { cantidad: "1", detalle: "", precio_unitario: "0" },
  ]);
  const [submitButtonState, setSubmitButtonState] = useState(false);

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

              if (p?.view && p?.create) {
                setPermission(p);
              } else {
                window.location.href = "/unauthorized";
              }
            });
        } else {
          window.location.href = "/login";
        }
      })
      .catch(console.log);
  }, []);

  useEffect(() => {
    if (permission !== null) {
      setPageState(2);
    }
  }, [permission]);

  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const addRow = () => {
    setRows((prev) => [...prev, { cantidad: "1", detalle: "", precio_unitario: "0" }]);
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index, key, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
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

  const insertProforma = async () => {
    // Validaciones básicas
    if (proformaRef.trim() === "") {
      swal("¡Ups!", "La referencia (Ref) no puede estar vacía", "error");
      return;
    }
    if (fecha.trim() === "") {
      swal("¡Ups!", "La fecha no puede estar vacía", "error");
      return;
    }
    if (cliente.trim() === "") {
      swal("¡Ups!", "El cliente no puede estar vacío", "error");
      return;
    }
    // Validar items
    if (rowsWithTotals.length === 0) {
      swal("¡Ups!", "Debes agregar al menos 1 ítem", "error");
      return;
    }
    // Validar que haya al menos un detalle con monto > 0
    const validItems = rowsWithTotals.filter(
      (r) => r.detalle.trim() !== "" && toNumber(r.cantidad) > 0 && toNumber(r.precio_unitario) > 0
    );

    if (validItems.length === 0) {
      swal("¡Ups!", "Agrega al menos 1 ítem con detalle, cantidad y precio válidos", "error");
      return;
    }

    if (toNumber(anticipo) < 0) {
      swal("¡Ups!", "El anticipo no puede ser negativo", "error");
      return;
    }

    setSubmitButtonState(true);

    const payload = {
      proforma_ref: proformaRef.trim(),
      fecha,
      cliente: cliente.trim(),
      celular: celular.trim(),
      anticipo: toNumber(anticipo),
      items: validItems.map((r) => ({
        cantidad: String(r.cantidad),
        detalle: String(r.detalle),
        precio_unitario: String(r.precio_unitario),
        total: r.total,
      })),
      total_general: totalGeneral,
      saldo,
      estado: "ACTIVA",
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
        swal("¡Éxito!", body.message || "Proforma creada correctamente", "success");

  // Reset formulario
        setFecha(todayISO);
        setCliente("");
        setCelular("");
        setProformaRef("");
        setAnticipo("0");
        setRows([{ cantidad: "1", detalle: "", precio_unitario: "0" }]);

        // opcional: volver al listado
        // window.location.href = "/proformas";
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
    <div className="productaddnew">
      <div className="product-header">
        <div className="title">Agregar nueva proforma</div>
      </div>

      {pageState === 1 ? (
        <Loader />
      ) : pageState === 2 ? (
        <div className="card">
          <div className="container">
            {/* CABECERA */}
            <div className="row" style={{ display: "flex", marginTop: "0.5rem" }}>
              <div className="col">
                <label className="fw-bold">Ref</label>
                <input
                  className="my_input"
                  type="text"
                  value={proformaRef}
                  onChange={(e) => setProformaRef(e.target.value)}
                  placeholder="Ej: PF-0001"
                />
              </div>
              <div className="col">
                <label className="fw-bold">Fecha</label>
                <input
                  className="my_input"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
            </div>

            <div className="row" style={{ display: "flex", marginTop: "0.5rem" }}>
              <div className="col">
                <label className="fw-bold">Cliente</label>
                <input
                  className="my_input"
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div className="col">
                <label className="fw-bold">Celular</label>
                <input
                  className="my_input"
                  type="text"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <hr />

            {/* ITEMS */}
            <div className="row" style={{ display: "flex", marginTop: "0.5rem" }}>
              <div className="col">
                <label className="fw-bold">Ítems</label>
              </div>
            </div>

            {rowsWithTotals.map((r, idx) => (
              <div key={idx} className="row" style={{ display: "flex", marginTop: "0.5rem", gap: "0.5rem" }}>
                <div className="col" style={{ flex: 1 }}>
                  <label className="fw-bold">Cantidad</label>
                  <input
                    className="my_input"
                    type="number"
                    value={r.cantidad}
                    onChange={(e) => updateRow(idx, "cantidad", e.target.value)}
                    min="0"
                  />
                </div>

                <div className="col" style={{ flex: 3 }}>
                  <label className="fw-bold">Detalle</label>
                  <input
                    className="my_input"
                    type="text"
                    value={r.detalle}
                    onChange={(e) => updateRow(idx, "detalle", e.target.value)}
                    placeholder="Ej: 2 polos talla M"
                  />
                </div>

                <div className="col" style={{ flex: 2 }}>
                  <label className="fw-bold">Precio unitario</label>
                  <input
                    className="my_input"
                    type="number"
                    value={r.precio_unitario}
                    onChange={(e) => updateRow(idx, "precio_unitario", e.target.value)}
                    min="0"
                  />
                </div>

                <div className="col" style={{ flex: 2 }}>
                  <label className="fw-bold">Total</label>
                  <input className="my_input" type="number" value={toNumber(r.total)} readOnly />
                </div>

                <div className="col" style={{ display: "flex", alignItems: "end" }}>
                  {rowsWithTotals.length > 1 && (
                    <button className="btn danger" onClick={() => removeRow(idx)}>
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div style={{ marginTop: "0.75rem" }}>
              <button className="btn warning" onClick={addRow}>
                + Agregar ítem
              </button>
            </div>

            <hr />

            {/* TOTALES */}
            <div className="row" style={{ display: "flex", marginTop: "0.5rem" }}>
              <div className="col">
                <label className="fw-bold">Anticipo</label>
                <input
                  className="my_input"
                  type="number"
                  value={anticipo}
                  onChange={(e) => setAnticipo(e.target.value)}
                  min="0"
                />
              </div>

              <div className="col">
                <label className="fw-bold">Total general</label>
                <input className="my_input" type="number" value={toNumber(totalGeneral)} readOnly />
              </div>

              <div className="col">
                <label className="fw-bold">Saldo</label>
                <input className="my_input" type="number" value={toNumber(saldo)} readOnly />
              </div>
            </div>

            {permission?.create && (
              <div className="d-flex justify-content-center">
                <button
                  className="btn success"
                  style={{ alignSelf: "center", marginTop: "1rem" }}
                  disabled={submitButtonState}
                  onClick={() => insertProforma()}
                >
                  {!submitButtonState ? (
                    <span>Guardar</span>
                  ) : (
                    <span>
                      <div className="button-loader"></div>
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Error />
      )}
    </div>
  );
}

export default ProformasAddNew;

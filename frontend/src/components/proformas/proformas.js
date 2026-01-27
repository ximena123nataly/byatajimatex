import React, { useEffect, useMemo, useState } from "react";
import "./proformas.scss";
//CAMBIOS: Ximena
// import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

export default function Proformas() {
  // =========================
  // 1) DATOS BASE / ROUTER
  // =========================

  // Fecha de hoy en formato YYYY-MM-DD para el input type="date"
  const todayISO = new Date().toISOString().slice(0, 10);

  // navigate permite redirigir a otra ruta (ej: volver a /proformas)
  const navigate = useNavigate();

  // useParams toma parámetros de la URL, por ejemplo /proformas/:id
  // si la URL es /proformas/123 entonces id="123"
  const { id } = useParams();

  // isEdit define si estamos creando o editando
  // - false: crear (no hay id)
  // - true: editar (hay id)
  const isEdit = !!id;

  // =========================
  // 2) ESTADOS DEL FORMULARIO
  // =========================

  // Número de proforma visible en pantalla (lo manda backend)
  const [proformaRef, setProformaRef] = useState("—");

  // Campos principales
  const [fecha, setFecha] = useState(todayISO);
  const [cliente, setCliente] = useState("");
  const [celular, setCelular] = useState("");

  // Estado de la proforma (si está CANCELADA, se bloquea edición)
  const [estadoProforma, setEstadoProforma] = useState("ACTIVA"); // ACTIVA | CANCELADA

  // Anticipo (adelanto) como string porque viene de un input
  const [anticipo, setAnticipo] = useState("0");

  // Filas de detalle (cantidad, detalle, precio_unitario, modo_oferta)
  // rows es la tabla completa de productos/detalles
  const [rows, setRows] = useState([
    { cantidad: "1", detalle: "", precio_unitario: "0", modo_oferta: false },
  ]);

  // Si está CANCELADA => no dejar modificar nada
  const bloqueada = estadoProforma === "CANCELADA";

  // =========================
  // 3) HELPERS DE TABLA
  // =========================

  // Agrega una fila nueva a la tabla (si no está bloqueada)
  const addRow = () => {
    if (bloqueada) return;
    setRows((prev) => [
      ...prev,
      { cantidad: "1", detalle: "", precio_unitario: "0", modo_oferta: false },
    ]);
  };

  // Elimina una fila por index
  const removeRow = (index) => {
    if (bloqueada) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Actualiza un campo específico de una fila (cantidad/detalle/precio_unitario/modo_oferta)
  const updateRow = (index, key, value) => {
    if (bloqueada) return;
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [key]: value } : r))
    );
  };

  // =========================
  // 4) LIMPIEZA / VALIDACIÓN DE INPUTS
  // =========================

  // Convierte string a número (acepta coma como decimal)
  const toNumber = (v) => {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  // Deja solo enteros positivos (para cantidad)
  const cleanInt = (v) => {
    const onlyDigits = String(v).replace(/\D+/g, "");
    const noLeadingZeros = onlyDigits.replace(/^0+(?=\d)/, "");
    return noLeadingZeros === "" ? "0" : noLeadingZeros;
  };

  // Deja solo dinero válido (para precio unitario) con punto
  const cleanMoney = (v) => {
    let s = String(v).replace(",", ".");
    s = s.replace(/[^0-9.]/g, "");
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
    s = s.replace(/^0+(?=\d)/, "");
    return s === "" ? "0" : s;
  };

  // Similar a cleanMoney (aquí retorna "0" cuando está vacío)
  const cleanMoneyOrEmpty = (v) => {
    let s = String(v).replace(",", ".");
    s = s.replace(/[^0-9.]/g, "");
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
    s = s.replace(/^0+(?=\d)/, "");
    return s === "" ? "0" : s;
  };

  // =========================
  // 5) OFERTAS
  // =========================

  // Mapa de ofertas predefinidas
  const OFERTAS = {
    "2x20": { cantidad: "2", precio_unitario: "20" },
    "2x30": { cantidad: "2", precio_unitario: "30" },
    "4x30": { cantidad: "4", precio_unitario: "30" },
  };

  // Aplica una oferta a una fila: activa modo_oferta y setea cantidad/precio
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

  // Quita oferta sin tocar cantidad/precio (solo desactiva modo_oferta)
  const quitarOferta = (index) => {
    if (bloqueada) return;
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, modo_oferta: false } : r))
    );
  };

  // =========================
  // 6) CÁLCULOS DE TOTALES
  // =========================

  // Total por fila:
  // - Si es oferta: el total es el precio_unitario fijo (ej: 20 Bs)
  // - Si no: cantidad * precio_unitario
  const rowTotal = (r) => {
    if (r.modo_oferta) return toNumber(r.precio_unitario);
    return toNumber(r.cantidad) * toNumber(r.precio_unitario);
  };

  // totalGeneral: suma todos los rowTotal
  // useMemo evita recalcular si rows no cambia
  const totalGeneral = useMemo(
    () => rows.reduce((acc, r) => acc + rowTotal(r), 0),
    [rows]
  );

  // anticipoNum: anticipo convertido a número
  const anticipoNum = useMemo(() => toNumber(anticipo), [anticipo]);

  // saldo: total - anticipo (nunca menos de 0), y si está anulada => 0
  const saldo = useMemo(() => {
    if (estadoProforma === "CANCELADA") return 0;
    const s = totalGeneral - anticipoNum;
    return s > 0 ? s : 0;
  }, [totalGeneral, anticipoNum, estadoProforma]);

  // estadoPago: texto que se muestra (ANULADA / CANCELADO / PENDIENTE)
  const estadoPago = useMemo(() => {
    if (estadoProforma === "CANCELADA") return "ANULADA";
    if (totalGeneral <= 0) return "—";
    if (saldo === 0 && totalGeneral > 0) return "CANCELADO";
    return "PENDIENTE";
  }, [estadoProforma, totalGeneral, saldo]);

  // =========================
  // CAMBIO PRINCIPAL: FETCH (sin axios)
  // 7) HELPERS DE FETCH (DENTRO DEL MISMO ARCHIVO)
  // =========================

  // Backend base (misma variable que usabas en axios)
  const BACKEND = process.env.REACT_APP_BACKEND_ORIGIN;

  // CAMBIO: helper GET JSON con cookies
  // - credentials: "include" equivale a axios { withCredentials: true }
  // - maneja errores y devuelve JSON
  const getJSON = async (path) => {
    const res = await fetch(`${BACKEND}${path}`, {
      method: "GET",
      credentials: "include",
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg = data?.message || data?.sqlMessage || `Error HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  };

  //CAMBIO: helper para POST/PUT JSON con cookies
  const sendJSON = async (path, method, bodyObj) => {
    const res = await fetch(`${BACKEND}${path}`, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj),
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg = data?.message || data?.sqlMessage || `Error HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  };

  // =========================
  // 8) CARGAR PROFORMA PARA EDICIÓN (GET /proformas/:id)
  // =========================

  useEffect(() => {
    const loadOne = async () => {
      if (!id) return; // si no hay id => no estamos editando

      try {
        // CAMBIO: antes axios.get(...) ahora fetch con getJSON(...)
        const p = await getJSON(`/proformas/${id}`);

        // Cargamos datos del backend a estados del formulario
        setFecha(String(p.fecha).slice(0, 10));
        setCliente(p.cliente || "");
        setCelular(p.celular || "");
        setEstadoProforma(p.estado || "ACTIVA");
        setAnticipo(String(p.anticipo ?? "0"));
        setProformaRef(p.proforma_ref || "—");

        // items puede venir guardado como string JSON
        const parsedItems = (() => {
          try {
            return JSON.parse(p.items || "[]");
          } catch {
            return [];
          }
        })();

        // Si hay items, los convertimos a rows para mostrar en la tabla
        if (parsedItems.length > 0) {
          setRows(
            parsedItems.map((it) => ({
              cantidad: String(it.cantidad ?? "1"),
              detalle: String(it.detalle ?? ""),
              precio_unitario: String(it.precio_unitario ?? "0"),
              modo_oferta: !!it.modo_oferta,
            }))
          );
        }
      } catch (err) {
        console.error(err);
        alert("❌ No se pudo cargar la proforma para editar");
      }
    };

    loadOne();
  }, [id]); // se ejecuta cuando cambia el id

  // =========================
  // 9) CONTROLES DE ANTICIPO
  // =========================

  // clampAnticipo: limita anticipo para que no supere el total ni sea negativo
  const clampAnticipo = () => {
    if (bloqueada) return;
    const a = toNumber(anticipo);
    if (a > totalGeneral) setAnticipo(String(totalGeneral.toFixed(2)));
    if (a < 0) setAnticipo("0");
  };

  // pagarTodo: pone anticipo = totalGeneral (deja saldo 0)
  const pagarTodo = () => {
    if (bloqueada) return;
    setAnticipo(totalGeneral.toFixed(2));
  };

  // =========================
  // 10) GUARDAR (POST crear / PUT editar)
  // =========================

  const handleSave = async () => {
    // Validaciones básicas antes de enviar al backend
    if (bloqueada) return alert("❌ No se puede guardar una proforma anulada.");
    if (!cliente.trim()) return alert("❌ Debes escribir el nombre del cliente.");
    if (!celular.trim()) return alert("❌ Debes escribir el celular.");

    // Convertimos rows => items (lo que el backend guardará en la BD)
    const items = rows
      .filter((r) => r.detalle.trim() !== "")
      .map((r) => ({
        cantidad: String(r.cantidad),
        detalle: String(r.detalle),
        precio_unitario: String(r.precio_unitario),
        modo_oferta: !!r.modo_oferta,
        total: Number(rowTotal(r).toFixed(2)),
      }));

    if (items.length === 0) return alert("❌ Agrega al menos 1 detalle.");

    // Payload final al backend (JSON)
    const payload = {
      fecha,
      cliente,
      celular,
      items,
      total_general: Number(totalGeneral.toFixed(2)),
      anticipo: Number(anticipoNum.toFixed(2)),
      saldo: Number(saldo.toFixed(2)),
      estado: estadoProforma,
    };

    try {
      // CAMBIO: antes axios.put/post(...) ahora fetch con sendJSON(...)
      if (isEdit) {
        await sendJSON(`/proformas/${id}`, "PUT", payload);
      } else {
        await sendJSON(`/proformas/add`, "POST", payload);
      }

      // Si guardó ok => volvemos a la lista
      navigate("/proformas");
    } catch (err) {
      console.error("❌ ERROR guardando:", err);

      // CAMBIO: con fetch el error viene en err.message
      alert("❌ " + (err?.message || "Error al guardar proforma"));
    }
  };

  // =========================
  // 11) UI (RENDER)
  // =========================
  // Todo lo que sigue es la pantalla (inputs, tabla, botones).
  // Aquí NO toca backend; solo usa estados y funciones.

  return (
    <div className="container-fluid p-3 proformas">
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
                <colgroup>
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "50%" }} />
                  <col style={{ width: "18%" }} />
                  <col className="no-print" />
                  <col style={{ width: "18%" }} />
                  <col className="no-print" />
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

                        <div className="only-print detalle-print">{r.detalle}</div>
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
                  className="form-control"
                  value={anticipo}
                  onChange={(e) => setAnticipo(cleanMoneyOrEmpty(e.target.value))}
                  onBlur={clampAnticipo}
                  disabled={bloqueada}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Saldo (Bs)</label>
                <input
                  type="text"
                  className="form-control"
                  value={saldo.toFixed(2)}
                  disabled
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Estado</label>
                <input
                  type="text"
                  className="form-control"
                  value={estadoPago}
                  disabled
                />
              </div>
            </div>

            <div className="d-flex gap-2 no-print mt-3">
              <button
                type="button"
                className="btn btn-success"
                disabled={bloqueada}
                onClick={handleSave}
              >
                Guardar
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => window.print()}
              >
                Imprimir
              </button>

              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={pagarTodo}
                disabled={bloqueada || totalGeneral <= 0}
              >
                Cancelar pago
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

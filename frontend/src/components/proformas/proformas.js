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

function Proformas() {
  const [pageState, setPageState] = useState(1);
  const [permission, setPermission] = useState(null);

  const [proformas, setProformas] = useState([]);
  const [count, setCount] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [sortColumn, setSortColumn] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [data, setData] = useState([]);

  const [viewModalShow, setViewModalShow] = useState(false);
  const [selected, setSelected] = useState(null);

  const formatProforma = (id) => String(id ?? "").padStart(7, "0");

  // ✅ Evita que los botones queden con foco (SweetAlert devuelve foco al cerrar)
  const clickNoFocusAsync = (fn) => async (e) => {
    const el = e?.currentTarget;

    // Quita foco al instante
    if (el) el.blur();

    try {
      await fn();
    } finally {
      // SweetAlert devuelve el foco al cerrar, lo quitamos también
      setTimeout(() => {
        if (el) el.blur();
        if (document?.activeElement && typeof document.activeElement.blur === "function") {
          document.activeElement.blur();
        }
      }, 0);
    }
  };

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
  }, [permission, tablePage, sortColumn, sortOrder, searchInput]);

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

  // ✅ ENTREGAR con cobro obligatorio si hay saldo (sin tocar el botón Cobrar)
  const entregarProforma = async (id, saldoActual = 0) => {
    try {
      // 1) Si hay saldo, cobrar primero (obligatorio)
      if (Number(saldoActual) > 0) {
        const input = await swal({
          title: "Cobro antes de entregar",
          text: `Saldo pendiente: ${saldoActual}`,
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

        // Canceló => NO entregar
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

        // Ejecuta cobro
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

      // 2) Confirmar entrega
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

  // ✅ COBRAR (suma al anticipo y baja el saldo)
  const cobrarProforma = async (id, saldoActual) => {
    const input = await swal({
      title: "Cobrar saldo",
      text: `Saldo actual: ${saldoActual}`,
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
    if (monto > Number(saldoActual)) {
      swal("¡Ups!", "No puedes cobrar más que el saldo", "error");
      return;
    }

    try {
      const result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/cobrar_proforma`, {
        method: "POST",
        headers: { "Content-type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ id, monto }),
        credentials: "include",
      });

      const body = await result.json();

      if (body.operation === "success") {
        swal("Éxito", body.message || "Cobro registrado", "success");
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

  // ✅ clase según entregado (0 rojo, 1 blanco)
  const rowClassByEntregado = (obj) => {
    const entregado = Number(obj?.entregado) === 1;
    return entregado ? "row-entregado" : "row-no-entregado";
  };

  useEffect(() => {
    if (proformas.length !== 0) {
      const tArray = proformas.map((obj, i) => ({
        sl: i + 1,
        id: formatProforma(obj.id),
        cliente: obj.cliente || "",

        total_general: Number(obj.total_general || 0).toFixed(2),
        saldo: Number(obj.saldo || 0).toFixed(2),

        fecha: obj.fecha ? moment.utc(obj.fecha).format("D [de] MMMM, YYYY") : "",
        fecha_entrega: obj.fecha_entrega
          ? moment.utc(obj.fecha_entrega).format("D [de] MMMM, YYYY")
          : "",
        hora_entrega: obj.hora_entrega ? String(obj.hora_entrega).slice(0, 5) : "",

        action: (
          <div className="actionGrid">
            {/* Cobrar: SOLO si hay saldo */}
            {Number(obj?.saldo) > 0 && (
              <button
                className="btn primary"
                onClick={clickNoFocusAsync(() => cobrarProforma(obj.id, obj.saldo))}
              >
                Cobrar
              </button>
            )}

            {/* Entregar: SOLO si NO está entregado */}
            {Number(obj?.entregado) !== 1 && (
              <button
                className="btn success"
                onClick={clickNoFocusAsync(() => entregarProforma(obj.id, obj.saldo))}
              >
                Entregar
              </button>
            )}

            <button
              className="btn warning"
              onClick={clickNoFocusAsync(() => openViewModal(obj))}
            >
              Ver
            </button>

            {permission?.delete && (
              <button
                className="btn danger"
                onClick={clickNoFocusAsync(() => deleteProforma(obj.id))}
              >
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
        <div className="product-header">
          <div className="title">Proformas</div>
          {permission?.create && (
            <Link to="/proformas/addnew" className="btn success">
              Agregar nueva
            </Link>
          )}
        </div>

        {pageState === 1 ? (
          <Loader />
        ) : pageState === 2 ? (
          <Table
            headers={[
              "N°",
              "Proforma",
              "Cliente",
              "Total",
              "Saldo",
              "Fecha",
              "Fecha entrega",
              "Hora entrega",
              "Acción",
            ]}
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
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
                      {selected.fecha_entrega
                        ? moment.utc(selected.fecha_entrega).format("D [de] MMMM, YYYY")
                        : "-"}
                    </div>
                    <div>
                      <b>Hora entrega:</b>{" "}
                      {selected.hora_entrega ? String(selected.hora_entrega).slice(0, 5) : "-"}
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

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <div style={{ minWidth: "280px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>
                        <b>Total:</b>
                      </span>
                      <span>{selected.total_general ?? 0}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>
                        <b>Anticipo / Monto pagado:</b>
                      </span>
                      <span>{selected.anticipo ?? 0}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>
                        <b>Saldo:</b>
                      </span>
                      <span>{selected.saldo ?? 0}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
}

export default Proformas;

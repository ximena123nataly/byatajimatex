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
              if (p?.view && p?.create) setPermission(p);
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

  // ✅ MODIFICADO: parsea detalle + asegura array
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

  const estadoES = (e) => e || "";

  useEffect(() => {
    if (proformas.length !== 0) {
      const tArray = proformas.map((obj, i) => ({
        sl: i + 1,
        ref: formatProforma(obj.id),
        cliente: obj.cliente || "",
        total: obj.total_general ?? 0,
        fecha: obj.fecha ? moment.utc(obj.fecha).format("D [de] MMMM, YYYY") : "",
        estado: estadoES(obj.estado),
        action: (
          <>
            <button className="btn warning" onClick={() => openViewModal(obj)}>
              Ver
            </button>
            {permission?.delete && (
              <button className="btn danger" onClick={() => deleteProforma(obj.id)}>
                Eliminar
              </button>
            )}
          </>
        ),
      }));

      setData(tArray);
    } else setData([]);
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
            headers={["N°", "Proforma", "Cliente", "Total", "Fecha", "Estado", "Acción"]}
            columnOriginalNames={[
              ["sl", ""],
              ["id", ""],
              ["cliente", ""],
              ["total_general", ""],
              ["fecha", ""],
              ["estado", ""],
              ["action", ""],
            ]}
            data={data}
            data_count={count}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            current_page={tablePage}
            tablePageChangeFunc={setTablePage}
          />
        ) : (
          <Error />
        )}

        {/* ✅ MODAL VER: COMPLETO */}
        <Modal show={viewModalShow} onHide={closeViewModal} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>Detalle de Proforma</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {selected && (
              <>
                {/* CABECERA */}
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
                      {selected.fecha
                        ? moment.utc(selected.fecha).format("D [de] MMMM, YYYY")
                        : "-"}
                    </div>
                    <div>
                      <b>Hora:</b> {selected.hora || "-"}
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

                {/* TABLA ITEMS */}
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

                {/* TOTALES */}
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
                        <b>Anticipo:</b>
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

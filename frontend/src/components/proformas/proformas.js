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

  // Modal Ver detalle
  const [viewModalShow, setViewModalShow] = useState(false);
  const [selected, setSelected] = useState(null);

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
      .catch (console.log);
  }, []);

const getProformas = async (sv, sc, so, scv) => {
  const result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_proformas`, {
    method: "POST",
    headers: {
      "Content-type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify({ start_value: sv, sort_column: sc, sort_order: so, search_value: scv, }),
    credentials: "include",
  });
  //const es igual a let : la unica diferencia es que const no puede reasignarse
  const body = await result.json();
  setProformas(body.info?.proformas || []);
  setCount(body.info?.count || 0);
};

useEffect(() => {
  if (permission !== null) {
    let p1 = getProformas((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
    Promise.all([p1])
      .then(() => {
        setPageState(2);
      })
      .catch((err) => {
        console.log(err)
        setPageState(3)
      });
  }
}, [permission]);

useEffect(() => {
  if (permission !== null) {
    getProformas((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
  }
}, [permission, tablePage, sortColumn, sortOrder, searchInput]);

const deleteProforma = async (id) => {
  const result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/delete_proforma`, {
    method: "POST",
    headers: {
      "Content-type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify({ proforma_id: id }),
    credentials: "include",
  }
  );
  //const es igual a let: la unica diferencia es que const no puede reasignarse
  const body = await result.json();
  if (body.operation === "success") {
    getProformas((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
    swal("Éxito", body.message || "Proforma eliminada", "success");
  } else {
    swal("¡Ups!", body.message || "Algo salió mal", "error");
  }
};
//---------------------------------------------------------------------
const openViewModal = (obj) => {
  let parsed = obj;

  // si items viene como string JSON, convertirlo a array
  if (parsed?.items && typeof parsed.items === "string") {
    try {
      parsed = { ...parsed, items: JSON.parse(parsed.items) };
    } catch {
      parsed = { ...parsed, items: [] };
    }
  }

  setSelected(parsed);
  setViewModalShow(true);
};

const closeViewModal = () => {
  setSelected(null);
  setViewModalShow(false);
};


//---------------------------------------------------------------------
const estadoES = (e) => {
  if (!e) return "";
  const v = String(e).toUpperCase();
  if (v === "ACTIVA") return "ACTIVA";
  if (v === "ANULADA") return "ANULADA";
  if (v === "PAGADA") return "PAGADA";
  return e;
};
//const es igual a let: la unica diferencia es que const no puede reasignarse
useEffect(() => {
  if (proformas.length !== 0) {
    const tArray = proformas.map((obj, i) => {
      const tObj = {};
      tObj.sl = i + 1;
      tObj.ref = obj.proforma_ref || "";
      tObj.cliente = obj.cliente || "";
      tObj.total = obj.total_general ?? obj.total ?? 0;
      tObj.fecha = obj.fecha
        ? moment(obj.fecha).format("D [de] MMMM, YYYY")
        : "";
      tObj.estado = estadoES(obj.estado);

      tObj.action = (
        <>
          <button
            className="btn warning"
            style={{ marginRight: "0.5rem" }}
            onClick={() => openViewModal(obj)}
          >
            Ver
          </button>

          {permission?.delete && (
            <button
              className="btn danger"
              style={{ marginLeft: "0.5rem" }}
              onClick={() => {
                swal({
                  title: "¿Estás seguro?",
                  text: "Si la eliminas, no podrás recuperar este registro.",
                  icon: "warning",
                  buttons: ["Cancelar", "Sí, eliminar"],
                  dangerMode: true,
                }).then((willDelete) => {
                  if (willDelete) deleteProforma(obj.proforma_id);
                });
              }}
            >
              Eliminar
            </button>
          )}
        </>
      );

      return tObj;
    });

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

        {permission !== null && permission.create && (
          <Link
            to={"/proformas/addnew"}
            className="btn success"
            style={{ margin: "0 0.5rem", textDecoration: "none" }}
          >
            Agregar nueva
          </Link>
        )}
      </div>

      {pageState === 1 ? (
        <Loader />
      ) : pageState === 2 ? (
        <div className="card">
          <div className="container">
            <Table
              headers={["N°", "Ref", "Cliente", "Total", "Fecha", "Estado", "Acción"]}
              columnOriginalNames={["proforma_ref", "cliente", "total_general", "fecha", "estado"]}
              sortColumn={sortColumn}
              setSortColumn={setSortColumn}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              data={data}
              data_count={count}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              custom_styles={["3rem", "6rem", "10rem", "6rem", "8rem", "6rem", "10rem"]}
              current_page={tablePage}
              tablePageChangeFunc={setTablePage}
            />
          </div>
        </div>
      ) : (
        <Error />
      )}

      {/* MODAL VER */}
      <Modal show={viewModalShow} onHide={closeViewModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-4 fw-bold" style={{ color: "#2cd498" }}>
            Detalle de Proforma
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: "#fafafa" }}>
          {!selected ? (
            <div>Cargando...</div>
          ) : (
            <div className="container">
              <div className="card">
                <div className="card-body">
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    <div><b>Ref:</b> {selected.proforma_ref}</div>
                    <div><b>Fecha:</b> {selected.fecha ? moment(selected.fecha).format("D [de] MMMM, YYYY") : "-"}</div>
                    <div><b>Cliente:</b> {selected.cliente}</div>
                    <div><b>Celular:</b> {selected.celular || "-"}</div>
                    <div><b>Estado:</b> {estadoES(selected.estado)}</div>
                  </div>

                  <hr />

                  <div>
                    <b>Ítems</b>
                    <div style={{ marginTop: "0.5rem" }}>
                      {(selected.items && Array.isArray(selected.items) ? selected.items : []).length === 0 ? (
                        <div style={{ opacity: 0.7 }}>Sin ítems</div>
                      ) : (
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Cant.</th>
                              <th>Detalle</th>
                              <th>P.Unit</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.items.map((it, idx) => (
                              <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td>{it.cantidad}</td>
                                <td style={{ whiteSpace: "pre-wrap" }}>{it.detalle}</td>
                                <td>{it.precio_unitario}</td>
                                <td>{it.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  <hr />

                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    <div><b>Total:</b> {selected.total_general ?? selected.total ?? 0}</div>
                    <div><b>Anticipo:</b> {selected.anticipo ?? 0}</div>
                    <div><b>Saldo:</b> {selected.saldo ?? 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer>
          <button className="btn btn-outline-danger" onClick={closeViewModal}>
            Cerrar
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  </div>
);
}

export default Proformas;

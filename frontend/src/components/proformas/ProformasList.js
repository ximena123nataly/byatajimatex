import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import swal from "sweetalert";

export default function ProformasList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_ORIGIN}/proformas`,
        { withCredentials: true }
      );

      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("ERROR cargando proformas:", err);
      swal("Error", "❌ No se pudo cargar la lista de proformas", "error");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteProforma = async (id) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_ORIGIN}/proformas/${id}`,
        { withCredentials: true }
      );
      await load();
      swal("Éxito", "Proforma eliminada", "success");
    } catch (err) {
      console.error(err);
      swal("Error", "No se pudo eliminar", "error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="products proformas">
      <div className="products-scroll">
        <div className="product-header">
          <div className="title">Proformas</div>

          <Link to="/proformas/addnew" style={{ textDecoration: "none" }}>
            <button className="btn btn-outline-success">Agregar nuevo</button>
          </Link>
        </div>

        <div className="card m-3 p-3">
          {loading ? (
            <div>Cargando...</div>
          ) : data.length === 0 ? (
            <div>No hay proformas registradas.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Ref</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Celular</th>
                    <th>Total</th>
                    <th>Anticipo</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((p, index) => (
                    <tr key={p.proforma_id}>
                      <td>{index + 1}</td>
                      <td>{p.proforma_ref}</td>
                      <td>{String(p.fecha).slice(0, 10)}</td>
                      <td>{p.cliente}</td>
                      <td>{p.celular}</td>
                      <td>{Number(p.total_general).toFixed(2)}</td>
                      <td>{Number(p.anticipo).toFixed(2)}</td>
                      <td>{Number(p.saldo).toFixed(2)}</td>
                      <td>{p.estado}</td>

                      <td style={{ whiteSpace: "nowrap" }}>
                        <Link
                          to={`/proformas/${p.proforma_id}`}
                          style={{ textDecoration: "none" }}
                        >
                          <button className="btn btn-warning btn-sm me-2">
                            Ver/Editar
                          </button>
                        </Link>

                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            swal({
                              title: "¿Estás seguro?",
                              text: "Si lo eliminas, no podrás recuperar este registro.",
                              icon: "warning",
                              buttons: ["Cancelar", "Sí, eliminar"],
                              dangerMode: true,
                            }).then((willDelete) => {
                              if (willDelete) deleteProforma(p.proforma_id);
                            });
                          }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button className="btn btn-outline-secondary mt-3" onClick={load}>
            Recargar
          </button>
        </div>
      </div>
    </div>
  );
}

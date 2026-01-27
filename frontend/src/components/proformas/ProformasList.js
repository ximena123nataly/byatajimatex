import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
// import axios from "axios";
import swal from "sweetalert";

export default function ProformasList() {

  /* =====================================================
     1) ESTADOS DEL COMPONENTE
     ===================================================== */

  // Guarda la lista de proformas que llegan desde el backend
  // Cada elemento representa una fila de la tabla
  const [data, setData] = useState([]);

  // Controla si la pantalla está cargando datos
  // Sirve para mostrar "Cargando..." mientras fetch responde
  const [loading, setLoading] = useState(true);

  /* =====================================================
     2) CONFIGURACIÓN DE BACKEND
     ===================================================== */

  // URL base del backend (ej: http://localhost:5000)
  // Se define en el archivo .env del frontend
  const BACKEND = process.env.REACT_APP_BACKEND_ORIGIN;

  /* =====================================================
     3) FUNCIONES AUXILIARES PARA COMUNICACIÓN (FETCH)
     ===================================================== */

  // GET JSON
  // Esta función reemplaza:
  // axios.get(url, { withCredentials: true })
  const getJSON = async (path) => {
    const res = await fetch(`${BACKEND}${path}`, {
      method: "GET",

      // credentials: "include" envía cookies de sesión/JWT
      // Es OBLIGATORIO porque el backend valida login por cookie
      credentials: "include",
    });

    // Intentamos convertir la respuesta a JSON
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    // Si el backend respondió con error (401, 500, etc)
    if (!res.ok) {
      const msg =
        data?.message ||
        data?.sqlMessage ||
        `Error HTTP ${res.status}`;
      throw new Error(msg);
    }

    // Retornamos el JSON limpio al componente
    return data;
  };

  // DELETE
  // Esta función reemplaza:
  // axios.delete(url, { withCredentials: true })
  const del = async (path) => {
    const res = await fetch(`${BACKEND}${path}`, {
      method: "DELETE",

      // Envía cookies (sesión)
      credentials: "include",
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg =
        data?.message ||
        data?.sqlMessage ||
        `Error HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data;
  };

  /* =====================================================
     4) CARGAR LISTA DE PROFORMAS
     ===================================================== */

  // Esta función obtiene TODAS las proformas desde el backend
  // Endpoint: GET /proformas
  const load = async () => {
    try {
      setLoading(true);

      // Petición al backend
      const resData = await getJSON("/proformas");

      // Aseguramos que lo que llega sea un array
      // Si no lo es, evitamos errores dejando []
      setData(Array.isArray(resData) ? resData : []);
    } catch (err) {
      console.error("ERROR cargando proformas:", err);

      // Mensaje de error amigable al usuario
      swal("Error", "❌ No se pudo cargar la lista de proformas", "error");

      setData([]);
    } finally {
      // Se ejecuta siempre (éxito o error)
      setLoading(false);
    }
  };

  /* =====================================================
     5) ELIMINAR PROFORMA
     ===================================================== */

  // Elimina una proforma por ID
  // Endpoint: DELETE /proformas/:id
  const deleteProforma = async (id) => {
    try {
      await del(`/proformas/${id}`);

      // Luego de eliminar, volvemos a cargar la lista
      // para reflejar el cambio en pantalla
      await load();

      swal("Éxito", "Proforma eliminada correctamente", "success");
    } catch (err) {
      console.error(err);
      swal("Error", "No se pudo eliminar la proforma", "error");
    }
  };

  /* =====================================================
     6) useEffect
     ===================================================== */

  // Se ejecuta SOLO una vez cuando el componente se monta
  // Carga inicial de la lista de proformas
  useEffect(() => {
    load();
  }, []);

  /* =====================================================
     7) INTERFAZ DE USUARIO (UI)
     ===================================================== */

  return (
    <div className="products proformas">
      <div className="products-scroll">

        {/* Header de la pantalla */}
        <div className="product-header">
          <div className="title">Proformas</div>

          {/* Botón para ir a la pantalla de creación */}
          <Link to="/proformas/addnew" style={{ textDecoration: "none" }}>
            <button className="btn btn-outline-success">
              Agregar nuevo
            </button>
          </Link>
        </div>

        <div className="card m-3 p-3">

          {/* Estado de carga */}
          {loading ? (
            <div>Cargando...</div>

          ) : data.length === 0 ? (
            <div>No hay proformas registradas.</div>

          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">

                {/* Encabezados */}
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

                {/* Filas */}
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

                      {/* Botones de acción */}
                      <td style={{ whiteSpace: "nowrap" }}>
                        {/* Editar */}
                        <Link to={`/proformas/${p.proforma_id}`}>
                          <button className="btn btn-warning btn-sm me-2">
                            Ver / Editar
                          </button>
                        </Link>

                        {/* Eliminar */}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            swal({
                              title: "¿Estás seguro?",
                              text: "Este registro no se podrá recuperar.",
                              icon: "warning",
                              buttons: ["Cancelar", "Sí, eliminar"],
                              dangerMode: true,
                            }).then((ok) => {
                              if (ok) deleteProforma(p.proforma_id);
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

          {/* Recargar manual */}
          <button className="btn btn-outline-secondary mt-3" onClick={load}>
            Recargar
          </button>

        </div>
      </div>
    </div>
  );
}
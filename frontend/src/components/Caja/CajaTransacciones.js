import React from "react";

const fmtFecha = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return d.toLocaleDateString("es-BO"); // 6/2/2026
};

const fmtHora = (v) => {
  if (!v) return "-";
  // si viene tipo "16:05:15" lo dejamos
  if (typeof v === "string" && v.includes(":")) return v;
  const d = new Date(v);
  return d.toLocaleTimeString("es-BO", { hour12: false });
};

export default function CajaTransacciones({ transacciones, loading }) {
  return (
    <div className="caja-card caja-tx-card">
      <div className="caja-tx-header">
        <h3>Movimientos</h3>
      </div>

      {loading ? (
        <p className="muted">Cargando movimientos...</p>
      ) : !transacciones || transacciones.length === 0 ? (
        <p className="muted">Aún no hay movimientos.</p>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla-caja">
            <thead>
              <tr>
                <th>ID_TRANSACCION</th>
                <th>ID_USUARIO</th>
                <th>ID_CAJA</th>
                <th>TIPO</th>
                <th>ORIGEN</th>
                <th>NRO_REGISTRO</th>
                <th>MONTO</th>
                <th>FECHA</th>
                <th>HORA</th>
              </tr>
            </thead>

            <tbody>
              {transacciones.map((t) => (
                <tr key={t.id_transaccion}>
                  <td>{t.id_transaccion}</td>
                  <td>{t.id_usuario}</td>
                  <td>{t.id_caja}</td>

                  <td>
                    <span className={`badge ${t.tipo === "INGRESO" ? "badge-in" : "badge-out"}`}>
                      {t.tipo}
                    </span>
                  </td>

                  <td>{t.origen}</td>
                  <td>{t.nro_registro || "-"}</td>
                  <td>Bs {Number(t.monto || 0).toFixed(2)}</td>
                  <td>{fmtFecha(t.fecha)}</td>
                  <td>{fmtHora(t.hora)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

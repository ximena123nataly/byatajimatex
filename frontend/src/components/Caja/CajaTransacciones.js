import React from "react";

export default function CajaTransacciones({ transacciones, loading }) {
  if (loading) return <p style={{ opacity: 0.7 }}>Cargando transacciones...</p>;
  if (!transacciones || transacciones.length === 0)
    return <p style={{ opacity: 0.7 }}>Aún no hay movimientos.</p>;

  return (
    <div style={{ overflowX: "auto", marginTop: 20 }}>
      <table className="tabla-caja">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tipo</th>
            <th>Origen</th>
            <th>Nro Registro</th>
            <th>Monto</th>
            <th>Fecha</th>
            <th>Hora</th>
          </tr>
        </thead>
        <tbody>
          {transacciones.map((t) => (
            <tr key={t.id_transaccion}>
              <td>{t.id_transaccion}</td>
              <td>{t.tipo}</td>
              <td>{t.origen}</td>
              <td>{t.nro_registro || "-"}</td>
              <td>Bs {Number(t.monto || 0).toFixed(2)}</td>
              <td>{t.fecha}</td>
              <td>{t.hora}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

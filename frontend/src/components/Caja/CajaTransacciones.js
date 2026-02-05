import React from "react";

export default function CajaTransacciones({ transacciones, loading }) {
  if (loading) return <div className="muted">Cargando...</div>;
  if (!transacciones || transacciones.length === 0) return <div className="muted">No hay movimientos aún.</div>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="tabla">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Tipo</th>
            <th>Nro Registro</th>
            <th>Monto</th>
            <th>Usuario</th>
          </tr>
        </thead>
        <tbody>
          {transacciones.map((t) => {
            const monto = Number(t.monto || 0).toFixed(2);
            return (
              <tr key={t.id_transaccion}>
                <td>{t.fecha}</td>
                <td>{t.hora}</td>
                <td>{t.tipo}</td>
                <td>{t.nro_registro || "-"}</td>
                <td>{monto}</td>
                <td>{t.id_usuario ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

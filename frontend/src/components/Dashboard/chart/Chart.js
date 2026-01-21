import React, { useMemo } from "react";
import "./chart.scss";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export default function Chart({ graphStats }) {
  // Traducción de meses (por si backend manda "January", "Jan", "1", "01", etc.)
  const monthEs = (m) => {
    if (m == null) return "";

    const s = String(m).trim();

    const map = {
      january: "Enero",
      jan: "Ene",
      february: "Febrero",
      feb: "Feb",
      march: "Marzo",
      mar: "Mar",
      april: "Abril",
      apr: "Abr",
      may: "Mayo",
      june: "Junio",
      jun: "Jun",
      july: "Julio",
      jul: "Jul",
      august: "Agosto",
      aug: "Ago",
      september: "Septiembre",
      sep: "Sep",
      sept: "Sep",
      october: "Octubre",
      oct: "Oct",
      november: "Noviembre",
      nov: "Nov",
      december: "Diciembre",
      dec: "Dic",
    };

    const key = s.toLowerCase();

    // Si viene como número
    const num = parseInt(s, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= 12) {
      const arr = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
      ];
      return arr[num - 1];
    }

    // Si viene como "01", "02"...
    if (/^\d{2}$/.test(s)) {
      const n2 = parseInt(s, 10);
      if (n2 >= 1 && n2 <= 12) {
        const arr = [
          "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        return arr[n2 - 1];
      }
    }

    return map[key] || s; // si no lo reconoce, muestra lo que venga
  };

  // Creamos una copia con Month traducido, sin tocar la data original
  const data = useMemo(() => {
    if (!Array.isArray(graphStats)) return [];
    return graphStats.map((row) => ({
      ...row,
      MonthES: monthEs(row.Month),
    }));
  }, [graphStats]);

  // Tooltip en español
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    // payload trae { name: "order"|"expense"|"revenue", value: ... }
    const nameMap = {
      order: "Pedidos",
      expense: "Gastos",
      revenue: "Ingresos",
    };

    return (
      <div
        style={{
          background: "white",
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "8px 10px",
          fontSize: 12,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
        {payload.map((p, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <span>{nameMap[p.name] || p.name}:</span>
            <span style={{ fontWeight: 700 }}>{p.value ?? 0}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="chart">
      <div className="chartTitle">ANÁLISIS DE VENTAS</div>

      <div className="chartContent">
        <ResponsiveContainer width="100%" aspect={4 / 1}>
          <AreaChart
            width={730}
            height={250}
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorOrder" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#de7b7b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#de7b7b" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Usamos MonthES en el eje X */}
            <XAxis dataKey="MonthES" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />

            <Tooltip content={<CustomTooltip />} />

            {/* Datos (no cambiamos keys porque vienen del backend) */}
            <Area type="monotone" dataKey="order" stroke="#8884d8" fillOpacity={1} fill="url(#colorOrder)" />
            <Area type="monotone" dataKey="expense" stroke="#82ca9d" fillOpacity={1} fill="url(#colorExpense)" />
            <Area type="monotone" dataKey="revenue" stroke="#de7b7b" fillOpacity={1} fill="url(#colorRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import "./Feature.scss";
import {
  ArrowDownward,
  ArrowUpward,
  PersonOutlined,
  ShoppingCartOutlined,
  PaidOutlined,
  AccountBalanceWalletOutlined,
} from "@mui/icons-material";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import { Link } from "react-router-dom";

export default function Feature({ reportStats }) {
  let o1, o2, e1, e2, pf1, pf2;

  o1 = reportStats?.[1]?.current_month == null ? 0 : reportStats[1].current_month;
  o2 = reportStats?.[1]?.previous_month == null ? 0 : reportStats[1].previous_month;

  e1 = reportStats?.[2]?.current_month == null ? 0 : reportStats[2].current_month;
  e2 = reportStats?.[2]?.previous_month == null ? 0 : reportStats[2].previous_month;

  pf1 = reportStats?.[3]?.current_month == null ? 0 : reportStats[3].current_month;
  pf2 = reportStats?.[3]?.previous_month == null ? 0 : reportStats[3].previous_month;

  let porder = o2 === 0 ? 0 : ((o1 - o2) * 100) / o2;
  let pexpense = e2 === 0 ? 0 : ((e1 - e2) * 100) / e2;
  let pproforma = pf2 === 0 ? 0 : ((pf1 - pf2) * 100) / pf2;

  let curr_rev = o1 - e1;
  let pre_rev = o2 - e2;
  let prevenue = pre_rev === 0 ? 0 : ((curr_rev - pre_rev) * 100) / pre_rev;

  const currencySymbol = "Bs";

  const renderChange = (value) => {
    // ❌ Si es Infinity, -Infinity o NaN → no mostrar nada
    if (!Number.isFinite(value)) return null;

    const shown = Math.round(value * 100) / 100;

    // ❌ Si es 0 → no mostrar nada
    if (shown === 0) return null;

    if (shown > 0) {
      return (
        <div className="d-flex align-items-center" style={{ color: "green" }}>
          <span className="featuredMoneyRate">{shown}%</span>
          <ArrowUpward />
        </div>
      );
    }

    // shown < 0
    return (
      <div className="d-flex align-items-center" style={{ color: "red" }}>
        <span className="featuredMoneyRate">{Math.abs(shown)}%</span>
        <ArrowDownward />
      </div>
    );
  };

  return (
    <div className="featured">
      {/* USUARIOS */}
      <div className="featuredItem">
        <span className="featuredTitle">Usuarios</span>

        <div className="featuredMoneyContainer flex-column flex-start" style={{ margin: "0px 0px" }}>
          <div className="d-flex gap-2">
            <PersonOutlined className="cardIcon" style={{ backgroundColor: "rgb(255,0,0,0.3)" }} />
            <Link to="/employees" className="link">
              <span className="text-hover-primary">Empleados:</span>
            </Link>
            <span>{reportStats?.[0]?.employee_count ?? 0}</span>
          </div>

          <div className="d-flex gap-2 my-1">
            <PersonOutlined className="cardIcon" style={{ backgroundColor: "rgb(0,255,0,0.3)" }} />
            <Link to="/customers" className="link">
              <span className="text-hover-primary">Clientes:</span>
            </Link>
            <span>{reportStats?.[0]?.customer_count ?? 0}</span>
          </div>

          <div className="d-flex gap-2">
            <PersonOutlined className="cardIcon" style={{ backgroundColor: "rgb(0,0,255,0.3)" }} />
            <Link to="/suppliers" className="link">
              <span className="text-hover-primary">Proveedores:</span>
            </Link>
            <span>{reportStats?.[0]?.supplier_count ?? 0}</span>
          </div>
        </div>

        <div className="d-flex justify-content-end">
          <div
            style={{
              backgroundColor: "rgb(255, 102, 0, 0.3)",
              borderRadius: "5px",
              color: "#5e5708",
              padding: "3px",
            }}
          >
            <PersonOutlined />
          </div>
        </div>
      </div>

      {/* PROFORMAS */}
      <div className="featuredItem">
        <span className="featuredTitle">Bordados</span>

        <div className="featuredMoneyContainer">
          <span className="featuredMoney">
            {currencySymbol}
            {Math.round(pf1)}
          </span>
          {renderChange(pproforma)}
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <Link to="/proformas" className="text-decoration-none">
            <span className="featuredSub">Ver todos los bordados</span>
          </Link>

          <div style={{ backgroundColor: "#d9b6cb", borderRadius: "5px", color: "#a30b66", padding: "3px" }}>
            <DescriptionOutlined />
          </div>
        </div>
      </div>

      {/* VENTAS */}
      <div className="featuredItem">
        <span className="featuredTitle">Ventas</span>

        <div className="featuredMoneyContainer">
          <span className="featuredMoney">
            {currencySymbol}
            {Math.round(o1)}
          </span>
          {renderChange(porder)}
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <Link to="/orders" className="text-decoration-none">
            <span className="featuredSub">Ver todas las ventas</span>
          </Link>

          <div style={{ backgroundColor: "#e8e190", borderRadius: "5px", color: "#5e5708", padding: "3px" }}>
            <ShoppingCartOutlined />
          </div>
        </div>
      </div>

      {/* GASTOS */}
      <div className="featuredItem">
        <span className="featuredTitle">Gastos</span>

        <div className="featuredMoneyContainer">
          <span className="featuredMoney">
            {currencySymbol}
            {Math.round(e1)}
          </span>
          {renderChange(pexpense)}
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <Link to="/expenses" className="text-decoration-none">
            <span className="featuredSub">Ver todos los gastos</span>
          </Link>

          <div style={{ backgroundColor: "#d9b6cb", borderRadius: "5px", color: "#a30b66", padding: "3px" }}>
            <AccountBalanceWalletOutlined />
          </div>
        </div>
      </div>

      {/* INGRESOS */}
      <div className="featuredItem">
        <span className="featuredTitle">Ingresos</span>

        <div className="featuredMoneyContainer">
          <span className="featuredMoney">
            {currencySymbol}
            {Math.round(o1 - e1)}
          </span>
          {renderChange(prevenue)}
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <span className="featuredSub"></span>
          <div style={{ backgroundColor: "#b3deaf", borderRadius: "5px", color: "#1db80f", padding: "3px" }}>
            <PaidOutlined />
          </div>
        </div>
      </div>
    </div>
  );
}
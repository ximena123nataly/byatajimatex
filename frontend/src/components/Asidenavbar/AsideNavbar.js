import React, { useEffect, useState, useContext } from 'react'
import { Link } from "react-router-dom";
import "./AsideNavbar.scss";

import swal from 'sweetalert';
import { DarkModeContext } from "../../context/darkModeContext";

import DashboardIcon from "@mui/icons-material/Dashboard";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import StoreIcon from "@mui/icons-material/Store";
import SettingsApplicationsIcon from "@mui/icons-material/SettingsApplications";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import SettingsSystemDaydreamOutlinedIcon from "@mui/icons-material/SettingsSystemDaydreamOutlined";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import Menu from "@mui/icons-material/Menu";

import DescriptionIcon from "@mui/icons-material/Description";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

function AsideNavbar() {
  const { dispatch } = useContext(DarkModeContext);
  const [permission, setPermission] = useState([])
  const [toggel, setToggel] = useState(false)

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/verifiy_token`, {
      method: 'POST',
      credentials: 'include'
    })
      .then(async (response) => {
        let body = await response.json()
        if (body.operation === 'success') {
          fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_permission`, {
            method: 'POST',
            credentials: 'include'
          })
            //ORIGINAL
              /*.then(async (response) => {
              let body = await response.json()
              let p = JSON.parse(body.info)
              setPermission(p)*/
              .then(res => res.json())
          .then(body => {
            console.log("📥 permisos recibidos:", body.permissions);
            setPermission(body.permissions || []);
            })
            .catch((error) => {
              console.log(error)
            })
        } else {
          window.location.href = '/login'
        }
      })
      .catch((error) => {
        console.log(error)
      })
  }, [])

  const logout = () => {
    swal({
      title: "¿Estás seguro?",
      text: "¿Seguro que quieres cerrar sesión?",
      icon: "warning",
      buttons: ["Cancelar", "Sí, salir"],
      dangerMode: true,
    })
      .then(async (willLogout) => {
        if (willLogout) {
          let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/logout`, {
            method: 'GET',
            credentials: 'include'
          })

          let body = await result.json()
          if (body.operation === 'success') {
            window.location.href = '/login';
          }
        }
      });
  }


  
  //const isView = (page) => permission?.find(x => x.page === page)?.view === true;
  //const isView = (page) => permission && permission[page]?.view === true;
 /*const isView = (page) => {
  console.log("🔍 isView llamado con page:", page);
  console.log("📦 permission:", permission);
  console.log("📐 es array?", Array.isArray(permission));

  if (!Array.isArray(permission)) return false;

  const result = permission.find(x => x.page === page);
  console.log("🎯 resultado find:", result);

  return result?.view === true;
};*/
const isView = (page) => {
  if (!Array.isArray(permission)) return false;
  console.log("📦 permission:", permission);
  return permission.find(p => p.page === page)?.view === true;
};
  //console.log("PERMISSIONS RAW:", p, Array.isArray(p))

  const LogoText = () => (
    <>
      {isView('employees')
        ? <span className="logo">Administrador</span>
        : <span className="logo">Empleado</span>}
    </>
  );

  const MenuLinks = () => (
    <ul>
      {isView('dashboard') && (
        <>
          <p className="title">PRINCIPAL</p>
          <Link to="/dashboard" style={{ textDecoration: "none" }}>
            <li>
              <DashboardIcon className="icon" />
              <span>Panel</span>
            </li>
          </Link>
        </>
      )}

      {(isView('employees') || isView('products') || isView('proformas') || isView('ventas')) && (
        <p className="title">LISTAS</p>
      )}

      {isView('employees') && (
        <Link to="/employees" style={{ textDecoration: "none" }}>
          <li>
            <PersonOutlineIcon className="icon" />
            <span>Empleados</span>
          </li>
        </Link>
      )}

      {isView('products') && (
        <Link to="/products" style={{ textDecoration: "none" }}>
          <li>
            <StoreIcon className="icon" />
            <span>Productos</span>
          </li>
        </Link>
      )}

      {isView('proformas') && (
        <Link to="/proformas" style={{ textDecoration: "none" }}>
          <li>
            <DescriptionIcon className="icon" />
            <span>Proformas</span>
          </li>
        </Link>
      )}

      {isView('ventas') && (
        <Link to="/ventas" style={{ textDecoration: "none" }}>
          <li>
            <AttachMoneyIcon className="icon" />
            <span>Ventas</span>
          </li>
        </Link>
      )}

      {(isView('suppliers') || isView('expenses')) && (
        <p className="title">COMPRAS</p>
      )}

      {isView('suppliers') && (
        <Link to="/suppliers" style={{ textDecoration: "none" }}>
          <li>
            <StoreIcon className="icon" />
            <span>Proveedores</span>
          </li>
        </Link>
      )}

      {isView('expenses') && (
        <Link to="/expenses" style={{ textDecoration: "none" }}>
          <li>
            <NotificationsNoneIcon className="icon" />
            <span>Gastos</span>
          </li>
        </Link>
      )}

      {(isView('customers') || isView('orders')) && (
        <p className="title">VENTAS</p>
      )}

      {isView('customers') && (
        <Link to="/customers" style={{ textDecoration: "none" }}>
          <li>
            <SettingsSystemDaydreamOutlinedIcon className="icon" />
            <span>Clientes</span>
          </li>
        </Link>
      )}

      {isView('orders') && (
        <Link to="/orders" style={{ textDecoration: "none" }}>
          <li>
            <PsychologyOutlinedIcon className="icon" />
            <span>Pedidos</span>
          </li>
        </Link>
      )}

      <p className="title">USUARIO</p>

      {isView('profile') && (
        <Link to="/profile" style={{ textDecoration: "none" }}>
          <li>
            <AccountCircleOutlinedIcon className="icon" />
            <span>Perfil</span>
          </li>
        </Link>
      )}

      {isView('settings') && (
        <Link to="/settings" style={{ textDecoration: "none" }}>
          <li>
            <SettingsApplicationsIcon className="icon" />
            <span>Configuración</span>
          </li>
        </Link>
      )}

      <li onClick={() => { logout() }}>
        <ExitToAppIcon className="icon" />
        <span>Cerrar sesión</span>
      </li>
    </ul>
  );

  return (
    <div>
      <div className='toggelDiv'><Menu onClick={() => setToggel(true)} /></div>

      <div className="asideNavbar__panel">
        <div className="top border-bottom">
          <Link to="/" style={{ textDecoration: "none" }}>
            <LogoText />
          </Link>
        </div>

        <div className="center">
          <MenuLinks />
        </div>

        <div className="bottom">
          <div className="colorOption" onClick={() => dispatch({ type: "LIGHT" })}></div>
          <div className="colorOption" onClick={() => dispatch({ type: "DARK" })}></div>
        </div>
      </div>

      <div className='asideNavbar__menu' style={toggel ? { left: "0px" } : {}}>
        <div className="top">
          <div className='toggelDiv'><CloseOutlined onClick={() => setToggel(false)} /></div>
        </div>

        <div className="center">
          <MenuLinks />
        </div>

        <div className="bottom">
          <div className="colorOption" onClick={() => dispatch({ type: "LIGHT" })}></div>
          <div className="colorOption" onClick={() => dispatch({ type: "DARK" })}></div>
        </div>
      </div>
    </div>
  );
};

export default AsideNavbar;

import React, { useEffect, useRef, useState } from 'react'
import { Link } from "react-router-dom"
import Modal from 'react-bootstrap/Modal';
import './Products.scss'
import Table from '../Table/Table'

import moment from 'moment'
import 'moment/locale/es';
import swal from 'sweetalert';

import DeleteOutline from '@mui/icons-material/DeleteOutline';
import Loader from '../PageStates/Loader';
import Error from '../PageStates/Error';

function Products() {
  const [pageState, setPageState] = useState(1)
  const [permission, setPermission] = useState(null)

  const [products, setProducts] = useState([])
  const [prodCount, setProdCount] = useState(0)

  const [searchInput, setSearchInput] = useState("")
  const [sortColumn, setSortColumn] = useState("")
  const [sortOrder, setSortOrder] = useState("")
  const [tablePage, setTablePage] = useState(1)
  const [data, setData] = useState([])

  // Modal related state variables
  const [editModalShow, setEditModalShow] = useState(false)

  const [editProductId, setEditProductId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editGender, setEditGender] = useState("")

  const [editSize, setEditSize] = useState('')
  const [editMaterial, setEditMaterial] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStock, setEditStock] = useState('0')
  const [editSellingPrice, setEditSellingPrice] = useState('0')
  const [editPurchasePrice, setEditPurchasePrice] = useState('0')

  const [editOldImage, setEditOldImage] = useState(null)

  const [editImage, setEditImage] = useState('')
  const editFileInputRef = useRef(null)
  const [editImageData, setEditImageData] = useState(null)

  const [editModalSubmitButton, setEditModalSubmitButton] = useState(false)


  const imprimirReporteProductos = async () => {
    try {
      const result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_products_report`, {
        method: 'POST',
        headers: { 'Content-type': 'application/json; charset=UTF-8' },
        credentials: 'include'
      });

      const body = await result.json();

      if (body.operation !== 'success') {
        swal("¡Ups!", body.message || "No se pudo generar el reporte", "error");
        return;
      }

      const products = body?.info?.products || [];
      const totalProducts = body?.info?.total_products || 0;
      const totalStock = body?.info?.total_stock || 0;

      const now = new Date();
      const fechaActual = now.toISOString().slice(0, 10);
      const horaActual = now.toLocaleTimeString();

      const escapeHtml = (text) => {
        return String(text ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

      const grouped = products.reduce((acc, product) => {
        const category = product.category && String(product.category).trim() !== ""
          ? product.category
          : "Sin categoría";

        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
      }, {});

      let tableRows = "";
      let globalIndex = 1;

      Object.keys(grouped).forEach((category) => {
        const items = grouped[category];

        const stockCategoria = items.reduce((sum, item) => {
          return sum + (parseInt(item.product_stock) || 0);
        }, 0);

        tableRows += `
  <tr class="group-separator">
    <td colspan="5"></td>
  </tr>
  <tr class="group-row">
    <td colspan="5">
      <b>CATEGORÍA:</b> ${escapeHtml(category)}
      <span style="float:right;">
        <b>Productos:</b> ${items.length} &nbsp;&nbsp;
        <b>Stock:</b> ${stockCategoria}
      </span>
    </td>
  </tr>
`;
        items.forEach((p) => {
          tableRows += `
          <tr>
            <td class="center">${globalIndex++}</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.category || "Sin categoría")}</td>
            <td class="right">${p.product_stock || 0}</td>
            <td class="right">${Number(p.selling_price || 0).toFixed(2)}</td>
          </tr>
        `;
        });
      });

      const logoUrl = `${window.location.origin}/tajima.png`;

      const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Historial de productos</title>
  <style>
    @page {
      size: letter portrait;
      margin: 18mm 14mm 18mm 14mm;
    }

    body {
      font-family: Arial, sans-serif;
      color: #000;
      margin: 0;
      font-size: 13px;
    }

    .page {
      width: 100%;
    }

    .header {
      display: table;
      width: 100%;
      margin-bottom: 10px;
    }

    .header-left,
    .header-center,
    .header-right {
      display: table-cell;
      vertical-align: top;
    }

    .header-left {
      width: 33%;
    }

    .header-center {
      width: 34%;
      text-align: center;
    }

    .header-right {
      width: 33%;
      text-align: right;
      font-size: 12px;
    }

    .logo {
      width: 100px;
      height: auto;
      display: block;
      margin-bottom: 6px;
    }

    .company {
      font-size: 10px;
      line-height: 1.25;
    }

    .title {
      font-size: 10px;
      font-weight: 800;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .center-info {
      font-size: 10px;
      line-height: 1.3;
    }

    .meta-right div {
      margin-bottom: 3px;
    }

    .separator {
      border-top: 1px solid #bbb;
      margin: 12px 0 8px 0;
    }

    .range-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }

    thead th {
      border-top: 2px solid #222;
      border-bottom: 2px solid #222;
      padding: 7px 6px;
      text-align: left;
      font-size: 13px;
    }

    tbody td {
      padding: 4px 6px;
      font-size: 11px;
      border-bottom: 1px solid #ddd;
    }

    .center {
      text-align: center;
    }

    .right {
      text-align: right;
    }

    .group-row td {
  background: #f3f3f3;
  border-top: 2px solid #222;
  border-bottom: 1px solid #222;
  padding: 10px 6px;
  font-size: 12px;
}

.group-row {
  height: 18px;
}

.group-separator td {
  border: none !important;
  height: 16px;
  padding: 0;
  background: transparent;
}

    .footer-summary {
      margin-top: 14px;
      border-top: 2px solid #222;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <img class="logo" src="${logoUrl}" alt="TAJIMA" />
        <div class="company">
          <div><b>BORDADOS COMPUTARIZADOS</b></div>
          <div>Y APLICACIONES TAJIMA TEXTIL</div>
          <div>E-mail: byatajima@gmail.com</div>
          <div>jhonnfya@hotmail.com</div>
        </div>
      </div>

      <div class="header-center">
        <div class="title">HISTORIAL DE PRODUCTOS</div>
        <div class="center-info">
          <div><b>Dir.:</b> Av. Juan Pablo II Ceja</div>
          <div>(El Alto lado Transito - Bolivia)</div>
          <div>Cel.: 75866135 - 75274747 - 77221750</div>
        </div>
      </div>

      <div class="header-right">
        <div class="meta-right">
          
          <div><b>Fecha:</b> ${fechaActual}</div>
          <div><b>Hora:</b> ${horaActual}</div>
        </div>
      </div>
    </div>

    <div class="separator"></div>

    <div class="range-row">
      <div>Listado general de productos por categoría</div>
      <div><b>Filas:</b> ${totalProducts}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:60px;" class="center">#</th>
          <th>Producto</th>
          <th style="width:180px;">Categoría</th>
          <th style="width:100px;" class="right">Stock</th>
          <th style="width:130px;" class="right">Precio</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows || `<tr><td colspan="5">No hay productos</td></tr>`}
      </tbody>
    </table>

    <div class="footer-summary">
      <div>TOTAL PRODUCTOS: ${totalProducts}</div>
      <div>STOCK TOTAL: ${totalStock}</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>
    `;

      const w = window.open("", "_blank", "width=1100,height=800");
      if (!w) {
        swal("Bloqueado", "Tu navegador bloqueó la ventana de impresión. Permite pop-ups.", "warning");
        return;
      }

      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (error) {
      console.log(error);
      swal("¡Ups!", "Error al generar el reporte", "error");
    }
  };
  const imprimirReporteStockBajo = async () => {
    try {
      const LIMITE_STOCK_BAJO = 5;

      const result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_products_report`, {
        method: 'POST',
        headers: { 'Content-type': 'application/json; charset=UTF-8' },
        credentials: 'include'
      });

      const body = await result.json();

      if (body.operation !== 'success') {
        swal("¡Ups!", body.message || "No se pudo generar el reporte", "error");
        return;
      }

      const allProducts = body?.info?.products || [];

      const products = allProducts
        .filter((p) => Number(p.product_stock || 0) <= LIMITE_STOCK_BAJO)
        .sort((a, b) => {
          const stockA = Number(a.product_stock || 0);
          const stockB = Number(b.product_stock || 0);

          if (stockA !== stockB) return stockA - stockB;
          return String(a.name || "").localeCompare(String(b.name || ""));
        });

      const totalProducts = products.length;
      const totalStock = products.reduce((sum, item) => {
        return sum + (parseInt(item.product_stock) || 0);
      }, 0);

      const now = new Date();
      const fechaActual = now.toISOString().slice(0, 10);
      const horaActual = now.toLocaleTimeString();

      const escapeHtml = (text) => {
        return String(text ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

      const tableRows = products.map((p, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category || "Sin categoría")}</td>
        <td class="right">${Number(p.product_stock || 0)}</td>
        <td class="right">${Number(p.selling_price || 0).toFixed(2)}</td>
      </tr>
    `).join("");

      const logoUrl = `${window.location.origin}/tajima.png`;

      const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Reporte de stock bajo</title>
  <style>
    @page {
      size: letter portrait;
      margin: 18mm 14mm 18mm 14mm;
    }

    body {
      font-family: Arial, sans-serif;
      color: #000;
      margin: 0;
      font-size: 13px;
    }

    .page {
      width: 100%;
    }

    .header {
      display: table;
      width: 100%;
      margin-bottom: 10px;
    }

    .header-left,
    .header-center,
    .header-right {
      display: table-cell;
      vertical-align: top;
    }

    .header-left { width: 33%; }
    .header-center { width: 34%; text-align: center; }
    .header-right { width: 33%; text-align: right; font-size: 12px; }

    .logo {
      width: 120px;
      height: auto;
      display: block;
      margin-bottom: 8px;
    }

    .company {
      font-size: 12px;
      line-height: 1.25;
    }

    .title {
      font-size: 16px;
      font-weight: 800;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .center-info {
      font-size: 12px;
      line-height: 1.3;
    }

    .meta-right div {
      margin-bottom: 3px;
    }

    .separator {
      border-top: 1px solid #bbb;
      margin: 12px 0 8px 0;
    }

    .range-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }

    thead th {
      border-top: 2px solid #222;
      border-bottom: 2px solid #222;
      padding: 7px 6px;
      text-align: left;
      font-size: 13px;
    }

    tbody td {
      padding: 5px 6px;
      font-size: 11px;
      border-bottom: 1px solid #ddd;
    }

    .center {
      text-align: center;
    }

    .right {
      text-align: right;
    }

    .footer-summary {
      margin-top: 14px;
      border-top: 2px solid #222;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <img class="logo" src="${logoUrl}" alt="TAJIMA" />
        <div class="company">
          <div><b>BORDADOS COMPUTARIZADOS</b></div>
          <div>Y APLICACIONES TAJIMA TEXTIL</div>
          <div>E-mail: byatajima@gmail.com</div>
          <div>jhonnfya@hotmail.com</div>
        </div>
      </div>

      <div class="header-center">
        <div class="title">REPORTE DE STOCK BAJO</div>
        <div class="center-info">
          <div><b>Límite usado:</b> ${LIMITE_STOCK_BAJO} o menos</div>
          <div><b>Dir.:</b> Av. Juan Pablo II Ceja</div>
          <div>(El Alto lado Transito - Bolivia)</div>
        </div>
      </div>

      <div class="header-right">
        <div class="meta-right">
          <div><b>Fecha:</b> ${fechaActual}</div>
          <div><b>Hora:</b> ${horaActual}</div>
        </div>
      </div>
    </div>

    <div class="separator"></div>

    <div class="range-row">
      <div>Listado de productos con stock bajo</div>
      <div><b>Filas:</b> ${totalProducts}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:60px;" class="center">#</th>
          <th>Producto</th>
          <th style="width:180px;">Categoría</th>
          <th style="width:100px;" class="right">Stock</th>
          <th style="width:130px;" class="right">Precio</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows || `<tr><td colspan="5">No hay productos con stock bajo</td></tr>`}
      </tbody>
    </table>

    <div class="footer-summary">
      <div>TOTAL PRODUCTOS: ${totalProducts}</div>
      <div>STOCK ACUMULADO: ${totalStock}</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>
    `;

      const w = window.open("", "_blank", "width=1100,height=800");
      if (!w) {
        swal("Bloqueado", "Tu navegador bloqueó la ventana de impresión. Permite pop-ups.", "warning");
        return;
      }

      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (error) {
      console.log(error);
      swal("¡Ups!", "Error al generar el reporte de stock bajo", "error");
    }
  };
  const imprimirReporteProductosGeneral = async () => {
    try {
      const result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_products_report`, {
        method: 'POST',
        headers: { 'Content-type': 'application/json; charset=UTF-8' },
        credentials: 'include'
      });

      const body = await result.json();

      if (body.operation !== 'success') {
        swal("¡Ups!", body.message || "No se pudo generar el reporte", "error");
        return;
      }

      const products = body?.info?.products || [];
      const totalProducts = body?.info?.total_products || 0;
      const totalStock = body?.info?.total_stock || 0;

      const now = new Date();
      const fechaActual = now.toISOString().slice(0, 10);
      const horaActual = now.toLocaleTimeString();

      const escapeHtml = (text) => {
        return String(text ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

      const tableRows = products.map((p, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td class="product-name">${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category || "Sin categoría")}</td>
        <td class="right">${p.product_stock || 0}</td>
        <td class="right">${Number(p.selling_price || 0).toFixed(2)}</td>
      </tr>
    `).join("");

      const logoUrl = `${window.location.origin}/tajima.png`;

      const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Historial de productos</title>
  <style>
    @page {
      size: letter portrait;
      margin: 18mm 14mm 18mm 14mm;
    }

    body {
      font-family: Arial, sans-serif;
      color: #000;
      margin: 0;
      font-size: 13px;
    }

    .page {
      width: 100%;
    }

    .header {
      display: table;
      width: 100%;
      margin-bottom: 10px;
    }

    .header-left,
    .header-center,
    .header-right {
      display: table-cell;
      vertical-align: top;
    }

    .header-left { width: 33%; }
    .header-center { width: 34%; text-align: center; }
    .header-right { width: 33%; text-align: right; font-size: 12px; }

    .logo {
      width: 120px;
      height: auto;
      display: block;
      margin-bottom: 8px;
    }

    .company {
      font-size: 12px;
      line-height: 1.25;
    }

    .title {
      font-size: 16px;
      font-weight: 800;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .center-info {
      font-size: 12px;
      line-height: 1.3;
    }

    .meta-right div {
      margin-bottom: 3px;
    }

    .separator {
      border-top: 1px solid #bbb;
      margin: 12px 0 8px 0;
    }

    .range-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }

    thead th {
      border-top: 2px solid #222;
      border-bottom: 2px solid #222;
      padding: 7px 6px;
      text-align: left;
      font-size: 13px;
    }

    tbody td {
      padding: 5px 6px;
      font-size: 11px;
      border-bottom: 1px solid #ddd;
    }

    .product-name {
      font-size: 11px;
    }

    .center {
      text-align: center;
    }

    .right {
      text-align: right;
    }

    .footer-summary {
      margin-top: 14px;
      border-top: 2px solid #222;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <img class="logo" src="${logoUrl}" alt="TAJIMA" />
        <div class="company">
          <div><b>BORDADOS COMPUTARIZADOS</b></div>
          <div>Y APLICACIONES TAJIMA TEXTIL</div>
          <div>E-mail: byatajima@gmail.com</div>
          <div>jhonnfya@hotmail.com</div>
        </div>
      </div>

      <div class="header-center">
        <div class="title">HISTORIAL DE PRODUCTOS</div>
        <div class="center-info">
          <div><b>Dir.:</b> Av. Juan Pablo II Ceja</div>
          <div>(El Alto lado Transito - Bolivia)</div>
          <div>Cel.: 75866135 - 75274747 - 77221750</div>
        </div>
      </div>

      <div class="header-right">
        <div class="meta-right">
          
          <div><b>Fecha:</b> ${fechaActual}</div>
          <div><b>Hora:</b> ${horaActual}</div>
        </div>
      </div>
    </div>

    <div class="separator"></div>

    <div class="range-row">
      <div>Listado general de productos</div>
      <div><b>Filas:</b> ${totalProducts}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:60px;" class="center">#</th>
          <th>Producto</th>
          <th style="width:180px;">Categoría</th>
          <th style="width:100px;" class="right">Stock</th>
          <th style="width:130px;" class="right">Precio</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows || `<tr><td colspan="5">No hay productos</td></tr>`}
      </tbody>
    </table>

    <div class="footer-summary">
      <div>TOTAL PRODUCTOS: ${totalProducts}</div>
      <div>STOCK TOTAL: ${totalStock}</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>
    `;

      const w = window.open("", "_blank", "width=1100,height=800");
      if (!w) {
        swal("Bloqueado", "Tu navegador bloqueó la ventana de impresión. Permite pop-ups.", "warning");
        return;
      }

      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (error) {
      console.log(error);
      swal("¡Ups!", "Error al generar el reporte", "error");
    }
  };
  useEffect(() => {
    moment.locale("es");
    fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/verifiy_token`, {
      method: 'POST',
      credentials: 'include'
    })
      .then(res => res.json())
      .then(body => {
        if (body.operation === 'success') {
          fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_permission`, {
            method: 'POST',
            credentials: 'include'
          })
            .then(res => res.json())
            .then(body => {
              const p = body.permissions?.find(x => x.page === 'products');

              if (p?.view && p?.create) {
                setPermission(p);
              } else {
                window.location.href = '/unauthorized';
              }
            });
        } else {
          window.location.href = '/login';
        }
      })
      .catch(console.log);
  }, [])

  const getProducts = async (sv, sc, so, scv) => {
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_products`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({ start_value: sv, sort_column: sc, sort_order: so, search_value: scv }),
      credentials: 'include'
    })

    let body = await result.json()
    setProducts(body.info.products)
    setProdCount(body.info.count)
  }

  useEffect(() => {
    if (permission !== null) {
      let p1 = getProducts((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
      Promise.all([p1])
        .then(() => {
          setPageState(2);
        })
        .catch((err) => {
          console.log(err)
          setPageState(3)
        })
    }
  }, [permission])

  useEffect(() => {
    if (permission !== null)
      getProducts((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
  }, [tablePage, sortColumn, sortOrder, searchInput])

  const deleteProduct = async (id) => {
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/delete_product`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({ product_id: id }),
      credentials: 'include'
    })

    let body = await result.json()
    if (body.operation === 'success') {
      getProducts((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
      swal('Éxito', body.message, 'success')
    } else {
      swal('¡Ups!', 'Algo salió mal', 'error')
    }
  }

  // Para mostrar género en español en la tabla
  const tallaLabel = (t) => {
    if (!t) return "";
    const v = String(t).trim().toUpperCase();
    return v; // XS, S, M, L, XL, XXL, XXXL, VARIAS
  };


  useEffect(() => {
    if (products.length !== 0) {
      let tArray = products.map((obj, i) => {
        let tObj = {}
        tObj.sl = i + 1;
        tObj.name = obj.name;
        tObj.gender = tallaLabel(obj.gender);

        tObj.category = obj.category;
        tObj.stock = obj.product_stock;
        tObj.addedon = moment(obj.timeStamp).format('D [de] MMMM, YYYY');
        tObj.action =
          <>
            <button className='btn warning' style={{ marginRight: '0.5rem' }} onClick={() => { editModalInit(obj.product_id) }}>
              Ver/Editar
            </button>
            {
              permission.delete &&
              <button
                className='btn danger'
                style={{ marginLeft: '0.5rem' }}
                onClick={() => {
                  swal({
                    title: "¿Estás seguro?",
                    text: "Si lo eliminas, no podrás recuperar este registro.",
                    icon: "warning",
                    buttons: ["Cancelar", "Sí, eliminar"],
                    dangerMode: true,
                  })
                    .then((willDelete) => {
                      if (willDelete) {
                        deleteProduct(obj.product_id)
                      }
                    });
                }}
              >
                Eliminar
              </button>
            }
          </>
        return tObj;
      })
      setData(tArray)
    }
  }, [products])

  const editModalInit = (id) => {
    let p = products.find(x => x.product_id === id)
    setEditProductId(id);

    setEditName(p.name)
    setEditGender(p.gender)
    setEditSize(p.size)
    setEditMaterial(p.material)
    setEditCategory(p.category)
    setEditDescription(p.description)
    setEditStock(p.product_stock.toString())
    setEditOldImage(p.image)
    setEditSellingPrice(p.selling_price.toString())
    setEditPurchasePrice(p.purchase_price.toString())

    setEditModalShow(true);
  }

  const deleteImage = async (id) => {
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/delete_product_image`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({ product_id: id }),
      credentials: 'include'
    })

    let body = await result.json()
    if (body.operation === 'success') {
      getProducts((tablePage - 1) * 10, sortColumn, sortOrder, searchInput)
      setEditOldImage(null)
      swal('Éxito', body.message, 'success')
    } else {
      swal('¡Ups!', 'Algo salió mal', 'error')
    }
  }

  useEffect(() => {
    if (editImage !== "") {
      let f = new FileReader()
      f.onload = (e) => {
        setEditImageData(e.target.result)
      }
      f.readAsDataURL(editImage)
    }
  }, [editImage])

  const updateProduct = async () => {
    if (editName === "") {
      swal("¡Ups!", "El nombre no puede estar vacío", "error")
      return;
    }
    if ((editSellingPrice === "") || (parseFloat(editSellingPrice) <= 0)) {
      swal("¡Ups!", "El precio de venta no puede estar vacío", "error")
      return;
    }
    if ((editPurchasePrice === "") || (parseFloat(editPurchasePrice) <= 0)) {
      swal("¡Ups!", "El precio de compra no puede estar vacío", "error")
      return;
    }
    if ((editStock < 0) || (parseInt(editStock) < 0)) {
      swal("¡Ups!", "El stock del producto no puede ser negativo", "error")
      return;
    }

    let f = new FormData();
    f.append('product_id', editProductId)
    f.append('name', editName)
    f.append('gender', editGender)
    f.append('size', editSize)
    f.append('material', editMaterial)
    f.append('category', editCategory)
    f.append('description', editDescription)
    f.append('product_stock', parseInt(editStock))
    f.append('image', editImage)
    f.append('selling_price', parseFloat(editSellingPrice))
    f.append('purchase_price', parseFloat(editPurchasePrice))

    setEditModalSubmitButton(true);

    let response = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/update_product`, {
      method: 'POST',
      body: f,
      credentials: 'include'
    })
    let body = await response.json()

    setEditModalSubmitButton(false)

    if (body.operation === 'success') {
      console.log('Producto actualizado correctamente')
      swal("¡Éxito!", "Producto actualizado correctamente", "success")
      handleEditModalClose()
      getProducts((tablePage - 1) * 10, sortColumn, sortOrder, searchInput)
    } else {
      swal("¡Ups!", body.message, "error")
    }
  }

  const handleEditModalClose = () => {
    setEditModalShow(false);

    setEditProductId(null);
    setEditName('')
    setEditGender("male")
    setEditSize('')
    setEditMaterial('')
    setEditCategory('')
    setEditDescription('')
    setEditStock('0')
    setEditSellingPrice('0')
    setEditPurchasePrice('0')

    setEditOldImage(null)

    setEditImage('')
    setEditImageData(null)
  }

  return (
    <div className='products'>
      <div className='products-scroll' >
        <div className='product-header'>
          <div className='title'>Productos</div>

          <div style={{ display: "flex", gap: "10px", marginRight: "0.5rem" }}>
            <button className='btn warning' onClick={imprimirReporteProductos}>
              Imprimir por categorías
            </button>
            <button className='btn primary' onClick={imprimirReporteProductosGeneral}>
              Imprimir general
            </button>
            <button className='btn danger' onClick={imprimirReporteStockBajo}>
              Imprimir stock bajo
            </button>
            {permission !== null && permission.create && (
              <Link
                to={"/products/addnew"}
                className='btn success'
                style={{ textDecoration: "none" }}
              >
                Agregar nuevo
              </Link>
            )}
          </div>

        </div>



        {
          pageState === 1 ?
            <Loader />
            : pageState === 2 ?
              <div className="card">
                <div className="container">
                  <Table
                    headers={['N°', 'Nombre', 'Talla', 'Categoría', 'Stock actual', 'Fecha', 'Acción']}
                    columnOriginalNames={["name", "gender", "category", "product_stock", "timeStamp"]}



                    sortColumn={sortColumn}
                    setSortColumn={setSortColumn}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                    data={data}
                    data_count={prodCount}
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    custom_styles={["3rem", "8rem", "5rem", "5rem", "6rem", "8rem", "10rem"]}
                    current_page={tablePage}
                    tablePageChangeFunc={setTablePage}
                  />
                </div>
              </div>
              :
              <Error />
        }

        <Modal show={editModalShow} onHide={() => { handleEditModalClose() }} size="lg" centered >
          <Modal.Header closeButton>
            <Modal.Title className='fs-4 fw-bold' style={{ color: "#2cd498" }}>
              Ver / Editar producto
            </Modal.Title>
          </Modal.Header>

          <Modal.Body style={{ backgroundColor: "#fafafa" }} >
            <div className='container d-flex gap-2 my_modal_container'>
              <div className='card my_card' style={{ flex: 1 }}>
                <div className='card-body'>
                  <div className='form-group mb-2'>
                    <label className='fst-italic fw-bold'>Nombre</label>
                    <input className='my_form_control' type='text' value={editName} onChange={(e) => { setEditName(e.target.value) }} />
                  </div>

                  <div className='form-group mb-2'>
                    <label className='fst-italic fw-bold'>Talla</label>
                    <select
                      className='my_form_control'
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value)}
                    >
                      <option value="">Seleccionar talla</option>
                      <option value="XS">XS</option>
                      <option value="SS">SS</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="XXL">XXL</option>
                      <option value="XXXL">XXXL</option>
                      <option value="VARIAS">Varias</option>
                    </select>


                  </div>

                  <div className='form-group mb-2'>
                    <label className='fst-italic fw-bold'>Talla</label>
                    <input className='my_form_control' type='text' value={editSize} onChange={(e) => { setEditSize(e.target.value) }} />
                  </div>
                  <div className='form-group mb-2'>
                    <label className='fst-italic fw-bold'>Material</label>
                    <input className='my_form_control' type='text' value={editMaterial} onChange={(e) => { setEditMaterial(e.target.value) }} />
                  </div>
                  <div className='form-group mb-2'>
                    <label className='fst-italic fw-bold'>Categoría</label>
                    <select
                      className='my_form_control'
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                    >
                      <option value="">Seleccionar categoría</option>
                      <option value="Uniformes">Uniformes</option>
                      <option value="Chamarras">Chamarras</option>
                      <option value="Parkas">Parkas</option>
                      <option value="Panocas">Panocas</option>
                      <option value="Accesorios">Accesorios</option>
                      <option value="Otro">Otro</option>
                    </select>

                  </div>
                  <div className='form-group mb-2'>
                    <label className='fst-italic fw-bold'>Descripción</label>
                    <input className='my_form_control' type='text' value={editDescription} onChange={(e) => { setEditDescription(e.target.value) }} />
                  </div>
                  <div className='form-group mb-2'>
                    <label className='fst-italic fw-bold'>Precio de venta</label>
                    <input className='my_form_control' type='number' value={editSellingPrice} onChange={(e) => { setEditSellingPrice(e.target.value) }} />
                  </div>
                  <div className='form-group mb-2'>
                    <label className='fst-italic fw-bold'>Precio de compra</label>
                    <input className='my_form_control' type='number' value={editPurchasePrice} onChange={(e) => { setEditPurchasePrice(e.target.value) }} />
                  </div>
                  <div className='form-group mb-2'>
                    <label className='fst-italic fw-bold'>Stock</label>
                    <input
                      className='my_form_control'
                      type='number'
                      value={editStock}
                      onChange={(e) => { setEditStock(e.target.value) }}
                      disabled={permission?.delete !== true}
                    />
                  </div>

                </div>
              </div>

              <div className='card my_card' style={{ flex: 1 }}>
                <div className='card-body d-flex flex-column align-items-center'>
                  {
                    editOldImage !== null ?
                      <>
                        <img src={`${process.env.REACT_APP_BACKEND_ORIGIN}/uploads/${editOldImage}`} alt="product_image" className='rounded' style={{ width: "90%", margin: "15px", border: "1px #89c878 solid" }} />
                        <button
                          className='btn my_btn'
                          onClick={() => {
                            swal({
                              title: "¿Estás seguro?",
                              text: "Si eliminas esta imagen, no podrás recuperarla.",
                              icon: "warning",
                              buttons: ["Cancelar", "Sí, eliminar"],
                              dangerMode: true,
                            })
                              .then((willDelete) => {
                                if (willDelete) {
                                  deleteImage(editProductId)
                                }
                              });
                          }}
                        >
                          <DeleteOutline />
                        </button>
                      </> :
                      <>
                        <img src={!editImageData ? '/images/default_image.jpg' : editImageData} alt="product_image" className='rounded' style={{ width: "90%", margin: "15px", border: "1px #89c878 solid" }} />
                        <button className='btn my_btn' onClick={() => { editFileInputRef.current.click() }} >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 528.899 528.899" >
                            <g><path d="M328.883,89.125l107.59,107.589l-272.34,272.34L56.604,361.465L328.883,89.125z M518.113,63.177l-47.981-47.981   c-18.543-18.543-48.653-18.543-67.259,0l-45.961,45.961l107.59,107.59l53.611-53.611   C532.495,100.753,532.495,77.559,518.113,63.177z M0.3,512.69c-1.958,8.812,5.998,16.708,14.811,14.565l119.891-29.069   L27.473,390.597L0.3,512.69z" /></g>
                          </svg>
                        </button>

                        <input
                          ref={editFileInputRef}
                          type="file"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            if (e.target.files[0].type === "image/jpeg" || e.target.files[0].type === "image/png") {
                              setEditImage(e.target.files[0])
                            } else {
                              swal("¡Ups!", "Tipo de archivo no compatible. Sube .jpg, .jpeg o .png", "warning")
                            }
                          }}
                        />
                      </>
                  }
                </div>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <button className='btn btn-outline-danger' style={{ transition: "color 0.4s, background-color 0.4s" }} onClick={() => { handleEditModalClose() }}>
              Cancelar
            </button>

            {
              permission !== null && permission.edit &&
              <button
                className='btn btn-outline-success'
                style={{ transition: "color 0.4s, background-color 0.4s" }}
                disabled={editModalSubmitButton}
                onClick={() => {
                  swal({
                    title: "¿Estás seguro?",
                    icon: "warning",
                    buttons: ["Cancelar", "Sí, actualizar"],
                    dangerMode: true,
                  })
                    .then((willUpdate) => {
                      if (willUpdate) {
                        updateProduct()
                      }
                    });
                }}
              >
                {editModalSubmitButton ? <div className="button-loader"></div> : "Actualizar"}
              </button>
            }
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  )
}

export default Products

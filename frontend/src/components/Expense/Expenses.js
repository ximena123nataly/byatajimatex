import React, { useEffect, useState } from 'react'
import { Link } from "react-router-dom"
import { Modal, OverlayTrigger, Popover } from 'react-bootstrap';
import './Expenses.scss'
import Table from '../Table/Table'

import moment from 'moment'
import swal from 'sweetalert';
import Loader from '../PageStates/Loader';
import Error from '../PageStates/Error';

function Expenses() {
  const [pageState, setPageState] = useState(1)
  const [permission, setPermission] = useState(null)

  const [expenses, setExpenses] = useState([])
  const [expenseCount, setExpenseCount] = useState(0)

  const [searchInput, setSearchInput] = useState("")
  const [sortColumn, setSortColumn] = useState("")
  const [sortOrder, setSortOrder] = useState("")
  const [tablePage, setTablePage] = useState(1)
  const [data, setData] = useState([])

  //  filtros fecha
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Modal
  const [viewModalShow, setViewModalShow] = useState(false)
  const [viewExpenseDetails, setViewExpenseDetails] = useState(null)
  const [productDetails, setProductDetails] = useState([])
  const [filterFrom, setFilterFrom] = useState(null);
  const [filterTo, setFilterTo] = useState(null);
  //para mostrar la fecha de hoy 
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDateFrom(today);
    setDateTo(today);
  }, []);

  useEffect(() => {
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
              const p = body.permissions?.find(x => x.page === 'expenses');
              if (p?.view && p?.create) setPermission(p);
              else window.location.href = '/unauthorized';
            });
        } else {
          window.location.href = '/login';
        }
      })
      .catch(console.log);
  }, [])

  const getExpenses = async (sv, sc, so, scv) => {
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_expenses`, {
      method: 'POST',
      headers: { 'Content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        start_value: sv,
        sort_column: sc,
        sort_order: so,
        search_value: scv,
        date_from: filterFrom,
        date_to: filterTo,

      }),
      credentials: 'include'
    })

    let body = await result.json()
    setExpenses(body.info.expenses)
    setExpenseCount(body.info.count)
  }

  const getProductsDetailsById = async (value) => {
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_products_details_by_id`, {
      method: 'POST',
      headers: { 'Content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ product_id_list: value }),
      credentials: 'include'
    })

    let body = await result.json()
    setProductDetails(body.info.products);
  }

  //  igual que Ventas: una sola recarga controlada
  useEffect(() => {
    if (permission !== null) {
      getExpenses((tablePage - 1) * 10, sortColumn, sortOrder, searchInput)
        .then(() => setPageState(2))
        .catch(() => setPageState(3))
    }
  }, [permission, tablePage, sortColumn, sortOrder, searchInput])

  const deleteExpense = async (id) => {
    let result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/delete_expense`, {
      method: 'POST',
      headers: { 'Content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ expense_id: id }),
      credentials: 'include'
    })

    let body = await result.json()
    if (body.operation === 'success') {
      getExpenses((tablePage - 1) * 10, sortColumn, sortOrder, searchInput);
      swal('Éxito', body.message, 'success')
    } else {
      swal('Oops!', 'Algo salió mal', 'error')
    }
  }

  useEffect(() => {
    if (expenses.length !== 0) {
      let tArray = expenses.map((obj, i) => {
        let tObj = {}
        tObj.sl = i + 1;
        tObj.expense_ref = obj.expense_ref;
        tObj.supplier_name = obj.supplier_name;
        tObj.due_date = moment(obj.due_date).format('D [de] MMMM, YYYY');
        tObj.grand_total = obj.grand_total;
        tObj.addedon = moment(obj.timeStamp).format('D [de] MMMM, YYYY');
        tObj.action =
          <>
            <button className='btn warning' style={{ marginRight: '0.5rem' }} onClick={() => { viewModalInit(obj.expense_id) }} >
              Ver
            </button>
            {
              permission?.delete &&
              <button className='btn danger' style={{ marginLeft: '0.5rem' }}
                onClick={() => {
                  swal({
                    title: "¿Estás seguro?",
                    text: "Una vez eliminado, no podrás recuperar este registro.",
                    icon: "warning",
                    buttons: true,
                    dangerMode: true,
                  })
                    .then((willDelete) => {
                      if (willDelete) deleteExpense(obj.expense_id)
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
    } else {
      setData([])
    }
  }, [expenses, permission])

  const viewModalInit = (id) => {
    let p = expenses.find(x => x.expense_id === id)
    setViewExpenseDetails(p)
    setViewModalShow(true)

    try {
      getProductsDetailsById(JSON.parse(p.items).map(x => x.product_id))
    } catch (e) {
      setProductDetails([])
    }
  }

  const handleViewModalClose = () => {
    setViewModalShow(false)
    setViewExpenseDetails(null)
    setProductDetails([])
  }

  // ---------- helpers ----------
  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const money = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return "0.00";
    return num.toFixed(2);
  };

  // ---------- imprimir detalle gasto ----------
  const imprimirGasto = (gasto) => {
    if (!gasto) return;
    const pad7 = (n) => String(n ?? "").padStart(7, "0");

    let items = [];
    try { items = gasto.items ? JSON.parse(gasto.items) : []; } catch (e) { items = []; }

    const filas = (items || [])
      .map((it) => {
        const cant = toNumber(it.quantity ?? it.cantidad);
        const pu = toNumber(it.rate ?? it.precio_unitario);
        const det = String(it.product_name ?? it.detalle ?? "").replace(/\n/g, "<br/>");
        const tot = cant * pu;

        return `
          <tr>
            <td class="td-right" style="width:55px;">${cant}</td>
            <td class="td-left wrap">${det}</td>
            <td class="td-right" style="width:80px;">${money(pu)}</td>
            <td class="td-right" style="width:90px;">${money(tot)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Gasto ${gasto.expense_ref || ""}</title>
  <style>
    @page { size: letter portrait; margin: 0; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111; }
    .ticket { width: 8.5in; height: 5.5in; box-sizing: border-box; padding: 0.35in 0.45in; margin: 0 auto; overflow: hidden; }
    .wrap { word-break: break-word; overflow-wrap: anywhere; }
    .small { font-size: 11px; line-height: 1.25; }
    .muted { color: #444; }
    .title { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .col-left  { width: 33%; }
    .col-center{ width: 34%; text-align: center; }
    .col-right { width: 33%; text-align: right; }
    .logo { width: 170px; height: auto; display: block; margin-bottom: 6px; }
    hr { border: 0; border-top: 1px solid #ddd; margin: 10px 0; }
    .mid { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .mid-left { width: 55%; }
    .mid-right{ width: 45%; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    thead th { font-size: 12px; text-align: left; border-bottom: 1px solid #ddd; padding: 7px 6px; }
    tbody td { font-size: 12px; border-bottom: 1px dashed #eee; padding: 7px 6px; vertical-align: top; }
    .td-right { text-align: right; }
    .td-left { text-align: left; }
    .totals { width: 260px; margin-left: auto; margin-top: 10px; }
    .totals table { width: 100%; }
    .totals td { font-size: 12px; padding: 4px 6px; }
    .totals tr td:first-child { text-align: left; }
    .totals tr td:last-child { text-align: right; font-weight: 700; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <div class="col-left">
        <img class="logo" src="/tajima.png" alt="TAJIMA" />
        <div class="small">
          <div><b>BORDADOS COMPUTARIZADOS</b></div>
          <div>Y APLICACIONES TAJIMA TEXTIL</div>
          <div class="muted">E-mail: byatajima@gmail.com</div>
          <div class="muted">jhonnfya@hotmail.com</div>
        </div>
      </div>

      <div class="col-center">
        <div class="title">GASTO</div>
        <div class="small" style="margin-top:10px;">
          <div><b>Dir.:</b> Av. Juan Pablo II Ceja</div>
          <div>(El Alto lado Transito - Bolivia)</div>
          <div>Cel.: 75866135-75274747-77221750</div>
        </div>
      </div>

      <div class="col-right small" style="margin-top:14px;">
        <div>N°: <span style="font-size:18px; font-weight:800;">${pad7(gasto.expense_id)}</span></div>
        <div>Fecha: <b>${moment(gasto.timeStamp).format("YYYY-MM-DD")}</b></div>
      </div>
    </div>

    <hr />

    <div class="mid small">
      <div class="mid-left wrap">
        <div><b>Proveedor:</b> ${gasto.supplier_name || ""}</div>
        <div><b>Vence:</b> ${moment(gasto.due_date).format("YYYY-MM-DD")}</div>
        <div><b>Impuesto:</b> ${toNumber(gasto.tax)}%</div>
      </div>
      <div class="mid-right">
        <div class="muted"><b>Total:</b> ${money(gasto.grand_total)}</div>
      </div>
    </div>

    <hr />

    <table>
      <thead>
        <tr>
          <th style="width:55px;" class="td-right">Cant</th>
          <th class="td-left">Detalle</th>
          <th style="width:80px;" class="td-right">P/U</th>
          <th style="width:90px;" class="td-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${filas || `<tr><td colspan="4" style="padding:10px; font-size:12px;">(Sin ítems)</td></tr>`}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr><td>Impuesto</td><td>${toNumber(gasto.tax)}%</td></tr>
        <tr><td>Total</td><td>${money(gasto.grand_total)}</td></tr>
      </table>
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

    const w = window.open("", "_blank", "width=900,height=650");
    if (!w) {
      swal("Bloqueado", "Tu navegador bloqueó la ventana de impresión. Permite pop-ups.", "warning");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

   // ✅ TÉRMICA: impresión 80mm para gastos
  const imprimirGastoTermico = (p) => {
    if (!p) return;

    const safe = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    //const items = Array.isArray(p.items) ? p.items : [];

    let items = [];
    try { items = p.items ? JSON.parse(p.items) : []; } catch (e) { items = []; }

    


    const filas = items.map((it) => {
      const cant = toNumber(it.quantity);
      const pu   = toNumber(it.rate);
      const tot  = cant * pu;
      const det  = safe(it.detalle || "").replace(/\n/g, "<br/>");
      return `
        <tr>
          <td class="td-right" style="width:28px;">${cant}</td>
          <td class="td-left wrap">${det}</td>
          <td class="td-right" style="width:52px;">${money(pu)}</td>
          <td class="td-right" style="width:56px;">${money(tot)}</td>
        </tr>`;
    }).join("");

    const subtotalVal = items.reduce((acc, it) => acc + toNumber(it.quantity) * toNumber(it.rate), 0);

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Gasto ${safe(p.ref || "")}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Lucida Console', Courier, monospace;
      font-size: 11px;
      color: #000;
      width: 80mm;
    }
    .ticket { width: 80mm; padding: 4mm 4mm 8mm 4mm; }
    .center { text-align: center; }
    .bold   { font-weight: 700; -webkit-text-stroke: 0.3px #000; text-shadow: 0.3px 0 0 #000; }
    .wrap   { word-break: break-word; overflow-wrap: anywhere; }
    .empresa-nombre { font-size: 13px; font-weight: 800; text-align: center; -webkit-text-stroke: 0.4px #000; text-shadow: 0.4px 0 0 #000; }
    .empresa-sub    { font-size: 10px; text-align: center; line-height: 1.3; }
    .sep-solid  { border: 0; border-top: 1px solid #000; margin: 3px 0; }
    .sep-dashed { border: 0; border-top: 1px dashed #000; margin: 3px 0; }
    .num-ref { font-size: 15px; font-weight: 800; text-align: center; margin: 2px 0; -webkit-text-stroke: 0.5px #000; text-shadow: 0.5px 0 0 #000; }
    .info-row { display: flex; justify-content: space-between; font-size: 10px; gap: 4px; }
    .info-row span:first-child { font-weight: 700; -webkit-text-stroke: 0.3px #000; text-shadow: 0.3px 0 0 #000; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      font-size: 10px; text-align: left;
      border-top: 1px solid #000; border-bottom: 1px solid #000;
      padding: 2px;
    }
    tbody td { font-size: 10px; padding: 2px; vertical-align: top; border-bottom: 1px dashed #ccc; }
    tbody tr:last-child td { border-bottom: 1px solid #000; }
    .td-right { text-align: right; }
    .td-left  { text-align: left; }
    .totals { margin-top: 4px; font-size: 11px; }
    .totals .t-row { display: flex; justify-content: space-between; padding: 1px 0; }
    .totals .t-row.grande {
      font-size: 13px; font-weight: 800;
      border-top: 1px solid #000; margin-top: 2px; padding-top: 2px;
      -webkit-text-stroke: 0.4px #000; text-shadow: 0.4px 0 0 #000;
    }
    .firma { margin-top: 10mm; border-top: 1px solid #000; text-align: center; font-size: 10px; padding-top: 2px; }
  </style>
</head>
<body>
  <div class="ticket">

    <div class="center" style="margin-bottom:4px;">
      <img src="/tajima.png" alt="TAJIMA" style="width:30mm; height:auto; display:block; margin:0 auto;" />
    </div>

    <div class="empresa-nombre">BYATAJIMATEX</div>
    <div class="empresa-sub">
      BORDADOS COMPUTARIZADOS<br/>
      Y APLICACIONES<br/>
      Av. Juan Pablo II Ceja<br/>
      (El Alto lado Tránsito - Bolivia)<br/>
      Cel.: 75866135 · 75274747 · 77221750<br/>
      byatajima@gmail.com
    </div>

    <hr class="sep-solid"/>
    <div class="center bold" style="font-size:11px; margin-bottom:1px;">GASTO</div>
    <div class="num-ref">Ref: ${safe(p.expense_id || "--")}</div>

    <hr class="sep-dashed"/>
    <div class="info-row"><span>Fecha:</span><span>${safe(p.due_date || "")}</span></div>

    <hr class="sep-dashed"/>
    <div class="info-row"><span>Proveedor:</span><span class="wrap">${safe(p.supplier_name || "-")}</span></div>


    <hr class="sep-solid"/>

    <table>
      <thead>
        <tr>
          <th style="width:28px;" class="td-right">Cant</th>
          <th class="td-left">Detalle</th>
          <th style="width:52px;" class="td-right">P/U</th>
          <th style="width:56px;" class="td-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${filas || `<tr><td colspan="4" class="td-left" style="padding:3px;">(Sin ítems)</td></tr>`}
      </tbody>
    </table>

    <div class="totals">
      <div class="t-row"><span>Subtotal:</span><span>${money(subtotalVal)}</span></div>
      <div class="t-row"><span>   </span><span>  </span></div>
      <div class="t-row grande"><span>TOTAL:</span><span>${money(p.grand_total)}</span></div>
    </div>

    <div class="firma">Firma / Sello</div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) {
      swal("Bloqueado", "Tu navegador bloqueó la ventana de impresión. Permite pop-ups.", "warning");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  //  imprimir reporte (filtrado)
  const imprimirGastosFiltrados = async () => {
    const result = await fetch(`${process.env.REACT_APP_BACKEND_ORIGIN}/get_expenses`, {
      method: "POST",
      headers: { "Content-type": "application/json; charset=UTF-8" },
      credentials: "include",
      body: JSON.stringify({
        start_value: 0,
        sort_column: sortColumn,
        sort_order: sortOrder,
        search_value: searchInput,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        export_all: true,
      }),
    });

    const body = await result.json();
    const rows = body.info?.expenses || [];

    const safe = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const filas = rows.map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${safe(e.expense_ref || "")}</td>
        <td>${safe(e.supplier_name || "")}</td>
        <td>${e.due_date ? moment(e.due_date).format("YYYY-MM-DD") : ""}</td>
        <td style="text-align:right;">${money(e.grand_total)}</td>
        <td>${e.timeStamp ? moment(e.timeStamp).format("YYYY-MM-DD") : ""}</td>
      </tr>
    `).join("");

    const totalSum = rows.reduce((acc, e) => acc + toNumber(e.grand_total), 0);

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Historial de Gastos</title>

  <style>
    @page { size: letter portrait; margin: 0; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111; }

    .page {
      width: 8.5in;
      height: 11in;
      padding: 0.45in;
      box-sizing: border-box;
    }

    .header{
      display: grid;
      grid-template-columns: 230px 1fr 170px;
      column-gap: 28px;
      align-items: start;
    }

    .col-left{ }
    .col-center{ text-align: center; }
    .col-right{ }

    .logo{
      width: 180px;
      margin-bottom: 6px;
    }

    .small{ font-size: 11px; line-height: 1.3; }
    .muted{ color:#444; }
    .title{ font-size: 18px; font-weight: 700; }

    .rightBox{
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 11px;
    }

    .rline{
      display: flex;
      gap: 8px;
    }

    .lbl{ min-width: 54px; font-weight: 700; }
    .val{ font-weight: 400; }

    hr.sep{
      border: 0;
      border-top: 1px solid #000;
      margin: 8px 0;
    }

    .meta{
      font-size: 12px;
      font-weight: 600;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }

    table{
      width:100%;
      border-collapse: collapse;
      margin-top: 6px;
    }

    th,td{
      border-bottom:1px solid #ccc;
      padding:6px;
      font-size:12px;
    }

    th{
      border-top:2px solid #000;
      border-bottom:2px solid #000;
    }

    .c-center{text-align:center}
    .c-right{text-align:right}
    .c-left{text-align:left}

    .totals{
      margin-top: 10px;
      font-size: 12px;
      font-weight: 700;
      display:flex;
      justify-content: space-between;
      border-top:2px solid #000;
      padding-top:6px;
    }
  </style>
</head>

<body>
  <div class="page">

    <!-- HEADER -->
    <div class="header">
      <div class="col-left">
        <img class="logo" src="/tajima.png" />
        <div class="small">
          <div><b>BORDADOS COMPUTARIZADOS</b></div>
          <div>Y APLICACIONES TAJIMA TEXTIL</div>
          <div class="muted">E-mail: byatajima@gmail.com</div>
          <div class="muted">jhonnfya@hotmail.com</div>
        </div>
      </div>

      <div class="col-center">
        <div class="title">HISTORIAL DE GASTOS</div>
        <div class="small" style="margin-top:6px;">
          <div><b>Dir.:</b> Av. Juan Pablo II Ceja</div>
          <div>(El Alto lado Tránsito - Bolivia)</div>
          <div>Cel.: 75866135 - 75274747 - 77221750</div>
        </div>
      </div>

      <div class="col-right">
        <div class="rightBox">
          <div class="rline"><span class="lbl">Fecha:</span><span class="val">${moment().format("YYYY-MM-DD")}</span></div>
          <div class="rline"><span class="lbl">Hora:</span><span class="val">${moment().format("HH:mm:ss")}</span></div>
        </div>
      </div>
    </div>

    <hr class="sep"/>

    <div class="meta">
      <div>Del ${dateFrom || "—"} al ${dateTo || "—"}</div>
      <div>Filas: <b>${rows.length}</b></div>
    </div>

    <!-- TABLA -->
    <table>
      <thead>
        <tr>
          <th class="c-center">#</th>
          <th class="c-center">Ref</th>
          <th class="c-left">Proveedor</th>
          <th class="c-center">Vence</th>
          <th class="c-right">Total</th>
          <th class="c-center">Fecha</th>
        </tr>
      </thead>
      <tbody>
        ${filas || `<tr><td colspan="6">Sin datos</td></tr>`}
      </tbody>
    </table>

    <div class="totals">
      <div>TOTAL GASTOS: ${rows.length}</div>
      <div>MONTO TOTAL: ${money(totalSum)}</div>
    </div>

  </div>

  <script>
    window.onload = function(){
      window.print();
      window.onafterprint = function(){ window.close(); }
    }
  </script>
</body>
</html>
`;


    const w = window.open("", "_blank", "width=900,height=650");
    if (!w) {
      swal("Bloqueado", "Tu navegador bloqueó la ventana de impresión. Permite pop-ups.", "warning");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className='expenses'>
      <div style={{ overflow: "scroll", height: "100%" }} >

        {/* ✅ HEADER IGUAL A VENTAS */}
        <div className='expense-header'>

          <div className="filters-bar">
            <div className="filters-left">
              <label>
                Desde:
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </label>

              <label>
                Hasta:
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </label>

              <button
                className="btn primary"
                onClick={() => {
                  setFilterFrom(dateFrom || null);
                  setFilterTo(dateTo || null);
                  setTablePage(1);
                  getExpenses(0, sortColumn, sortOrder, searchInput);
                }}
              >
                Filtrar
              </button>


              <button className="btn warning" onClick={imprimirGastosFiltrados}>
                Imprimir reporte
              </button>
            </div>
          </div>

          <div className="title-row">
            <div className='title'>Gastos</div>
            <Link to={"/expenses/addnew"} className='btn success' style={{ margin: "0 0.5rem", textDecoration: "none" }}>
              Agregar nuevo
            </Link>
          </div>
        </div>

        {
          pageState === 1 ? <Loader /> :
            pageState === 2 ?
              <div className="card">
                <div className="container">
                  <Table
                    headers={['N°', 'Ref. Gasto', 'Proveedor', 'Vence', 'Total', 'Fecha', 'Acción']}
                    columnOriginalNames={["expense_ref", "supplier_name", "due_date", "grand_total", "timeStamp"]}
                    sortColumn={sortColumn}
                    setSortColumn={setSortColumn}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                    data={data}
                    data_count={expenseCount}
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    custom_styles={["3rem", "5rem", "5rem", "8rem", "5rem", "8rem", "10rem"]}
                    current_page={tablePage}
                    tablePageChangeFunc={setTablePage}
                  />
                </div>
              </div>
              :
              <Error />
        }

        <Modal show={viewModalShow} onHide={handleViewModalClose} size="lg" centered >
          <Modal.Header>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <Modal.Title className='fs-4 fw-bold' style={{ color: "#2cd498" }}>
                Ver gasto
              </Modal.Title>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button className="btn-close" onClick={handleViewModalClose}></button>
              </div>
            </div>
          </Modal.Header>

          <Modal.Body style={{ backgroundColor: "#fafafa" }} >
            {/* tu modal se queda igual */}
            <div className='container d-flex gap-2'>
              <div className='card my_card' style={{ flex: 1 }}>
                <div className='card-body'>
                  {viewExpenseDetails !== null && (
                    <>
                      <div className='form-group mb-2'>
                        <label className='fst-italic fw-bold'>Referencia de gasto</label>
                        <input className='my_form_control' type='text' value={viewExpenseDetails.expense_ref} readOnly />
                      </div>

                      <div className='form-group mb-2'>
                        <label className='fst-italic fw-bold'>Proveedor</label>
                        <input className='my_form_control' type='text' value={viewExpenseDetails.supplier_name} readOnly />
                      </div>

                      <div className='form-group mb-2'>
                        <label className='fst-italic fw-bold'>Fecha de vencimiento</label>
                        <input className='my_form_control' type='text' value={moment(viewExpenseDetails.due_date).format('D [de] MMMM, YYYY')} readOnly />
                      </div>

                      <div className='form-group mb-2'>
                        <label className='fst-italic fw-bold'>Impuesto</label>
                        <input className='my_form_control' type='text' value={`${viewExpenseDetails.tax}%`} readOnly />
                      </div>

                      <div className='form-group mb-2'>
                        <label className='fst-italic fw-bold'>Total</label>
                        <input className='my_form_control' type='text' value={viewExpenseDetails.grand_total} readOnly />
                      </div>

                      <div className='form-group mb-2'>
                        <label className='fst-italic fw-bold mb-2'>Detalle de ítems:</label>
                        <div className='p-2 border rounded'>
                          {/* ... aquí tu código de items igual ... */}
                          {productDetails.length > 0 && JSON.parse(viewExpenseDetails.items).map((viewItem, ind) => {
                            let img = productDetails.find(x => x.product_id === viewItem.product_id)?.image
                            return (
                              <div key={ind} className='py-2 row gx-0' style={{ borderBottom: "1px dashed lightgray" }}>
                                <div className='col-2 d-flex align-items-center justify-content-center'>
                                  <OverlayTrigger
                                    trigger={['hover', 'focus']}
                                    placement="left"
                                    overlay={
                                      (<Popover id="popover-basic" style={{ backgroundColor: "#ebf4ee", boxShadow: "rgb(0 0 0 / 75%) 0px 0px 16px -5px" }}>
                                        <Popover.Body style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px" }}>
                                          {
                                            img === null || img === undefined ?
                                              <div className='d-flex align-items-center text-dark fs-5 text-center' style={{ width: "10rem", height: "10rem" }}>
                                                No hay imagen disponible
                                              </div> :
                                              <img style={{ width: "14rem", borderRadius: "5px" }} src={`${process.env.REACT_APP_BACKEND_ORIGIN}/uploads/${img}`} alt="product" />
                                          }
                                        </Popover.Body>
                                      </Popover>)
                                    }
                                  >
                                    <img
                                      style={{ width: "60px", height: "60px", borderRadius: "5px", objectFit: "cover", cursor: "pointer" }}
                                      src={img === null || img === undefined
                                        ? "https://lh3.googleusercontent.com/SMKEdK_g-LuC3ero8vP9d4lPJBKyzc4t91-GYLQ1vEkhv87KyaxFmWFeEb6ZcyRNet0"
                                        : `${process.env.REACT_APP_BACKEND_ORIGIN}/uploads/${img}`}
                                      alt="product"
                                    />
                                  </OverlayTrigger>
                                </div>
                                <div className='col-4 d-flex align-items-center justify-content-start'>{viewItem.product_name}</div>
                                <div className='col-2 d-flex align-items-center justify-content-center'>{viewItem.quantity}</div>
                                <div className='col-2 d-flex align-items-center justify-content-center'>{viewItem.rate}</div>
                                <div className='col-2 d-flex align-items-center justify-content-center'>{viewItem.rate * viewItem.quantity}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer className="d-flex justify-content-end gap-2">
            <button
              className="btn btn-outline-primary"
              onClick={() => imprimirGasto(viewExpenseDetails)}
              disabled={!viewExpenseDetails}
            >
              Imprimir
            </button>

            <button
              className="btn btn-outline-primary"
              onClick={() => imprimirGastoTermico(viewExpenseDetails)}
              disabled={!viewExpenseDetails}
            >
              Impresion Termica
            </button>

            <button className='btn btn-outline-danger' onClick={handleViewModalClose}>
              Cerrar
            </button>
          </Modal.Footer>
        </Modal>

      </div>
    </div>
  )
}

export default Expenses

import React, { useState } from 'react'
import './Table.scss'

import { OverlayTrigger, Popover } from 'react-bootstrap';

import SearchOutlined from "@mui/icons-material/SearchOutlined";
import ViewColumn from "@mui/icons-material/ViewColumn";
import Close from "@mui/icons-material/Close";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import ArrowUpward from "@mui/icons-material/ArrowUpward";

function Table(props) {

  const [searchBar, setSearchBar] = useState(false)
  const [unsetColumns, setUnsetColumns] = useState([])

  return (
    <div className='dataTable'>

      {/* TOOLBAR */}
      <div className='tableToolbar'>
        <div className="flex-grow-1 d-flex align-items-center">
          <div className='my__icon' onClick={() => setSearchBar(true)}>
            <SearchOutlined />
          </div>

          <input
            className="search__text"
            placeholder="Buscar..."
            style={{ width: searchBar ? "20rem" : "0" }}
            maxLength="200"
            value={props.searchInput}
            onChange={(e) => props.setSearchInput(e.target.value)}
          />

          <Close
            style={{
              transition: "all 0.3s ease-in-out",
              cursor: "pointer",
              visibility: searchBar ? "visible" : "hidden",
              opacity: searchBar ? "1" : "0"
            }}
            onClick={() => {
              setSearchBar(false);
              props.setSearchInput("");
            }}
          />
        </div>

        {/* COLUMN SELECTOR */}
        <OverlayTrigger
          trigger="click"
          placement="bottom-end"
          overlay={
            <Popover id="popover-basic" style={{ backgroundColor: "#e4ffe5" }}>
              <Popover.Body>
                {
                  props.headers.map((val, i) => (
                    <div key={i} className="d-flex align-items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!unsetColumns.includes(val)}
                        onChange={() => {
                          if (unsetColumns.includes(val)) {
                            setUnsetColumns(unsetColumns.filter(x => x !== val))
                          } else {
                            setUnsetColumns([...unsetColumns, val])
                          }
                        }}
                      />
                      <span>{val}</span>
                    </div>
                  ))
                }
              </Popover.Body>
            </Popover>
          }
        >
          <div className='my__icon'>
            <ViewColumn />
          </div>
        </OverlayTrigger>
      </div>

      {/* TABLE */}
      <table className='mytable'>
        <thead>
          <tr>
            {
              props.headers
                .filter(h => !unsetColumns.includes(h))
                .map((col, i) => (
                  <th key={i} style={{ width: (props.custom_styles?.[i] || "auto") }}>
                    <div className='d-flex justify-content-center align-items-center gap-1'>
                      <span
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          if (i !== 0 && i !== props.headers.length - 1) {
                            const realCol = props.columnOriginalNames?.[i - 1];
                            if (realCol) {
                              props.setSortColumn(realCol);
                              props.setSortOrder("ASC");
                            }
                          }
                        }}
                      >
                        {col}
                      </span>

                      {
                        props.sortColumn &&
                        props.columnOriginalNames?.[props.headers.indexOf(col) - 1] === props.sortColumn &&
                        <>
                          {
                            props.sortOrder === "ASC"
                              ? <ArrowDownward onClick={() => props.setSortOrder("DESC")} />
                              : <ArrowUpward onClick={() => props.setSortOrder("ASC")} />
                          }
                          <Close onClick={() => { props.setSortColumn(""); props.setSortOrder("") }} />
                        </>
                      }
                    </div>
                  </th>
                ))
            }
          </tr>
        </thead>

        <tbody>
          {
            props.data.length === 0 ? (
              <tr>
                <td colSpan={props.headers.length} className="text-center">
                  ¡No se encontraron datos!
                </td>
              </tr>
            ) : (
              props.data.map((row, i) => {
                // ✅ NUEVO: clase de fila (si te mandan _rowClass)
                const rowClass = props.rowClassNameKey ? (row?.[props.rowClassNameKey] || "") : "";

                return (
                  <tr key={i} className={rowClass}>
                    {
                      // ✅ NUEVO: en vez de Object.values, usamos entries para poder EXCLUIR la key de clase
                      Object.entries(row)
                        .filter(([key]) => key !== props.rowClassNameKey) // no mostrar _rowClass como columna
                        .map(([, val]) => val) // quedarnos solo con los valores
                        .filter((_, idx) => !unsetColumns.includes(props.headers[idx]))
                        .map((val, j) => (
                          <td key={j}>{val}</td>
                        ))
                    }
                  </tr>
                );
              })
            )
          }
        </tbody>

        {/* PAGINATION */}
        <tfoot>
          <tr>
            <td colSpan={props.headers.length}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  className='btn default'
                  disabled={props.current_page === 1}
                  onClick={() => props.tablePageChangeFunc(props.current_page - 1)}
                >
                  Anterior
                </button>

                <button
                  className='btn default'
                  disabled={props.current_page * 10 >= props.data_count}
                  onClick={() => props.tablePageChangeFunc(props.current_page + 1)}
                >
                  Siguiente
                </button>
              </div>
            </td>
          </tr>
        </tfoot>

      </table>
    </div>
  )
}

export default Table


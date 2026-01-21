import React, { useState } from "react"
import "./Settings.scss"

function Settings() {
  const [company, setCompany] = useState("")
  const [currency, setCurrency] = useState("Bs")

  return (
    <div className="settings">
      <h2>Configuración del sistema</h2>

      <div className="settings-form">
        <label>Nombre de la empresa</label>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />

        <label>Moneda</label>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="Bs">Bolivianos (Bs)</option>
          <option value="USD">Dólares (USD)</option>
        </select>
      </div>
    </div>
  )
}

export default Settings

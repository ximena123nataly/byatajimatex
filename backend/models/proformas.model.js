const db = require("../db/conn.js");
const jwt = require("jsonwebtoken");
const uniqid = require("uniqid");

class Proforma {
  constructor() {}

  //GET PROFORMAS (tabla)
 
  getProformas = (req, res) => {
    try {
      let d = jwt.decode(req.cookies.accessToken, { complete: true });
      let email = d.payload.email;
      let role = d.payload.role;

      new Promise((resolve, reject) => {
        let tsa = "";
        if (req.body.search_value != "") {
          tsa = `WHERE proforma_ref LIKE "%${req.body.search_value}%" OR cliente LIKE "%${req.body.search_value}%"`;
        }

        let tso = "";
        if (req.body.sort_column != "" && req.body.sort_order != "") {
          tso = `ORDER BY ${req.body.sort_column} ${req.body.sort_order}`;
        } else {
          // orden por defecto (opcional)
          tso = "ORDER BY timeStamp DESC";
        }

        let q = "SELECT * FROM `proformas` " + tsa + " " + tso + " LIMIT ?, 10";
        db.query(q, [req.body.start_value], (err, result) => {
          if (err) return reject(err);

          // si es búsqueda, count = largo del resultado (igual que products)
          if (req.body.search_value != "") {
            return resolve({
              operation: "success",
              message: "search proformas got",
              info: { proformas: result, count: result.length },
            });
          }

          let q2 = "SELECT COUNT(*) AS val FROM `proformas`";
          db.query(q2, (err2, result2) => {
            if (err2) return reject(err2);

            resolve({
              operation: "success",
              message: "10 proformas got",
              info: { proformas: result, count: result2[0].val },
            });
          });
        });
      })
        .then((value) => res.send(value))
        .catch((err) => {
          console.log(err);
          res.send({ operation: "error", message: "Something went wrong" });
        });
    } catch (error) {
      console.log(error);
      res.send({ operation: "error", message: "Something went wrong" });
    }
  };

  // ADD PROFORMA
  addProforma = (req, res) => {
    try {
      let d = jwt.decode(req.cookies.accessToken, { complete: true });
      let email = d.payload.email;
      let role = d.payload.role;

      new Promise((resolve, reject) => {
        // OJO: items puede venir como array (frontend) => lo guardamos como JSON string
        const itemsStr =
          typeof req.body.items === "string" ? req.body.items : JSON.stringify(req.body.items || []);

        let q =
          "INSERT INTO `proformas`(`proforma_id`, `proforma_ref`, `fecha`, `cliente`, `celular`, `items`, `anticipo`, `saldo`, `total_general`, `estado`) VALUES (?,?,?,?,?,?,?,?,?,?)";

        db.query(
          q,
          [
            uniqid(),
            req.body.proforma_ref,
            req.body.fecha,
            req.body.cliente,
            req.body.celular || null,
            itemsStr,
            req.body.anticipo ?? 0,
            req.body.saldo ?? 0,
            req.body.total_general ?? 0,
            req.body.estado || "ACTIVA",
          ],
          (err, result) => {
            if (err) return reject(err);
            resolve({ operation: "success", message: "Proforma added successfully" });
          }
        );
      })
        .then((value) => res.send(value))
        .catch((err) => {
          console.log(err);
          res.send({ operation: "error", message: "Something went wrong" });
        });
    } catch (error) {
      console.log(error);
      res.send({ operation: "error", message: "Something went wrong" });
    }
  };
  // DELETE PROFORMA
  deleteProforma = (req, res) => {
    try {
      let d = jwt.decode(req.cookies.accessToken, { complete: true });
      let email = d.payload.email;
      let role = d.payload.role;

      new Promise((resolve, reject) => {
        let q = "DELETE FROM `proformas` WHERE proforma_id = ?";
        db.query(q, [req.body.proforma_id], (err, result) => {
          if (err) return reject(err);
          resolve({ operation: "success", message: "Proforma deleted successfully" });
        });
      })
        .then((value) => res.send(value))
        .catch((err) => {
          console.log(err);
          res.send({ operation: "error", message: "Something went wrong" });
        });
    } catch (error) {
      console.log(error);
      res.send({ operation: "error", message: "Something went wrong" });
    }
  };
}

module.exports = Proforma;

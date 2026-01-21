require("dotenv").config();
const CryptoJS = require("crypto-js");

function enc(pass) {
  return CryptoJS.AES.encrypt(pass, process.env.CRYPTOJS_SEED).toString();
}

console.log("ADMIN:", enc("testadmin@12345"));
console.log("EMP  :", enc("testemp@12345"));

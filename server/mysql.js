const mysql = require('mysql');

const sqlcon = mysql.createConnection({
  host: "localhost",
  port: "3001",
  user: "root",
  password: "toor",
})

sqlcon.connect((err) => {
  if (err) throw err;
  console.log("Connected to the DB succesfully!");
})

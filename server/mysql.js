const mysql = require('mysql');

const sqlcon = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
})

sqlcon.connect((err) => {
  if (err) throw err;
  console.log("Connected to the DB succesfully!");
})

// sqlcon.query("show databases", (err, result) => {
//   if (err) throw err;
//
//   let dbExist = false;
//   result.forEach(element => {
//     if (element["Database"] == "battery")
//       dbExist = true;
//   });
//
//   if (!dbExist) {
//     console.log("Database \"battery\" doesn't exist!")
//     sqlcon.query('create database battery; use battery;', (err) => {
//       if (err) throw err;
//       console.log("Succesfully created database \"battery\"!");
//     });
//   } else {
//     console.log("OK!");
//   }
//
//   sqlcon.query('')
// })

sqlcon.query('create database if not exists battery', (err, result) => {
  if (err) throw err;

  sqlcon.query('use battery', (err, result) => {
    if (err) throw err;
    console.log(result);

    sqlcon.query('create table if not exists measurements(id int primary key, mdate date, avg_current float, avg_voltage float, avg_temperature float, avg_power float, time_lasted int);', (err, result, fields) => {
      if (err) throw err;
      console.log(result);
    })
  })
});

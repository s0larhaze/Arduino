const http = require('node:http');
const fs = require('node:fs');
const app = require('express')
const HOSTNAME = '127.0.0.1';
const PORT = 3000;

function GETProcess(res) {
  fs.readFile("./index.html", (err, data) => {
    if (err) throw err;
    res.write(data);
    res.end();
  });
}

function POSTProcess(res) {

}

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  console.log(req.method);

  if (req.method === "GET") {
    try {
      GETProcess(res);
    } catch (err) {
      res.end("<h2>Something went wrong</h2>")
      console.log(err);
    }
  } else if (req.method === "POST") {

    req.on('data', (data) => {
      console.log(data);
    });

    res.end("Bruh");

    // try {
    //   POSTProcess(res);
    //   res.end("<h2>HELLO FROM POST</h2>")
    // }
  }
}).listen(PORT, HOSTNAME, () => {
  console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
});

server.on

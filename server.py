from http.server import BaseHTTPRequestHandler, HTTPServer
import json


class RequestHandler(BaseHTTPRequestHandler):

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode())

        received_data = data.get('data')
        print("Received: ", received_data)

        with open('data.txt', 'a') as file:
            file.write(received_data + "\n")

        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write("Got the data".encode())

    def do_GET(self):
        with open('data.txt', 'r') as file:
            data_from_file = file.readlines()

        html_response = "<html><head><title>Arduino Data</title></head><body><h1>Arduino Data</h1>"

        for line in data_from_file:
            html_response += f"<p>{line.strip()}</p>"

        html_response += "</body></html>"

        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(html_response.encode())


class SimpleHTTPServer:

    def __init__(self, host='localhost', port=8000):
        self.host = host
        self.port = port
        self.server = HTTPServer((self.host, self.port), RequestHandler)

    def start(self):
        print(f"Server started on {self.host}:{self.port}")
        self.server.serve_forever()

    def stop(self):
        print("Server stopped")
        self.server.shutdown()


http_server = SimpleHTTPServer()
http_server.start()

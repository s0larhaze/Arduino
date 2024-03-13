import serial
import requests
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

SERIAL_PORT = '/dev/ttyUSB0'
BAUD_RATE = 9600

SERVER_ADDRESS = '127.0.0.1'
SERVER_PORT = 3001

TO_ADDRESS = 'http://127.0.0.1:3000'

# Define the HTTP request handler

ser = 0


class MyHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        payload = json.loads(post_data.decode('utf-8'))
        print("Received from client:", payload)
        if payload['message'] == 'measure':
            send_data_to_address(payload)
        send_data_to_address(payload)
        self.send_response(200)
        self.end_headers()


def handle_serial_data(serial_port):
    while True:
        try:
            data = serial_port.readline().decode().strip()
            if data != "":
                print("Received from Arduino:", data)
                jsondata = json.loads(data)
                send_data_to_address(jsondata)
        except Exception as e:
            print("Error reading serial data:", e)


def send_data_to_serial(payload):
    ser.write(payload['message'].encode())
    print(payload['message'])


def send_data_to_address(payload):
    try:
        response = requests.post(TO_ADDRESS, json=payload)
        print("Data sent to address:", TO_ADDRESS, "Response:", response.text)
    except Exception as e:
        print("Error sending data to address:", e)


def main():
    try:
        global ser
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        print("Serial communication established with Arduino.")

        http_server = HTTPServer(
            (SERVER_ADDRESS, SERVER_PORT), MyHTTPRequestHandler)
        print("Server is running on {0} port {1}".format(
            SERVER_ADDRESS, SERVER_PORT))

        serial_thread = threading.Thread(
            target=handle_serial_data, args=(ser,))
        serial_thread.daemon = True
        serial_thread.start()

        http_server_thread = threading.Thread(target=http_server.serve_forever)
        http_server_thread.daemon = True
        http_server_thread.start()

        while True:
            user_input = input("Enter command for Arduino: ")
            ser.write(user_input.encode())

    except KeyboardInterrupt:
        print("\nExiting")
        ser.close()
        http_server.shutdown()
    except Exception as e:
        print("Error: ", e)


if __name__ == "__main__":
    main()

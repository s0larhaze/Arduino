import serial
import requests
import socket
import json
import threading

SERIAL_PORT = '/dev/ttyUSB0'
BAUD_RATE = 9600

SERVER_ADDRESS = '127.0.0.1'
SERVER_PORT = 3001

TO_ADDRESS = '127.0.0.1'
TO_PORT = 3000


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


def handle_internet_data(sock):
    while True:
        try:
            data, addr = sock.recvfrom(1024)
            print("Received from client:", data.decode())
        except Exception as e:
            print("Error receiving internet data:", e)


def send_data_to_address(payload):
    try:
        url = f"http://{TO_ADDRESS}:{TO_PORT}"
        response = requests.post(url, json=payload)
        print("Data sent to address:", TO_ADDRESS, "Response:", response.text)
    except Exception as e:
        print("Error sending data to address:", e)


def main():
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        print("Serial communication established with Arduino.")

        server_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        server_socket.bind((SERVER_ADDRESS, SERVER_PORT))
        print("Waiting for clients...")

        serial_thread = threading.Thread(
            target=handle_serial_data, args=(ser,))
        serial_thread.daemon = True
        serial_thread.start()

        internet_thread = threading.Thread(
            target=handle_internet_data, args=(server_socket,))
        internet_thread.daemon = True
        internet_thread.start()

        while True:
            user_input = input("Enter command for Arduino: ")
            ser.write(user_input.encode())

    except KeyboardInterrupt:
        print("\nExiting")
        ser.close()
        server_socket.close()
    except Exception as e:
        print("Error: ", e)


if __name__ == "__main__":
    main()

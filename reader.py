import serial
import time
from datetime import datetime
import requests

serial_port = '/dev/ttyUSB0'
baud_rate = 9600

ser = serial.Serial(serial_port, baud_rate)
time.sleep(3)

try:
    while True:
        line = ser.readline().decode().strip()
        timern = datetime.now()

        print(line)
        print(timern)

        payload = {'data': line}
        response = requests.post("http://localhost:8000/", json=payload)
        if response.status_code == 200:
            print("Data sent")
        else:
            print("Fail")
except KeyboardInterrupt:
    ser.close()

import requests
import json
import traceback

def test_start():
    print("Testing /interview/stream (START)")
    try:
        url = "http://localhost:5000/interview/stream"
        payload = {"action": "start", "role": "Software Engineer", "experience_level": "junior", "duration": 5}
        print("Sending request...")
        response = requests.post(url, json=payload, stream=True)
        print("Status code:", response.status_code)
        for line in response.iter_lines():
            if line:
                print(line.decode("utf-8"))
    except Exception as e:
        print("Failed:", e)
        traceback.print_exc()

if __name__ == "__main__":
    test_start()

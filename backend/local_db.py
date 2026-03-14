import json
import os
import uuid

class DummyResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class LocalCollection:
    def __init__(self, file_path):
        self.file_path = file_path
        if not os.path.exists(self.file_path):
            with open(self.file_path, 'w') as f:
                json.dump([], f)
                
    def _read(self):
        with open(self.file_path, 'r') as f:
            return json.load(f)
            
    def _write(self, data):
        with open(self.file_path, 'w') as f:
            json.dump(data, f)

    def find_one(self, query):
        data = self._read()
        for item in data:
            match = True
            for k, v in query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match:
                return item
        return None

    def insert_one(self, doc):
        data = self._read()
        doc['_id'] = str(uuid.uuid4())
        data.append(doc)
        self._write(data)
        return DummyResult(doc['_id'])

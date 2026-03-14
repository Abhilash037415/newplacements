from pymongo import MongoClient
import sys

try:
    print('Testing without tls flags')
    client1 = MongoClient('mongodb+srv://navadeep1817_db_user:43Sy8YZFxF3BIUZ5@cluster1.xn0bwlf.mongodb.net/placement_readiness?retryWrites=true&w=majority', serverSelectionTimeoutMS=2000)
    client1.admin.command('ping')
    print('Success without tls flags')
except Exception as e:
    print('Failed without tls flags:', str(e))

try:
    print('Testing with tlsAllowInvalidCertificates')
    client2 = MongoClient('mongodb+srv://navadeep1817_db_user:43Sy8YZFxF3BIUZ5@cluster1.xn0bwlf.mongodb.net/placement_readiness?retryWrites=true&w=majority', tls=True, tlsAllowInvalidCertificates=True, serverSelectionTimeoutMS=2000)
    client2.admin.command('ping')
    print('Success with tlsAllowInvalidCertificates')
except Exception as e:
    print('Failed with tlsAllowInvalidCertificates:', str(e))

from flask import Flask, jsonify
import pandas as pd
import os

app = Flask(__name__)

# Load the dataset
df = pd.read_csv('train.csv')

@app.route('/api/test', methods=['GET'])
def test():
    """Test endpoint to verify API is working"""
    return jsonify({"message": "Flask API is working!", "data_shape": df.shape})

@app.route('/api/head', methods=['GET'])
def head():
    """Get first 5 rows of data"""
    return jsonify(df.head().to_dict('records'))

@app.route('/api/info', methods=['GET'])
def info():
    """Get basic info about the dataset"""
    info = {
        "columns": list(df.columns),
        "shape": df.shape,
        "missing_values": df.isnull().sum().to_dict(),
        "data_types": df.dtypes.astype(str).to_dict()
    }
    return jsonify(info)
if __name__ == '__main__':
    app.run(debug=True, port=5000)

# http://localhost:5000/api/test - You should see a JSON message confirming it's working
# http://localhost:5000/api/head - You should see the first 5 rows of Titanic data in JSON format
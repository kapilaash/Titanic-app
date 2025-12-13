##  Titanic Dataset
https://www.kaggle.com/code/alexisbcook/titanic-tutorial/input?select=train.csv

## To run backend
Navigate to backend by 'cd backend' in cmd and it will automatically you take you to python terminal

Add virtual environment venv: 
venv\Scripts\activate

Then Run app.py in python terminal

## To run front end
Navigate to frontend in cmd and it will automatically you take you to powershell by 'cd frontend'
npm start

## Notes : 

If you are planning to convert our app to Daisy UI, 
Package json ->

From:
"scripts": {
  "start": "react-scripts start",
  "build": "react-scripts build", 
  "test": "react-scripts test",
  "eject": "react-scripts eject"
}

To:
"scripts": {
  "start": "craco start",
  "build": "craco build",
  "test": "craco test",
  "eject": "react-scripts eject"
}

## Notes: 
http://192.168.2.101:3000 - http:// + ip + local host id
use this and connect with phone : set HOST=0.0.0.0 && npm start
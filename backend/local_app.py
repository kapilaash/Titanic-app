from flask import Flask, jsonify, request
import pandas as pd
import numpy as np
from flask_cors import CORS
from sklearn.ensemble import RandomForestClassifier
from supabase_client import get_supabase
app = Flask(__name__)
CORS(app)

# Load and clean the dataset
df = pd.read_csv('train.csv')

def clean_titanic_data(df):
    """Clean the Titanic dataset with ADVANCED FEATURE ENGINEERING"""
    clean_df = df.copy()
    
    # 1. Handle missing values
    clean_df['Age'].fillna(clean_df['Age'].median(), inplace=True)
    clean_df['Embarked'].fillna(clean_df['Embarked'].mode()[0], inplace=True)
    clean_df['Fare'].fillna(clean_df['Fare'].median(), inplace=True)
    
    # 2. Extract titles from Names (creates new feature)
    clean_df['Title'] = clean_df['Name'].str.extract(' ([A-Za-z]+)\.', expand=False)
    
    # 3. Simplify titles
    title_mapping = {
        'Mr': 'Mr', 'Miss': 'Miss', 'Mrs': 'Mrs', 'Master': 'Master', 
        'Dr': 'Officer', 'Rev': 'Officer', 'Col': 'Officer', 'Major': 'Officer',
        'Mlle': 'Miss', 'Ms': 'Miss', 'Lady': 'Royalty', 'Countess': 'Royalty',
        'Don': 'Royalty', 'Dona': 'Royalty', 'Mme': 'Mrs', 'Sir': 'Royalty', 
        'Jonkheer': 'Royalty', 'Capt': 'Officer'
    }
    clean_df['Title'] = clean_df['Title'].map(title_mapping)
    clean_df['Title'].fillna('Other', inplace=True)
    
    # 4. Family features
    clean_df['FamilySize'] = clean_df['SibSp'] + clean_df['Parch'] + 1
    clean_df['IsAlone'] = (clean_df['FamilySize'] == 1).astype(int)
    
    # 5. Age groups (more meaningful than raw age)
    clean_df['AgeGroup'] = pd.cut(clean_df['Age'], 
                                bins=[0, 12, 18, 35, 60, 100], 
                                labels=['Child', 'Teen', 'YoungAdult', 'Adult', 'Senior'])
    
    # 6. Fare groups (more meaningful than raw fare)
    clean_df['FareGroup'] = pd.cut(clean_df['Fare'],
                                 bins=[0, 10, 30, 100, 600],
                                 labels=['Low', 'Medium', 'High', 'Luxury'])
    
    # 7. ENGINEERED FEATURES (High Impact!)
    
    # 7.1 Demographic combinations
    clean_df['IsChild'] = (clean_df['Age'] < 12).astype(int)
    clean_df['IsFemaleChild'] = ((clean_df['Sex'] == 'female') & (clean_df['Age'] < 18)).astype(int)
    clean_df['IsRichFemale'] = ((clean_df['Sex'] == 'female') & (clean_df['Pclass'] == 1)).astype(int)
    clean_df['IsPoorMale'] = ((clean_df['Sex'] == 'male') & (clean_df['Pclass'] == 3)).astype(int)
    
    # 7.2 Family survival patterns (proxy feature)
    # Group by last name and ticket to find families
    clean_df['LastName'] = clean_df['Name'].str.split(',').str[0]
    clean_df['TicketPrefix'] = clean_df['Ticket'].str.split().str[0]
    
    # 7.3 Socio-economic indicators
    clean_df['FarePerPerson'] = clean_df['Fare'] / clean_df['FamilySize']
    clean_df['IsHighClass'] = (clean_df['Pclass'] == 1).astype(int)
    clean_df['WealthIndicator'] = clean_df['Fare'] * (4 - clean_df['Pclass'])  # Higher for wealthy
    
    # 7.4 Cabin-based features (if available)
    clean_df['Deck'] = clean_df['Cabin'].str[0]  # Extract deck from cabin
    clean_df['HasCabin'] = (~clean_df['Cabin'].isna()).astype(int)
    
    # 7.5 Interaction features
    clean_df['ClassSex'] = clean_df['Pclass'].astype(str) + '_' + clean_df['Sex']
    clean_df['AgeClass'] = clean_df['AgeGroup'].astype(str) + '_' + clean_df['Pclass'].astype(str)
    
    # 8. Drop original columns we won't use
    columns_to_drop = ['Cabin', 'Ticket', 'Name', 'PassengerId', 'LastName', 'TicketPrefix']
    clean_df = clean_df.drop(columns=[col for col in columns_to_drop if col in clean_df.columns])
    
    return clean_df

# Clean the data
cleaned_df = clean_titanic_data(df)

def convert_to_serializable(obj):
    """Convert numpy/pandas types to JSON-serializable types"""
    if pd.isna(obj):
        return None
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, (bool, np.bool_)):
        return bool(obj)
    elif isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    elif isinstance(obj, (list, tuple)):
        return [convert_to_serializable(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj

# Basic endpoints
@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"message": "Flask API is working!", "data_shape": list(cleaned_df.shape)})

@app.route('/api/head', methods=['GET'])
def head():
    """Get first 20 rows of CLEANED data"""
    data = cleaned_df.head(20).to_dict('records')
    serializable_data = [convert_to_serializable(record) for record in data]
    return jsonify(serializable_data)

@app.route('/api/info', methods=['GET'])
def info():
    """Get info about CLEANED dataset"""
    info = {
        "columns": list(cleaned_df.columns),
        "shape": list(cleaned_df.shape),
        "missing_values": convert_to_serializable(cleaned_df.isnull().sum().to_dict()),
        "data_types": cleaned_df.dtypes.astype(str).to_dict()
    }
    return jsonify(info)

# EDA endpoints
@app.route('/api/summary', methods=['GET'])
def summary():
    """Get statistical summary of numerical columns"""
    summary_dict = cleaned_df.describe().to_dict()
    serializable_summary = convert_to_serializable(summary_dict)
    return jsonify(serializable_summary)

@app.route('/api/survival_rates', methods=['GET'])
def survival_rates():
    """Get survival rates by different categories"""
    survival_by_class = cleaned_df.groupby('Pclass')['Survived'].mean().to_dict()
    survival_by_sex = cleaned_df.groupby('Sex')['Survived'].mean().to_dict()
    survival_by_embarked = cleaned_df.groupby('Embarked')['Survived'].mean().to_dict()
    survival_by_title = cleaned_df.groupby('Title')['Survived'].mean().to_dict()
    
    return jsonify({
        'by_class': convert_to_serializable(survival_by_class),
        'by_sex': convert_to_serializable(survival_by_sex),
        'by_embarked': convert_to_serializable(survival_by_embarked),
        'by_title': convert_to_serializable(survival_by_title)
    })

@app.route('/api/correlation', methods=['GET'])
def correlation():
    """Get correlation matrix for numerical features"""
    numerical_df = cleaned_df.select_dtypes(include=[np.number])
    corr_dict = numerical_df.corr().to_dict()
    serializable_corr = convert_to_serializable(corr_dict)
    return jsonify(serializable_corr)

# Data endpoints with pagination
@app.route('/api/data', methods=['GET'])
def get_all_data():
    """Get all cleaned data with optional pagination"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    
    paginated_data = cleaned_df.iloc[start_idx:end_idx]
    
    data_records = []
    for record in paginated_data.to_dict('records'):
        serializable_record = convert_to_serializable(record)
        data_records.append(serializable_record)
    
    return jsonify({
        'data': data_records,
        'total_records': len(cleaned_df),
        'page': page,
        'per_page': per_page,
        'total_pages': (len(cleaned_df) + per_page - 1) // per_page
    })

@app.route('/api/data/count', methods=['GET'])
def data_count():
    """Get total record count"""
    return jsonify({'total_records': len(cleaned_df)})

@app.route('/api/regression/survival', methods=['GET'])
def survival_regression():
    """Perform Logistic Regression with ENGINEERED FEATURES"""
    try:
        from sklearn.linear_model import LogisticRegression
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score
        from sklearn.preprocessing import LabelEncoder
        from sklearn.preprocessing import StandardScaler
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import cross_val_score, StratifiedKFold
        print("🚀 RUNNING REAL MODEL WITH ENGINEERED FEATURES")
        
        # Prepare features and target
        features_df = cleaned_df.copy()
        
        # Encode categorical variables
        le_sex = LabelEncoder()
        le_embarked = LabelEncoder()
        le_title = LabelEncoder()

        features_df['FamilySize'] = features_df['SibSp'] + features_df['Parch'] + 1
        features_df['IsAlone'] = (features_df['FamilySize'] == 1).astype(int)
        features_df['IsChild'] = (features_df['Age'] < 12).astype(int)
        features_df['IsFemale'] = (features_df['Sex'] == 'female').astype(int)
        features_df['IsRich'] = ((features_df['Pclass'] == 1) & (features_df['Fare'] > 50)).astype(int)
        features_df['Sex_encoded'] = le_sex.fit_transform(features_df['Sex'])
        features_df['Embarked_encoded'] = le_embarked.fit_transform(features_df['Embarked'].fillna('S'))
        features_df['Title_encoded'] = le_title.fit_transform(features_df['Title'])

        # Simple but effective feature set
        feature_columns = [
            'Pclass', 'Age', 'SibSp', 'Parch', 'Fare',
            'Sex_encoded', 'Embarked_encoded', 'Title_encoded',
            'FamilySize', 'IsAlone', 'IsChild', 'IsFemale', 'IsRich' # Additional engineered features
        ]
        scaler = StandardScaler()


        X = features_df[feature_columns]
        y = features_df['Survived']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # Train model
        #model = LogisticRegression(random_state=42, max_iter=1000)
        model = RandomForestClassifier(
            n_estimators=200,       # More trees
            max_depth=10,           # Deeper trees
            min_samples_split=3,    # More flexible splitting
            min_samples_leaf=1,     # More flexible leaves
            max_features='sqrt',    # Better feature selection
            random_state=42
        )    
        # # Option B: Balanced approach  
        # model = RandomForestClassifier(
        #     n_estimators=200,
        #     max_depth=8,
        #     min_samples_split=5,
        #     min_samples_leaf=2,
        #     max_features=0.7,
        #     random_state=42
        # )
        # CROSS-VALIDATION
        print("📊 RUNNING 5-FOLD CROSS-VALIDATION...")
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='accuracy')
        
        cv_mean = cv_scores.mean()
        cv_std = cv_scores.std()
        
        print(f"🎯 CROSS-VALIDATION RESULTS:")
        print(f"   Fold Scores: {[f'{score:.3f}' for score in cv_scores]}")
        print(f"   Mean CV Accuracy: {cv_mean:.3f} (+/- {cv_std * 2:.3f})")
        print(f"   Range: {cv_scores.min():.3f} - {cv_scores.max():.3f}")
        model.fit(X_train, y_train)
        def predict_survival_probability(passenger_features):
            scaled_features = scaler.transform([passenger_features])
            return model.predict_proba(scaled_features)[0][1]
        # Make predictions
        # y_pred = model.predict_survival_probability(X_test)
        y_pred = model.predict(X_test)
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        print(f"🎯 REAL MODEL ACCURACY: {accuracy:.3f} ({accuracy*100:.1f}%)")
        
        # Calculate accuracies
        # test_accuracy = accuracy_score(y_test, y_pred)
        train_accuracy = accuracy_score(y_train, model.predict(X_train))
        overfitting_gap = train_accuracy - accuracy
        
        print(f"🎯 FINAL RESULTS:")
        print(f"   Test Accuracy: {accuracy:.3f}")
        print(f"   Train Accuracy: {train_accuracy:.3f}")
        print(f"   Overfitting Gap: {overfitting_gap:.3f} (ideal: < 0.05)")
        # Feature importance - CONVERT TO NATIVE PYTHON TYPES
        feature_importance = {}
        # for col, coef in zip(feature_columns, model.coef_[0]):
        #     feature_importance[col] = float(coef)  # Convert numpy to native float
        for col, importance in zip(feature_columns, model.feature_importances_):
            feature_importance[col] = float(importance)        
        # Sample predictions with PROPER SERIALIZATION
        sample_indices = X_test.index[:6]
        sample_predictions = []
        
        for idx in sample_indices:
            # Convert passenger data to serializable format
            passenger_data = {}
            for col, value in cleaned_df.loc[idx].items():
                passenger_data[col] = convert_to_serializable(value)
            
            # Get prediction
            prediction = int(model.predict([X.loc[idx]])[0])
            probability = float(model.predict_proba([X.loc[idx]])[0][1])  # Convert to native float
            
            sample_predictions.append({
                'passenger_data': passenger_data,
                'predicted_survival': prediction,
                'actual_survival': int(y.loc[idx]),
                'survival_probability': round(probability, 3),
                'correct': bool(prediction == y.loc[idx])  # Convert numpy bool to Python bool
            })
        
        # Prepare final response with ALL NATIVE TYPES
        response_data = {
            'model_performance': {
                'accuracy': float(accuracy),  # Convert to native float
                'training_samples': int(len(X_train)),
                'testing_samples': int(len(X_test)),
                'model_type': 'Random Forest Classifier',
                'feature_count': int(len(feature_columns))
            },
            'feature_importance': feature_importance,
            'sample_predictions': sample_predictions,
            'coefficients': feature_importance,
            'status': 'real_model_success'
        }
        
        print("✅ SUCCESS: Real model completed without errors")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ REAL MODEL FAILED: {e}")
        import traceback
        print(f"🔍 FULL ERROR TRACEBACK: {traceback.format_exc()}")
        
        # Return proper error instead of falling back to mock
        return jsonify({
            'error': f'Model training failed: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/api/regression/feature_analysis', methods=['GET'])
def feature_analysis():
    """Analyze feature relationships with survival - PROPERLY GROUPED"""
    try:
        analysis = {}
        
        # Define how to group each feature meaningfully
        features_to_analyze = {
            'Pclass': 'categorical',      # Already categorical (1, 2, 3)
            'Sex': 'categorical',         # Already categorical (male, female)
            'Age': 'binned',              # Needs binning (0-10, 10-20, etc.)
            'SibSp': 'discrete',          # Limited values (0, 1, 2, 3+)
            'Parch': 'discrete',          # Limited values (0, 1, 2, 3+)
            'Fare': 'binned',             # Needs binning (0-10, 10-50, etc.)
            'Embarked': 'categorical',    # Already categorical (C, Q, S)
            'Title': 'categorical',       # Already categorical
            'FamilySize': 'discrete'      # Limited values (1, 2, 3, 4+)
        }
        
        for feature, feature_type in features_to_analyze.items():
            try:
                if feature_type == 'categorical':
                    # Use actual categories
                    survival_data = cleaned_df.groupby(feature)['Survived'].mean().to_dict()
                    
                    analysis[feature] = {
                        'survival_by_group': convert_to_serializable(survival_data),
                        'correlation_with_survival': 'N/A',
                        'mean_survival': 'N/A',
                        'feature_type': 'categorical'
                    }
                    
                elif feature_type == 'discrete':
                    # Use actual values (these have limited unique values)
                    survival_data = cleaned_df.groupby(feature)['Survived'].mean().to_dict()
                    
                    analysis[feature] = {
                        'survival_by_group': convert_to_serializable(survival_data),
                        'correlation_with_survival': float(cleaned_df[feature].corr(cleaned_df['Survived'])),
                        'mean_survival': {
                            'survived': float(cleaned_df[cleaned_df['Survived'] == 1][feature].mean()),
                            'died': float(cleaned_df[cleaned_df['Survived'] == 0][feature].mean())
                        },
                        'feature_type': 'discrete'
                    }
                    
                elif feature_type == 'binned':
                    # Create meaningful bins for continuous features
                    if feature == 'Age':
                        # Age groups: Children, Young Adults, Adults, Seniors
                        bins = [0, 12, 18, 35, 60, 100]
                        labels = ['Child (0-12)', 'Teen (13-18)', 'Young Adult (19-35)', 'Adult (36-60)', 'Senior (60+)']
                        cleaned_df['Age_group'] = pd.cut(cleaned_df['Age'], bins=bins, labels=labels)
                        survival_data = cleaned_df.groupby('Age_group')['Survived'].mean().to_dict()
                        
                    elif feature == 'Fare':
                        # Fare groups: Low, Medium, High, Luxury
                        bins = [0, 10, 30, 100, 600]
                        labels = ['Low (0-10)', 'Medium (10-30)', 'High (30-100)', 'Luxury (100+)']
                        cleaned_df['Fare_group'] = pd.cut(cleaned_df['Fare'], bins=bins, labels=labels)
                        survival_data = cleaned_df.groupby('Fare_group')['Survived'].mean().to_dict()
                    
                    analysis[feature] = {
                        'survival_by_group': convert_to_serializable(survival_data),
                        'correlation_with_survival': float(cleaned_df[feature].corr(cleaned_df['Survived'])),
                        'mean_survival': {
                            'survived': float(cleaned_df[cleaned_df['Survived'] == 1][feature].mean()),
                            'died': float(cleaned_df[cleaned_df['Survived'] == 0][feature].mean())
                        },
                        'feature_type': 'continuous'
                    }
                    
            except Exception as e:
                print(f"Error with feature {feature}: {e}")
                # Fallback: use simple grouping
                survival_data = cleaned_df.groupby(feature)['Survived'].mean().to_dict()
                analysis[feature] = {
                    'survival_by_group': convert_to_serializable(survival_data),
                    'correlation_with_survival': 'Error',
                    'mean_survival': 'Error',
                    'feature_type': 'error'
                }
        
        return jsonify(analysis)
        
    except Exception as e:
        print(f"Feature analysis error: {e}")
        return jsonify({'error': f'Feature analysis failed: {str(e)}'}), 500

@app.route('/api/regression/predict', methods=['GET', 'POST'])  # Allow both GET and POST
def predict_survival():
    """Predict survival for custom input (mock version)"""
    try:
        if request.method == 'GET':
            # Return instructions for POST request
            return jsonify({
                'message': 'Send a POST request with passenger data',
                'example_post_data': {
                    'Sex': 'female',
                    'Pclass': 1,
                    'Age': 25,
                    'Fare': 100
                }
            })
        
        # Handle POST request
        data = request.json
        
        # Mock prediction based on input rules
        survival_prob = 0.5
        
        if data.get('Sex') == 'female':
            survival_prob += 0.3
        if data.get('Pclass') == 1:
            survival_prob += 0.2
        if data.get('Age', 30) < 16:
            survival_prob += 0.1
        if data.get('Fare', 0) > 50:
            survival_prob += 0.1
            
        survival_prob = max(0.1, min(0.9, survival_prob))
        prediction = 1 if survival_prob > 0.5 else 0
        
        return jsonify({
            'prediction': prediction,
            'survival_probability': round(survival_prob, 3),
            'confidence': 'high' if abs(survival_prob - 0.5) > 0.3 else 'medium',
            'factors_considered': ['Sex', 'Pclass', 'Age', 'Fare'],
            'note': 'This is a rule-based mock prediction'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'dataset_size': list(cleaned_df.shape),
        'columns': list(cleaned_df.columns),
        'missing_values': convert_to_serializable(cleaned_df.isnull().sum().to_dict())
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
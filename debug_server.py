import pickle
import pandas as pd
import numpy as np

print("--- 1. Loading Artifacts ---")
try:
    with open('student_performance_artifacts.pkl', 'rb') as f:
        artifacts = pickle.load(f)
    print("✅ Artifacts loaded.")
except Exception as e:
    print(f"❌ CRITICAL ERROR: Could not load pickle file.\n{e}")
    exit()

# 2. Mock Data (This is what React sends)
data = {
    "math score": 65.0,
    "reading score": 70.0,
    "writing score": 72.0,
    "Daily Study Hours": 2.0,
    "Attendance (%)": 80.0,
    "Internal Test 1 (out of 40)": 25.0,
    "Internal Test 2 (out of 40)": 28.0
}

print("\n--- 2. Processing Data ---")
try:
    # Re-create logic from main.py
    df_full = artifacts['df']
    cat_features = artifacts['categorical_features']
    num_features = artifacts['numeric_features']
    
    # Re-build column structure
    df3_encoded = pd.get_dummies(df_full[cat_features], drop_first=True)
    X_full = pd.concat([
        df_full[num_features].reset_index(drop=True),
        df3_encoded.reset_index(drop=True)
    ], axis=1)
    full_cols = X_full.columns
    print(f"Model expects {len(full_cols)} columns.")

    # Prepare Input
    input_df = pd.DataFrame([data])
    
    # Add missing categorical columns
    for col in cat_features:
        if col not in input_df.columns:
            input_df[col] = "Missing"
            
    # Encode and Align
    df_encoded = pd.get_dummies(input_df[cat_features], drop_first=True)
    X_input = pd.concat([
        input_df[num_features].reset_index(drop=True),
        df_encoded.reindex(columns=full_cols.difference(num_features), fill_value=0)
    ], axis=1)
    
    X_input = X_input[full_cols]
    print("✅ Dataframe prepared successfully.")

    print("\n--- 3. Attempting Prediction ---")
    reg_model = artifacts['regression_model']
    prediction = reg_model.predict(X_input)
    print(f"🎉 SUCCESS! Predicted Marks: {prediction}")

except Exception as e:
    print("\n❌ THE SERVER IS CRASHING HERE:")
    print("------------------------------------------------")
    import traceback
    traceback.print_exc()  # THIS PRINTS THE REAL ERROR
    print("------------------------------------------------")
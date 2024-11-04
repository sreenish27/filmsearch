import os
from bm25config import supabase

# Directory containing the CSV files, located at the same level as this script
csv_directory = os.path.join(os.path.dirname(__file__), "bm25indexdata")

# Iterate through all files in the directory
for filename in os.listdir(csv_directory):
    if filename.endswith(".csv"):
        # Remove the .csv extension to get the table name
        table_name = os.path.splitext(filename)[0]
        
        try:
            # Call the create_table_if_not_exists function using Supabase RPC
            response = supabase.rpc("create_table_if_not_exists", {"table_name": table_name}).execute()
            
            # Check if the response contains data or an error
            if response.data is not None:
                print(f"Table '{table_name}' created successfully.")
            elif response.error:
                print(f"Error creating table '{table_name}': {response.error.message}")
            else:
                print(f"Unexpected response for table '{table_name}': {response}")
        
        except Exception as e:
            print(f"Error creating table '{table_name}': {str(e)}")

print("All tables have been processed.")

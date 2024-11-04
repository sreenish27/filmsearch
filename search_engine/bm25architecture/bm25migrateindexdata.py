import os
import subprocess
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Directory containing the CSV files
csv_directory = "/Users/krithik-qfit/Desktop/filmsearch/search_engine/bm25architecture/bm25indexdata"

# Check if directory exists
if not os.path.exists(csv_directory):
    logging.error(f'Directory "{csv_directory}" does not exist.')
else:
    # Create a list of CSV files to process
    csv_files = [f for f in os.listdir(csv_directory) if f.endswith(".csv")]
    
    # Iterate through the CSV files
    for filename in csv_files:
        file_path = os.path.join(csv_directory, filename)
        table_name = os.path.splitext(filename)[0]
        
        # Execute the \COPY command for each file using subprocess
        command = f"psql postgresql://postgres:WXyIZtznQH6tzboC@db.nwedjelzuclmuxrttbpm.supabase.co:5432/postgres -c \"\\COPY \\\"{table_name}\\\" FROM '{file_path}' WITH (FORMAT csv, QUOTE '\\\"', ESCAPE '\\\"');\""
        logging.info(f'Executing command for table: {table_name}')
        
        # Execute the command and handle errors
        try:
            result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
            logging.info(f'Successfully imported data to table {table_name}.')
        except subprocess.CalledProcessError as e:
            logging.error(f'Failed to import data for table {table_name}: {e.stderr}')
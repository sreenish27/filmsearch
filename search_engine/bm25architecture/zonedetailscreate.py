import os
import csv
import json
from collections import defaultdict
from vectormodel import model

# Path to the JSONL file with all films
allfilms_path = os.path.join(os.path.dirname(__file__), 'allfilms.jsonl')

# Output CSV path
output_csv = os.path.join(os.path.dirname(__file__), 'zone_embeddings_with_avg_doc_length.csv')

# Step 1: Collect all unique fields and calculate avg_doc_length for each field
field_lengths = defaultdict(list)  # Dictionary to store lengths for each field

# Read through all films and aggregate lengths for each field
with open(allfilms_path, 'r') as f:
    for line in f:
        film = json.loads(line)
        
        # Iterate over each field and calculate its length in words
        for field, content in film.items():
            if content:  # Ensure the field has content
                word_count = len(content.split())  # Word count for the field
                field_lengths[field].append(word_count)  # Append length to the field list

# Calculate avg_doc_length for each field
avg_doc_lengths = {field: sum(lengths) / len(lengths) for field, lengths in field_lengths.items()}

# Step 2: Generate vector embeddings and write results to CSV
with open(output_csv, mode='w', newline='') as file:
    writer = csv.writer(file)
    # Write the header
    writer.writerow(['id', 'zone_name', 'zone_vector', 'avg_doc_length'])

    # Iterate through each unique field, calculate its embedding, and retrieve avg_doc_length
    for idx, (field, avg_length) in enumerate(avg_doc_lengths.items(), start=1):
        print(f"Processing field: {field}")  # Logging the field being processed

        # Replace slashes in field name with underscores
        zone_name_cleaned = field.replace("/", "_")

        # Generate the vector embedding for the field name
        embedding = model.encode(zone_name_cleaned).tolist()  # Convert to list for CSV storage

        # Write the ID, cleaned field name, its embedding, and avg_doc_length to the CSV
        writer.writerow([idx, zone_name_cleaned, embedding, avg_length])

print(f'CSV file with embeddings and avg_doc_length created at {output_csv}')

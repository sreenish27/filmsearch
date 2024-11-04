import json
from collections import defaultdict, Counter
import math
import re
import os
import csv
import logging

# Configure logging
logging.basicConfig(
    filename='jsonl_errors.log',
    level=logging.ERROR,
    format='%(asctime)s - %(message)s'
)

# BM25 Hyperparameters
k1 = 1.5  # Term frequency saturation
b = 0.75  # Length normalization factor

def get_unique_fields(file_path):
    """Extract all unique field names from the JSONL input."""
    fields_set = set()
    with open(file_path, 'r') as f_r:
        for line_num, line in enumerate(f_r, 1):
            try:
                item = json.loads(line)
                fields_set.update(item.keys())
            except json.JSONDecodeError as e:
                logging.error(f"JSON Decode Error on line {line_num}: {str(e)}")
                print(f"Error on line {line_num}. Check jsonl_errors.log for details.")
                continue
    return list(fields_set)

def process_field(zone, input_file, output_file):
    """
    Process each field (zone) to create a BM25-based index stored as CSV.
    Format: term, {filmid: tf, ...}, idf
    """
    field_dict_list = []  # Store documents containing the zone
    total_zone_length = 0  # Track total length for avg_doc_length

    # Step 1: Collect all relevant documents and their zone content
    with open(input_file, 'r') as f:
        docID = 0
        for line_num, line in enumerate(f, 1):
            try:
                docID += 1
                document = json.loads(line)
                if zone in document and document[zone] is not None:
                    zone_content = document[zone].lower().split()
                    field_dict_list.append({
                        "docID": docID,
                        "zone_content": zone_content
                    })
                    total_zone_length += len(zone_content)  # Accumulate zone length
            except json.JSONDecodeError as e:
                logging.error(f"JSON Decode Error on line {line_num}: {str(e)}")
                print(f"Error on line {line_num}. Check jsonl_errors.log for details.")
                continue

    # Step 2: Calculate the average document length for the zone
    avg_doc_length = total_zone_length / len(field_dict_list)

    # Step 3: Create a term dictionary to store TF and IDF values
    term_dict = defaultdict(lambda: defaultdict(float))
    N = len(field_dict_list)  # Total number of documents in this zone

    # Step 4: Calculate BM25-based TF values for each term in each document
    for field_dict in field_dict_list:
        docID = field_dict["docID"]
        zone_content = field_dict["zone_content"]
        L_d = len(zone_content)  # Length of the current zone's content

        tf_counter = Counter(zone_content)  # Term frequencies for the current zone

        for term, freq in tf_counter.items():
            # Calculate BM25-based TF
            tf = round((freq * (k1 + 1)) / (freq + k1 * (1 - b + b * (L_d / avg_doc_length))),6)
            term_dict[term][docID] = tf  # Store TF for this docID

    # Step 5: Calculate IDF for each term and store the final results in CSV
    with open(output_file, 'w', newline='') as f_w:
        writer = csv.writer(f_w)
        for term, doc_dict in term_dict.items():
            n_t = len(doc_dict)  # Number of documents containing the term
            idf = round(math.log2((N - n_t + 0.5) / (n_t + 0.5) + 1),6)  # BM25 IDF formula

            # Convert the doc_dict to a JSON string for storage
            tf_dict_str = json.dumps(doc_dict)  # Store {filmid: tf, ...} as JSON string

            # Write the term, its TF dictionary, and the IDF value to the CSV
            writer.writerow([term, tf_dict_str, round(idf, 3)])

    print(f'Created BM25 index for {zone}.')

# Main execution
input_file = './filmdata/allfilms.jsonl'

# Step 6: Get unique fields from the input file
fields_list = get_unique_fields(input_file)

# Step 7: Create the directory for storing indexes
directory = os.path.join(os.path.dirname(__file__), 'bm25indexdata')

# Create the directory if it doesn't exist
if not os.path.exists(directory):
    os.makedirs(directory)

# Step 8: List all existing files in the directory to avoid reprocessing
file_names = [file.replace('.csv', '') for file in os.listdir(directory) if file.endswith('.csv')]

# Step 9: Find zones that haven't been processed yet
missing_items = [item for item in fields_list if item not in file_names]
missing_items.sort()

# Step 10: Process each missing zone and generate its BM25 index
for zone in missing_items:
    zone_cleaned = "_".join(re.split('[ /]', zone.lower()))  # Clean zone name for filename
    output_file = os.path.join(directory, f'{zone_cleaned}.csv')
    process_field(zone, input_file, output_file)

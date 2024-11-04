import json
import os
import csv
import sys
from collections import defaultdict, Counter
import math

# Increase the CSV field size limit
csv.field_size_limit(sys.maxsize)

# Count total occurrences of each term across all zones
def allwords_count(filepath):
    all_words_dict = {}
    with open(filepath, 'r') as f:
        for line in f:
            item = json.loads(line)
            values_list = list(item.values())
            for value in values_list:
                if value is not None:
                    word_list = value.lower().split()
                    tf_count = Counter(word_list)
                    for term in tf_count:
                        all_words_dict[term] = all_words_dict.get(term, 0) + tf_count[term]
    return all_words_dict

# Count the number of terms (lines) in a file
def count_terms(filepath):
    count = 0
    with open(filepath, 'r') as f:
        count = sum(1 for line in f)
    return count

# Create the zone importance scores and write them to CSV
def zone_importance_score(directorypath, outputfile, word_dict, epsilon=1.0, max_score=10.0):
    zone_importance_dict = defaultdict(lambda: defaultdict(float))
    
    for file in os.listdir(directorypath):
        if file.startswith('.'):  # Skip hidden files
            continue
        file_path = os.path.join(directorypath, file)
        
        # Process each zone CSV
        with open(file_path, 'r') as f:
            zone = os.path.basename(file_path)
            zone_name = zone.replace(".csv", "")
            zone_count = count_terms(file_path)
            print(f"Starting for all words in {zone_name}")

            csv_reader = csv.reader(f)
            for row in csv_reader:
                term = row[0]
                tf_dict = json.loads(row[1])  # Convert the TF JSON string back to a dictionary
                zone_term_count = len(tf_dict)  # Number of films where term appears in this zone
                term_count = word_dict.get(term, 0)

                # Zone importance formula with smoothing and cap
                score = (zone_term_count / (term_count + epsilon)) / math.log2(1 + zone_count)
                zone_importance_dict[term][zone_name] = round(min(score, max_score), 3)

            print(f"Finished processing {zone_name}")
    
    # Sort the dictionary by importance scores for each term
    for term in zone_importance_dict:
        zone_importance_dict[term] = dict(sorted(zone_importance_dict[term].items(), key=lambda x: x[1], reverse=True))
    
    # Write the output to a CSV file with id, term, and zone importance scores
    with open(outputfile, 'w', newline='') as f_w:
        writer = csv.writer(f_w)
        writer.writerow(["id", "term", "zone_importance_scores"])
        
        term_id = 1
        for term, zones in zone_importance_dict.items():
            writer.writerow([term_id, term, json.dumps(zones)])  # Store zone scores as JSON string in CSV
            term_id += 1  # Increment ID for each term

# Execution
filepath = './filmdata/allfilms.jsonl'
outputfile = 'zoneimportance.csv'

# Set directory path to bm25indexdata, located at the same level as this script
directorypath = os.path.join(os.path.dirname(__file__), 'bm25indexdata')

word_count_dict = allwords_count(filepath)
zone_importance_score(directorypath, outputfile, word_count_dict)

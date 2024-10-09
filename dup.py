import json

# Path to your americanfilms.jsonl file
input_file = 'americanfilms.jsonl'
output_file = 'americanfilms_cleaned.jsonl'

# The unwanted text to be removed
unwanted_text = ".mw-parser-output .plainlist ol,.mw-parser-output .plainlist ul{line-height:inherit;list-style:none;margin:0;padding:0}.mw-parser-output .plainlist ol li,.mw-parser-output .plainlist ul li{margin-bottom:0}"

# Function to remove the unwanted text from a JSON object
def clean_json_object(json_obj):
    for key, value in json_obj.items():
        if isinstance(value, str) and unwanted_text in value:
            json_obj[key] = value.replace(unwanted_text, "")
    return json_obj

# Read the input .jsonl file, clean each object, and write to the output file
with open(input_file, 'r', encoding='utf-8') as infile, open(output_file, 'w', encoding='utf-8') as outfile:
    for line in infile:
        json_obj = json.loads(line.strip())  # Parse each line as a JSON object
        cleaned_json_obj = clean_json_object(json_obj)  # Clean the object
        outfile.write(json.dumps(cleaned_json_obj) + '\n')  # Write the cleaned object back to the output file

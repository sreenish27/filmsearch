import json

# Input JSONL file path
input_file = './filmdata/allfilms.jsonl'
# Output text file path
output_file = './filmdata/allfilmsspelldata.txt'

def split_into_sentences(text):
    """
    Split the text into sentences using basic punctuation marks.
    Handles '.', '!', and '?' as sentence boundaries.
    """
    sentences = []
    for sentence in text.replace('?', '.').replace('!', '.').split('.'):
        cleaned = sentence.strip()  # Remove extra spaces
        if cleaned:  # Avoid empty sentences
            sentences.append(cleaned)
    return sentences

def process_jsonl_file(input_file, output_file):
    """
    Process the JSONL file to extract sentences from all fields 
    and save them to a .txt file with one sentence per line.
    """
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'w', encoding='utf-8') as outfile:

        for line_number, line in enumerate(infile):
            try:
                # Load each line as a JSON object
                film = json.loads(line)

                # Extract content from each field and split into sentences
                for field, content in film.items():
                    if isinstance(content, str):  # Only process string fields
                        sentences = split_into_sentences(content)
                        for sentence in sentences:
                            outfile.write(sentence + '\n')

            except json.JSONDecodeError as e:
                print(f"Skipping line {line_number} due to JSON decode error: {e}")
                continue  # Move to the next line if there's an error

    print(f"Processing complete! Sentences saved to {output_file}")

# Run the function to process the JSONL file
process_jsonl_file(input_file, output_file)

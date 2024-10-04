import json

def remove_duplicates(input_file, output_file):
    seen = set()
    with open(input_file, 'r') as f_in, open(output_file, 'w') as f_out:
        for line in f_in:
            entry = json.loads(line)
            entry_str = json.dumps(entry, sort_keys=True)
            if entry_str not in seen:
                seen.add(entry_str)
                f_out.write(entry_str + '\n')

remove_duplicates('film_images.jsonl', 'f_images.jsonl')
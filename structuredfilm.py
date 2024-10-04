import json
import glob
import requests
import re
import ast

#a package to fix my json woes
from json_repair import repair_json

#a field to framework mapping so that I can just change this if a new field comes up
field_to_framework_mapping = {
    "Plot": "Plot.json",
    "Cast": "Cast.json",
    "Production": "Production.json",
    "Soundtrack": "Soundtrack.json",
    "Music": "Soundtrack.json",
    "Themes": "Themes.json",
    "Trivia": "Trivia.json",
    "Reception": "Reception.json",
    "Release": "Release.json",
    "Marketing": "Marketing.json",
    "Sequel": "Sequel.json",
    "Crew": "General.json",
    "Controversies": "Controversies.json",
    "Legacy": "Legacy.json",
    "Accolades": "Awards.json",
    "Remake": "Remake.json",
    "Controversy": "Controversies.json",
    "Synopsis": "General.json",
    "Premise": "General.json",
    "Remakes": "Remake.json",
    "Summary": "General.json",
    "Sources": "General.json",
    "Receptions": "Reception.json",
    "Future": "General.json",
    "Awards": "Awards.json",
    "Songs": "Songs.json",
    "Impact": "General.json",
    "Background": "General.json",
    "Adaptation": "General.json",
    "Storyline": "General.json",
    "Adaptations": "General.json",
    "Availability": "General.json",
    "Prequel": "General.json",
    "Re-release": "General.json",
    "Inspiration": "General.json",
    "Re-releases": "General.json",
    "Sequels": "General.json",
    "Nominations": "General.json",
    "Title": "General.json",
    "Promotion": "General.json",
    "Filming": "General.json",
    "Soundtracks": "General.json",
    "Spin-off": "General.json",
    "Lawsuit": "General.json",
    "Festivals": "General.json",
    "Reviews": "General.json",
    "Development": "General.json",
    "Casting": "General.json",
    "Tracklist": "General.json",
    "Goofs": "General.json",
    "Litigation": "General.json",
    "Publicity": "General.json",
    "Installments": "General.json",
    "Screenplay": "General.json",
    "Box-office": "General.json",
    "Review": "General.json",
    "Delays": "General.json",
    "Reappraisal": "General.json",
    "Certification": "General.json",
    "Trailer": "General.json",
    "Anthologies": "General.json",
    "Related": "General.json",
    "Premiere": "General.json",
    "Audience": "General.json",
    "Censorship": "General.json",
    "Distribution": "General.json",
    "Installment": "General.json",
    "Economics": "General.json",
    "Post-release": "General.json",
    "Miniseries": "General.json",
    "Footnotes": "General.json",
    "Film": "General.json",
    "Allegations": "General.json",
    "Theme": "General.json",
    "Legend": "General.json",
    "Colourisation": "General.json",
    "Other": "General.json",
    "Influences": "General.json",
    "generalinfo": "General.json"
}

url = "http://127.0.0.1:8000/extract"

headers = {
    "Content-Type": "application/json"
}


# Path to the folder containing JSON files
folder_path = 'frameworks/*.json'

# Dictionary to store the contents of each JSON file
frameworks = {}

# #function to clean my json input
def convert_dict_to_json_string(data):
    try:
        # Convert the dictionary to a formatted JSON string
        formatted_json = json.dumps(data, indent=4)
        return formatted_json
    except (json.JSONDecodeError, TypeError) as e:
        # Log the error or handle it appropriately
        print(f"Error converting dictionary to JSON string: {e}")
        return None
    

# Load all JSON files into the frameworks dictionary
for file_path in glob.glob(folder_path):
    with open(file_path, 'r') as file:
        # Use the filename without the path as the key
        filename = file_path.split('/')[-1]  # Adjust for Windows with '\\' if needed
        frameworks[filename] = json.load(file)

# Function to write each updated film to a new file
def update_films(film_dict, output_file_path):
    with open(output_file_path, 'a', encoding='utf-8') as output_file:
        json.dump(film_dict, output_file, ensure_ascii=False)
        output_file.write('\n')

# Load existing processed movies from 'tamilfilms_structured.jsonl'
processed_movies = set()

try:
    with open('tamilfilms_structured.jsonl', 'r', encoding='utf-8') as processed_file:
        for line in processed_file:
            # Skip empty lines
            if not line.strip():
                continue

            try:
                movie_data = json.loads(line.strip())
                movie_title = list(movie_data.keys())[0]
                processed_movies.add(movie_title)
            except json.JSONDecodeError:
                print(f"Skipping invalid JSON line: {line.strip()}")
                continue
except FileNotFoundError:
    # If the file doesn't exist yet, no movies have been processed
    processed_movies = set()

print(processed_movies)

# Open the jsonl file and read it line by line
with open('tamilfilms.jsonl', 'r', encoding='utf-8') as file:

    for line in file:

        movie_data = json.loads(line.strip())
        movie = list(movie_data.keys())[0]

        movie_info = movie_data[movie]
        movie_fields = list(movie_info.keys()) 

        if movie not in processed_movies:

            print(f"Processing: {movie}")

            film = {movie: {}}
            film_info = film[movie]

            process_fields = False

            for movie_field in movie_fields:
                if movie_field == "generalinfo":
                    process_fields = True

                if not process_fields:
                    # Record fields as they are until 'generalinfo'
                    film_info[movie_field] = movie_info[movie_field]
                    continue

                # Process all fields from 'generalinfo' onward
                content = movie_info[movie_field]
                framework = field_to_framework_mapping.get(movie_field, "General.json")
                framework_dict = frameworks.get(framework, {})

                film_data = {
                    "content": content,
                    "framework": framework_dict
                }

                data = convert_dict_to_json_string(film_data)

                try:
                    response = requests.post(url, headers=headers, json=film_data)
                    response.raise_for_status()
                    data_to_add = response.json()[0]
                    #clearing some characters to make it compatible to run and format with literal_eval
                    data_to_add = data_to_add.replace("```json", "")
                    data_to_add = data_to_add.replace("```", "")
                    # film_info[movie_field] = data_to_add
                    #repair my json string to be able to pass to ast.literal_eval
                    data_to_add = repair_json(data_to_add)
                    film_info[movie_field] = ast.literal_eval(data_to_add)
                except requests.RequestException as e:
                    print(f"Error processing {movie_field} for {movie}: {str(e)}")
                    film_info[movie_field] = {"error": str(e)}
                    print(response.json())
            
            # Append the processed film data to the output file
            update_films(film, 'tamilfilms_structured.jsonl')

print("Processing complete. Check 'tamilfilms_structured.jsonl' for results.")
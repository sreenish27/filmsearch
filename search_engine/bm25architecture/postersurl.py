import jsonlines
from bm25config import supabase
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Function to update poster URLs in the allfilms table
def update_poster_in_db(film_name, poster_url):
    try:
        # Call the stored procedure to update the poster column
        response = supabase.rpc("update_poster_url", {
            "film_name": film_name,
            "poster_url": poster_url
        }).execute()

        print(response)
        if response.error:
            print(f"Failed to update '{film_name}' with error: {response.error}")
        else:
            print(f"Updated '{film_name}' successfully.")
    except Exception as e:
        print(f"Error updating '{film_name}': {str(e)}")


# Read and process each record from the JSONL file
def process_posters(file_name):
    file_path = os.path.join(os.path.dirname(__file__), file_name)  # Get path in same directory
    with jsonlines.open(file_path) as reader:
        for obj in reader:
            film_name = obj["filmname"]
            poster_url = obj["poster_url"]

            # Skip if the poster_url contains 'noposter' and continue
            if "noposter" in poster_url:
                print(f"Skipping '{film_name}' - No poster available.")
                continue

            # Call the update function for each entry
            update_poster_in_db(film_name, poster_url)

# Path to the JSONL file
file_name = "poster_urls.jsonl"  # File should be in the same directory as the script
process_posters(file_name)

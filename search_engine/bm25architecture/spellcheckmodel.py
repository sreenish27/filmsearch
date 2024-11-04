from spello.model import SpellCorrectionModel

# Use absolute path to avoid path issues
model_path = '/Users/krithik-qfit/Desktop/filmsearch/search_engine/spell_correction_model/model.pkl'

# Initialize the Spello model
spello = SpellCorrectionModel(language="en")

# Load the trained model
spello.load(model_path)

# Function to correct queries
def correct_query(query):
    """Corrects spelling in the given query using the trained Spello model."""
    correction = spello.spell_correct(query)
    corrected_text = correction.get('spell_corrected_text', '')
    return corrected_text

# Test the model with some example queries
queries = [
    "S.J Suryah director"
]

print("Corrected Queries:")
for query in queries:
    corrected = correct_query(query)
    print(f"Original: '{query}' -> Corrected: '{corrected}'")
    print(corrected)

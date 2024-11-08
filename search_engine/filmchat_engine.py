from bm25config import supabase
import numpy as np
import json
from sklearn.metrics.pairwise import cosine_similarity

# Function to compare 2 vectors and return similarity score
def similarity_score(vector1, vector2):
    # Convert stringified vectors to lists if necessary
    if isinstance(vector1, str):
        vector1 = json.loads(vector1)
    if isinstance(vector2, str):
        vector2 = json.loads(vector2)

    # Convert lists to numpy arrays
    vector1 = np.array(vector1, dtype=np.float64)
    vector2 = np.array(vector2, dtype=np.float64)

    # Check for NaN values and handle them
    if np.isnan(vector1).any() or np.isnan(vector2).any():
        raise ValueError("One or both input vectors contain NaN values.")

    # Ensure vectors are reshaped to 2D for cosine similarity
    vector1 = vector1.reshape(1, -1)
    vector2 = vector2.reshape(1, -1)

    # Calculate cosine similarity
    return round(float(cosine_similarity(vector1, vector2)[0][0]), 4)


def filmchatengine(answer_vector, filmobject):
    field_similarityscore_dict = {}
    field_list = list(filmobject.keys())
    
    print("\nCalculating similarity scores for each field:")
    
    for field in field_list: 
        # Retrieve the vector for the field
        zone_vector_response = supabase.rpc('get_zone_vector', params={'zone_name': field}).execute()
        field_vector = zone_vector_response.data
        
        # Check if the field vector is None or empty
        if field_vector is None:
            print(f"No vector retrieved for field: {field}")
            continue  # Skip to the next field if no vector is found

        # Calculate similarity score and store it
        similarity_score_value = similarity_score(field_vector, answer_vector)
        field_similarityscore_dict[field] = similarity_score_value

        # Print each field with its similarity score
        print(f"Field: {field}, Similarity Score: {similarity_score_value}")

    # Sort fields by similarity score in descending order
    similarity_dict_sorted = dict(sorted(field_similarityscore_dict.items(), key=lambda item: item[1], reverse=True))

    # Take the top 3 fields
    top_3_matching_fields = list(similarity_dict_sorted.keys())[0:3]

    # Print the top 3 matching fields with their scores
    print("\nTop 3 Matching Fields:")
    for field in top_3_matching_fields:
        print(f"Field: {field}, Similarity Score: {similarity_dict_sorted[field]}")

    # Prepare the dictionary to be returned
    filmchat_dict = {k: filmobject[k] for k in top_3_matching_fields if k in filmobject}

    # Print the selected top 3 fields and their content
    print("\nSelected Top 3 Fields and Their Content:")
    for field in top_3_matching_fields:
        if field in filmobject:
            print(f"Field: {field}, Content: {filmobject[field]}")

    return filmchat_dict

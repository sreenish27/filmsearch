import json
from bm25config import supabase
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from vectormodel import model
import ast
from collections import defaultdict
import re

# BM25 Hyperparameters
k1 = 1.5
b = 0.75
initial_ratio_threshold = 0.5
film_limit = 20
long_query_threshold = 7  # Threshold for very long queries

# Query processing function
def queryprocessor(query):
    q_list = re.split(r'\W+', query.lower())
    tokenized_words = [word for word in q_list if word]
    print("Tokenized Words:", tokenized_words)
    return tokenized_words

# Function to compare 2 vectors and return similarity score
def similarity_score(raw_vector1, raw_vector2):
    vector1 = np.array(raw_vector1)
    vector2 = np.array(raw_vector2)
    return round(float(cosine_similarity([vector1], [vector2])[0][0]), 4)

# Function to get avg_doc_length for a specific zone
def get_avg_doc_length(zone_name):
    response = supabase.rpc('get_zone_avglength', {'zone_name': zone_name}).execute()
    return float(response.data) if response.data else 1.0

# Determine all unique relevant zones based on words in the query
def get_unique_zones(word_list):
    unique_zones = set()
    for word in word_list:
        zone_importance_response = supabase.rpc('get_zonei_score', params={'search_term': word}).execute()
        zone_importance_dict = zone_importance_response.data
        if not zone_importance_dict:
            print(f"No zone importance data for '{word}'")
            continue
        word_zones = {zone for zone, score in zone_importance_dict.items() if score > 0}
        unique_zones.update(word_zones)  # Union of zones
        print(f"Zones for '{word}': {word_zones}")
    print("\nAll Unique Zones across words:", unique_zones)
    return unique_zones

# Determine the most relevant zones based on query vector alignment for a given word
def get_top_zones_for_word(query_vector, zones):
    zone_similarity_scores = {}
    for zone_name in zones:
        zone_vector_response = supabase.rpc('get_zone_vector', params={'zone_name': zone_name}).execute()
        if zone_vector_response.data:
            try:
                zone_vector = ast.literal_eval(zone_vector_response.data)
                similarity = similarity_score(query_vector, zone_vector)
                zone_similarity_scores[zone_name] = similarity
                print(f"Zone '{zone_name}' cosine similarity with query: {similarity}")
            except (ValueError, SyntaxError):
                print(f"Error decoding vector data for zone '{zone_name}'")
        else:
            print(f"No vector data for zone '{zone_name}'")
    # Return the top 3 zones for the word
    sorted_zones = sorted(zone_similarity_scores.items(), key=lambda item: item[1], reverse=True)
    top_zones_for_word = [zone for zone, _ in sorted_zones[:3]]
    print(f"Top 3 Zones for word: {top_zones_for_word}")
    return top_zones_for_word

# Main search function to retrieve relevant film IDs based on selected words and zones
def get_search_results(word_list, query_vector):
    overall_zone_score_dict = {}
    print("\n--- Starting Search ---")
    print(f"Tokenized Query Terms: {word_list}\n")

    # Step 1: Dynamically determine all unique relevant zones
    unique_zones = get_unique_zones(word_list)

    # Step 2: Get zone importance scores for each word, calculate composite alignment, and retrieve top 3 zones per word
    word_top_zones_dict = {}  # Store each word's top zones based on query vector alignment
    for word in word_list:
        zone_importance_response = supabase.rpc('get_zonei_score', params={'search_term': word}).execute()
        zone_importance_dict = zone_importance_response.data
        if not zone_importance_dict:
            print(f"No zone importance data for '{word}'")
            continue
        # Retrieve the unique zones relevant to this word
        word_zones = {zone for zone, score in zone_importance_dict.items() if score > 0}
        
        # Get the top 3 relevant zones for this word based on query alignment
        top_zones_for_word = get_top_zones_for_word(query_vector, word_zones)
        word_top_zones_dict[word] = top_zones_for_word

    # **Final Retrieval: Gather Film IDs using each word's top 3 zones**
    attempt = 1
    filtered_words = list(word_top_zones_dict.keys())
    while len(filtered_words) > 1:
        print(f"\nAttempt #{attempt} with words: {filtered_words}")
        attempt += 1

        # Use all top zones of each selected word to find the film IDs directly
        film_sets = []
        for word in filtered_words:
            word_film_ids = set()
            for zone in word_top_zones_dict[word]:  # Each word's individual top zones
                tfidf_response = supabase.rpc('get_tf_idf', params={'t_name': zone, 'search_term': word}).execute()
                tfidf_data = tfidf_response.data
                if tfidf_data and 'tf' in tfidf_data:
                    word_film_ids.update(tfidf_data['tf'].keys())
            film_sets.append(word_film_ids)
            print(f"Film IDs for word '{word}' in its top zones: {word_film_ids}")

        # Find common film IDs and rank by frequency of occurrence across zones
        common_film_ids = set.intersection(*film_sets) if film_sets else set()
        if common_film_ids:
            ranked_films = sorted(common_film_ids, key=lambda x: sum(x in film_set for film_set in film_sets), reverse=True)
            print("\nSearch successful, results found.")
            return ranked_films

        # If no results, remove two lowest-scoring words and try again
        filtered_words = filtered_words[:-1]
        print("Dropping two lowest-scoring words, remaining words:", filtered_words)

    print("No results found after all attempts.")
    return []

# Final search function
def search(user_query, user_query_vector):
    query_terms = queryprocessor(user_query)
    return get_search_results(query_terms, user_query_vector)

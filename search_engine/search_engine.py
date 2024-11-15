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
long_query_threshold = 7
DEFAULT_DOC_LENGTH = 1000

def queryprocessor(query):
    q_list = re.split(r'\W+', query.lower())
    tokenized_words = [word for word in q_list if word]
    print("Tokenized Words:", tokenized_words)
    return tokenized_words

def similarity_score(raw_vector1, raw_vector2):
    vector1 = np.array(raw_vector1)
    vector2 = np.array(raw_vector2)
    return round(float(cosine_similarity([vector1], [vector2])[0][0]), 4)

def get_avg_doc_length(zone_name):
    response = supabase.rpc('get_zone_avglength', {'zone_name': zone_name}).execute()
    return float(response.data) if response.data else 1.0

def get_unique_zones(word_list):
    unique_zones = set()
    for word in word_list:
        zone_importance_response = supabase.rpc('get_zonei_score', params={'search_term': word}).execute()
        zone_importance_dict = zone_importance_response.data
        if not zone_importance_dict:
            print(f"No zone importance data for '{word}'")
            continue
        word_zones = {zone for zone, score in zone_importance_dict.items() if score > 0}
        unique_zones.update(word_zones)
    print("\nAll Unique Zones across words:", unique_zones)
    return unique_zones

def calculate_bm25_score(tf, idf, doc_length, avg_doc_length, k1=1.5, b=0.75):
    numerator = tf * (k1 + 1)
    denominator = tf + k1 * (1 - b + b * (doc_length / avg_doc_length))
    return idf * (numerator / denominator)

def calculate_words_per_drop(query_length):
    if query_length >= 20:
        return 3
    elif query_length >= 10:
        return 2
    else:
        return 1

def get_search_results(word_list, query_vector):
    print("\n--- Starting Enhanced BM25 Search ---")
    print(f"Tokenized Query Terms: {word_list}\n")

    # Step 1: Get all unique zones
    unique_zones = get_unique_zones(word_list)
    avg_zone_lengths = {zone: get_avg_doc_length(zone) for zone in unique_zones}

    # Step 2: Calculate composite scores for each word using ALL zones
    word_composite_scores = {}
    word_zones_dict = {}  # Store ALL relevant zones for each word
    for word in word_list:
        zone_importance_response = supabase.rpc('get_zonei_score', params={'search_term': word}).execute()
        zone_importance_dict = zone_importance_response.data
        if not zone_importance_dict:
            print(f"No zone importance data for '{word}'")
            continue

        # Calculate full composite score from all zones
        full_composite_score = sum(score for zone, score in zone_importance_dict.items() if score > 0)
        word_composite_scores[word] = full_composite_score
        print(f"Full composite score for word '{word}': {full_composite_score}")

        if full_composite_score > 0:
            # Store ALL zones where word appears with importance > 0
            word_zones = {zone for zone, score in zone_importance_dict.items() if score > 0}
            word_zones_dict[word] = word_zones
            print(f"All zones for word '{word}': {word_zones}")

    # Step 3: Filter out words with zero composite scores
    filtered_words = [word for word in word_composite_scores if word_composite_scores[word] > 0]
    print(f"Filtered words with non-zero composite scores: {filtered_words}")

    # Calculate words to drop per iteration
    words_per_drop = calculate_words_per_drop(len(filtered_words))
    words_dropped = 0
    min_words_required = 2

    while len(filtered_words) >= min_words_required:
        # Step 4: Calculate BM25 scores
        film_scores = defaultdict(float)
        films_with_all_words = defaultdict(set)

        for word in filtered_words:
            for zone in word_zones_dict[word]:  # Using ALL zones where word appears
                tfidf_response = supabase.rpc('get_tf_idf', params={'t_name': zone, 'search_term': word}).execute()
                tfidf_data = tfidf_response.data

                if not tfidf_data or 'tf' not in tfidf_data:
                    continue

                idf = tfidf_data.get('idf', 0)
                for film_id, tf in tfidf_data['tf'].items():
                    doc_length = DEFAULT_DOC_LENGTH
                    avg_doc_length = avg_zone_lengths.get(zone, 1.0)
                    bm25_score = calculate_bm25_score(tf, idf, doc_length, avg_doc_length, k1, b)
                    film_scores[film_id] += bm25_score
                    films_with_all_words[film_id].add(word)

        # Step 5: Filter and rank by BM25 scores
        final_film_scores = {
            film_id: score 
            for film_id, score in film_scores.items() 
            if len(films_with_all_words[film_id]) == len(filtered_words)
        }

        # If we found results, return them
        if final_film_scores:
            ranked_films = sorted(final_film_scores.items(), key=lambda item: item[1], reverse=True)
            ranked_film_ids = [film_id for film_id, _ in ranked_films]
            
            if words_dropped > 0:
                print(f"\nFound results after dropping {words_dropped} words")
                print(f"Final words used: {filtered_words}")
            return ranked_film_ids

        # No results - drop lowest scoring words
        words_to_drop = min(words_per_drop, len(filtered_words) - min_words_required)
        if words_to_drop <= 0:
            print("\nReached minimum word limit without finding results")
            return []

        # Sort words by FULL composite score and drop lowest scoring ones
        sorted_words = sorted(filtered_words, key=lambda w: word_composite_scores[w])
        words_being_dropped = sorted_words[:words_to_drop]
        filtered_words = sorted_words[words_to_drop:]
        words_dropped += words_to_drop

        print(f"\nNo results found. Dropping {words_to_drop} words: {words_being_dropped}")
        print(f"Words dropped so far: {words_dropped}")
        print(f"Remaining words: {filtered_words}")

    print("\nNo results found after dropping words to minimum threshold")
    return []

def search(user_query, user_query_vector):
    query_terms = queryprocessor(user_query)
    film_list = get_search_results(query_terms, user_query_vector)
    
    print("\n--- Final Ranked Search Results ---")
    print(f"Total results found: {len(film_list)}")
    for film_id in film_list:
        print(film_id)
    return film_list

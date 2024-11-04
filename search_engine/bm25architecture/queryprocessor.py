import json
from bm25config import supabase
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from vectormodel import model
import ast
from collections import defaultdict
import math
import re

# BM25 Hyperparameters
k1 = 1.5  # Term frequency saturation
b = 0.75  # Length normalization factor
initial_ratio_threshold = 0.5  # Base ratio threshold
film_limit = 20  # Target number of films considered "sufficient" for the threshold adjustment

# Query processing function
def queryprocessor(query):
    q_list = re.split(r'\W+', query.lower())
    q_list = [word for word in q_list if word]
    print(q_list)  # Print to see the split result
    return q_list

# Function to compare 2 vectors and return similarity score
def similarity_score(raw_vector1, raw_vector2):
    vector1 = np.array(raw_vector1)
    vector2 = np.array(raw_vector2)
    return round(float(cosine_similarity([vector1], [vector2])[0][0]), 4)

# Function to get avg_doc_length for a specific zone
def get_avg_doc_length(zone_name):
    response = supabase.rpc('get_zone_avglength', {'zone_name': zone_name}).execute()
    if response.data:
        return float(response.data)
    return 1.0

# Calculate BM25-based film scores with adaptive threshold
def calculate_film_scores(word_zone_boosts, adaptive_ratio):
    cumulative_scores = defaultdict(float)
    film_sets = []

    for word, zone_boosts in word_zone_boosts.items():
        word_film_ids = set()

        # Apply BM25 in each relevant zone for the word
        for zone_name, boost_score in zone_boosts.items():
            tfidf_response = supabase.rpc('get_tf_idf', params={
                't_name': zone_name,
                'search_term': word
            }).execute()
            tfidf_values = tfidf_response.data
            if not tfidf_values:
                continue

            tf_dict = tfidf_values['tf']
            idf = tfidf_values['idf']
            avg_doc_length = get_avg_doc_length(zone_name)

            for film_id, tf in tf_dict.items():
                tf_weighted = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (len(tf_dict) / avg_doc_length)))
                bm25_score = tf_weighted * idf
                final_score = bm25_score * boost_score
                cumulative_scores[film_id] += round(final_score, 6)

            word_film_ids.update(tf_dict.keys())
        film_sets.append(word_film_ids)

    common_film_ids = set.intersection(*film_sets) if film_sets else set()
    filtered_scores = {film_id: score for film_id, score in cumulative_scores.items() if film_id in common_film_ids}

    if filtered_scores:
        max_score = max(filtered_scores.values())
        final_scores = {film_id: score for film_id, score in filtered_scores.items() if (score / max_score) >= adaptive_ratio}
    else:
        final_scores = {}

    return final_scores

# Function to boost zone scores by similarity
def zone_score_boosting(static_zone_score, zone_similarity_score, alpha=1.0):
    boosted_scores = {}
    for zone, static_score in static_zone_score.items():
        similarity = zone_similarity_score.get(zone, 0)
        boosted_scores[zone] = static_score * (1 + alpha * similarity)
    return boosted_scores

# Function to calculate cumulative IDF scores for query terms and dynamically filter
def get_top_idf_terms(word_list, overall_zone_score_dict):
    term_idf_scores = {}

    # Calculate cumulative IDF score for each term across zones
    for word, zone_boosts in overall_zone_score_dict.items():
        cumulative_idf = 0
        for zone_name, boost_score in zone_boosts.items():
            tfidf_response = supabase.rpc('get_tf_idf', params={
                't_name': zone_name,
                'search_term': word
            }).execute()
            if tfidf_response.data:
                idf = tfidf_response.data['idf']
                cumulative_idf += idf * boost_score

        term_idf_scores[word] = cumulative_idf

    # Sort terms by cumulative IDF scores (descending)
    sorted_terms = sorted(term_idf_scores.items(), key=lambda item: item[1], reverse=True)

    # Determine the number of terms to keep (75% cutoff)
    if len(sorted_terms) > 2:
        top_count = max(1, int(len(sorted_terms) * 0.75))  # For longer queries, take top 75%
    else:
        top_count = len(sorted_terms)  # For shorter queries (<= 2 terms), keep all terms

    # Select the top terms based on calculated count
    top_terms = {term: overall_zone_score_dict[term] for term, _ in sorted_terms[:top_count]}

    print("Selected words for film ID matching:", top_terms)
    return top_terms


# Main search function with adaptive ratio and iterative filtering
def get_search_results(word_list, user_query):
    query_vector = model.encode(user_query)
    overall_zone_score_dict = {}

    for word in word_list:
        zone_importance_response = supabase.rpc('get_zonei_score', params={'search_term': word}).execute()
        zone_importance_dict = zone_importance_response.data
        
        # Check if zone_importance_dict is None
        if not zone_importance_dict:
            print(f"Skipping word '{word}' due to missing zone importance data.")
            continue

        sorted_zone_importance = {
            k: v for k, v in sorted(zone_importance_dict.items(), key=lambda item: item[1], reverse=True) if v != 0
        }

        zone_vector_dict = {}
        for zone_name in sorted_zone_importance:
            zone_vector_response = supabase.rpc('get_zone_vector', params={'zone_name': zone_name}).execute()
            
            if zone_vector_response.data:
                try:
                    zone_vector = ast.literal_eval(zone_vector_response.data)
                    zone_vector_dict[zone_name] = similarity_score(query_vector, zone_vector)
                except (ValueError, SyntaxError):
                    print(f"Skipping zone '{zone_name}' due to malformed vector data.")
                    continue
            else:
                print(f"Skipping zone '{zone_name}' due to missing vector data.")
                continue

        # Boost the zone scores
        boosted_scores = zone_score_boosting(sorted_zone_importance, zone_vector_dict)
        overall_zone_score_dict[word] = boosted_scores

    top_idf_zone_scores = get_top_idf_terms(word_list, overall_zone_score_dict)
    # Start with an adaptive ratio threshold
    initial_filtered_scores = calculate_film_scores(top_idf_zone_scores, adaptive_ratio=initial_ratio_threshold)

    # Adaptive threshold based on film count
    total_films_count = len(initial_filtered_scores)
    adaptive_threshold = min(max(film_limit / max(total_films_count, 1), 0.3), 1.0) * initial_ratio_threshold

    # Refine results if not enough films are found
    if len(initial_filtered_scores) < film_limit:
        sorted_terms = sorted(top_idf_zone_scores.keys(), key=lambda word: sum(top_idf_zone_scores[word].values()))
        sufficient_count = 5  # Set this lower limit to stop filtering early if this is met
        for i in range(len(sorted_terms) - 1):
            removed_term = sorted_terms[-1 - i]
            selected_terms = {term: top_idf_zone_scores[term] for term in sorted_terms[:-1 - i]}
            final_film_dict_withscores = calculate_film_scores(selected_terms, adaptive_ratio=adaptive_threshold)
            current_film_count = len(final_film_dict_withscores)
            
            print(f"Removing term '{removed_term}' due to insufficient film count. Current film count: {current_film_count}")
            
            # Stop if we reach or exceed `sufficient_count` (e.g., 5 films)
            if current_film_count >= sufficient_count:
                break
    else:
        final_film_dict_withscores = initial_filtered_scores

    final_film_list = list(final_film_dict_withscores.keys())
    film_titles = []
    for film_id in final_film_list:
        title_response = supabase.rpc('get_film_title', params={'filmid': film_id}).execute()
        film_titles.append(title_response.data)

    return film_titles


# Example usage
user_query = "animated indian films"
query_terms = queryprocessor(user_query)
film_list = get_search_results(query_terms, user_query)

print("Search Results:")
print(film_list)
for title in film_list:
    print(title)

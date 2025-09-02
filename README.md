# FilmSearch: A Semantic Search Engine for Movie Discovery

FilmSearch is a full-stack, custom-built search engine designed to help users discover films through complex, natural language queries. It goes beyond simple keyword matching to understand user intent, delivering relevant results for vague or descriptive searches like *"films about love and space"* or *"dystopian sci-fi with a rogue AI."*

This project demonstrates an end-to-end implementation of a modern information retrieval system, from data scraping and processing to building a custom ranking algorithm and deploying a user-facing web application.

-----
## ✨ Real-World Impact & User Testimonials

> The project has already proven its value. I received unsolicited feedback from a startup founder who was able to find a niche Japanese animated film using my tool, something they couldn't do with traditional search. This demonstrates a clear product-market fit for users who need a more intuitive discovery tool.

<img width="700" height="591" alt="Screenshot 2025-08-28 at 11 18 40 AM" src="https://github.com/user-attachments/assets/1221d4f8-9682-4786-b13e-a5cfd99ba8c3" />

-----

## 🎬 Live Demo & Links

  * **Live Application:** **[filmsearch-kappa.vercel.app](https://filmsearch-kappa.vercel.app/)**
  * **Video Walkthrough:** **[Loom Demo](https://www.loom.com/share/df7dfc3116654913bf5fe05c97d909b7?sid=1323dae3-f9d0-4783-a884-a66ed147e8af)**
  * **Technical Article:** **[Read the deep-dive article here](https://medium.com/@krithikintl/building-a-semantic-search-engine-with-bm25-and-query-relaxation-a-deep-dive-0a24f5e2819d)**
  * **Cool Intro Video** - https://www.youtube.com/watch?v=ULXZU1060UU

## ✨ Key Features

  * **Natural Language Understanding:** Accepts complex, conversational queries instead of just keywords.
  * **Custom BM25 Engine:** The core ranking logic is a from-scratch implementation of the Okapi BM25 algorithm for powerful lexical scoring.
  * **Intelligent Query Relaxation:** If a search is too specific and yields no results, the engine automatically drops the least important terms and re-runs the search to ensure you always find something.
  * **Semantic Zone Selection:** Uses sentence-transformer embeddings to identify the user's intent and intelligently focus the search on the most relevant data fields (e.g., `plot`, `actors`, `director`).
  * **End-to-End Data Pipeline:** Includes a Scrapy-based web scraper for data acquisition from Wikipedia, a processing pipeline, and a PostgreSQL database on Supabase.

-----

## 🛠️ Technology Stack

  * **Backend:** Python, Node.js
  * **Database:** PostgreSQL (hosted on Supabase)
  * **Data & ML:** Scrapy, Pandas, NLTK, Sentence-Transformers (Hugging Face), Scikit-learn
  * **Frontend:** React, Next.js
  * **Deployment:** Vercel

-----

## 🏗️ Architecture Overview

The search process is a multi-stage pipeline designed to maximize both relevance (precision) and discovery (recall).

1.  **Semantic Intent Recognition:** The user's query is first vectorized using a sentence-transformer model. This vector is compared against the vectors of the data "zones" (e.g., `plot`, `title`). The zones with the highest cosine similarity are selected as the primary targets for the search. This quickly narrows down the search space to the most relevant areas.

2.  **Strict BM25 Search:** Using the selected zones, the custom BM25 engine performs a strict search. It requires that a film contain **all** of the query's keywords. This ensures that if a perfect match exists, it will be found with high confidence.

3.  **Intelligent Query Relaxation:** If the strict search returns too few results, the engine's most innovative feature kicks in. It uses a pre-calculated importance score for each word to identify the least critical terms in the query. It then iteratively drops these terms and re-runs the search until a sufficient number of relevant films are found.

-----

## 🔮 Limitations & Future Work

While the engine is highly effective, there are several areas for future improvement:

  * **Performance Optimization:** The current implementation makes multiple calls to the database per query. This could be refactored into a single, more complex query to significantly reduce latency.
  * **BM25 Enhancements:** The document length (`|D|`) parameter in the BM25 formula is currently approximated. Using the actual length of each zone would improve ranking accuracy.
  * **True Hybrid Search:** The next evolution would be to combine the BM25 lexical score and a vector-based semantic score into a single, unified ranking formula.

-----

## 👤 Author

  * **Krithik Sai Sreenish G** - [Profile](https://sreenish27.github.io/krithik/)

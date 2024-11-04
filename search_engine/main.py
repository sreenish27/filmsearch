from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel
from typing import List
import os
import uvicorn
import logging
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from search_engine import search  # Import the search function from search_engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI()

# Load environment variables from .env file
load_dotenv()

# Initialize the SentenceTransformer model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Define data models for request payloads
class SentenceInput(BaseModel):
    sentence: str

class SearchQuery(BaseModel):
    query: str  # User's text query
    vector: List[float]  # Precomputed vector for the user query

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","https://filmsearch-kappa.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the Groq client with the API key
client = Groq(
    api_key=os.getenv('GROQ_KEY')  # Replace with your actual Groq API key
)

# `encode` endpoint to generate vector embeddings for a given sentence
@app.post('/encode')
async def encodetext(sentence_input: SentenceInput) -> List[float]:
    sentence = sentence_input.sentence
    encoded_vector = model.encode(sentence).tolist()
    return encoded_vector

# `search` endpoint to handle search queries with a query and its vector
@app.post("/search")
async def perform_search(query: SearchQuery):
    try:
        # Pass both the query string and the vector to the search function
        results = search(query.query, query.vector)
        return {"results": results}
    except Exception as e:
        # Log the exception for debugging
        logger.error("Search failed", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
#an endpoint to answer questions user asks about a particular film
class answerQuery(BaseModel):
    question: str
    filmdetails: dict  # Allows for any nested dictionary structure with empty fields
    context: str  # Add this field to pass the previous conversation context

@app.post("/answerquery")
async def extract_data(request: answerQuery):
    # Construct the prompt for the API, including the context of the last 7 exchanges
    prompt = (
        f"Understand the ongoing conversation and question asked by the user.\n"
        f"Here's the context of the recent conversation:\n"
        f"{request.context}\n"
        f"Now, based on the latest question and this conversation, read through the All film details.\n"
        f"Craft an engaging answer based on the question and conversation context, and give that string as the output.\n"
        f"If there is no relevant content in All film Details, tell the user that relevant content is not available.\n"
        f"Keep your answers always natural and conversational, without explicitly stating where you're getting the information from.\n"
        f"Latest Question:\n{request.question}\n\n"
        f"All film Details:\n{request.filmdetails}\n"
    )

    try:
        # Use the Groq client to create a chat completion with the constructed prompt
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.1-70b-versatile"  # Ensure this model is supported
        )

        # Extract the content from the response
        extracted_data = chat_completion.choices[0].message.content

        return {extracted_data}
    except Exception as e:
        # Log the exception for debugging
        logger.error("An error occurred", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Default route for a basic health check
@app.get("/")
async def read_root():
    return {"message": "API is running"}

# Run the FastAPI app with Uvicorn if executed as the main program
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)



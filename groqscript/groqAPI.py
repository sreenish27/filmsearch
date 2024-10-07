from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from groq import Groq
import logging
from typing import Dict, Any, List
from sentence_transformers import SentenceTransformer
import os
import numpy as np
import ast
#a package to fix my json woes
from json_repair import repair_json
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}

# Add this block to run the app with the correct port
if __name__ == "__main__":
    # Get the port from the environment variable `PORT` or default to 8000
    port = int(os.environ.get("PORT", 8000))
    # Run the FastAPI app using uvicorn
    uvicorn.run(app, host="0.0.0.0", port=port)

# Load environment variables from .env file
load_dotenv()

# Enable CORS to allow requests from your frontend (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","https://filmsearch-kappa.vercel.app"],  # Allow only your frontend origin
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

class ExtractRequest(BaseModel):
    content: str
    framework: Dict[str, Any]  # Allows for any nested dictionary structure with empty fields

# Initialize the Groq client with the API key
client = Groq(
    api_key=os.getenv('GROQ_KEY')  # Replace with your actual Groq API key
)

@app.get("/")
async def read_root():
    return {"message": "Hello World"}

@app.post("/extract")
async def extract_data(request: ExtractRequest):
    # Construct the prompt for the API
    prompt = (
        f"Extract only the most essential and relevant information. "
        f"Each field must contain a maximum of two precise sentences. "
        f"Do not include any irrelevant, redundant, or speculative information. "
        f"Do not include fields which do not have any meaningful data available.\n\n"
        f"Strictly adhere to the framework provided. DO NOT hallucinate"
        f"Here’s a concise prompt to achieve the desired task:"
        f"PLEASE MAKE IT A VALID PYTHON LITERAL IN TERMS OF FORMATTING"
        f"Escape 'apostrophes' correctly"
        f"Content:\n{request.content}\n\n"
        f"Framework:\n{request.framework}\n"
    )
    # Continue with the API call using the constructed prompt


    try:
        # Use the Groq client to create a chat completion
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


#an endpoint to process the vector embeddings
model = SentenceTransformer('all-MiniLM-L6-v2')

class SentenceInput(BaseModel):
    sentence: str

@app.post('/encode')
async def encodetext(sentence_input: SentenceInput) -> List[float]:
    sentence = sentence_input.sentence
    encodedvector = model.encode(sentence)
    return encodedvector

#an endpoint to narrow down to the 3 most relevant tables in the list based on the user query

class ProcessInput(BaseModel):
    content: str
    categorylist: list[Any]


@app.post("/processquery")
async def process_query(request: ProcessInput):
    # Construct the prompt for the API
    prompt = (
f"Read the content and understand what is written\n"
f"Now select the words that match the most with what is given in the content from the provided categorylist\n"
f"DO NOT HALLUCINATE, pick words only from the list provided\n"
f"You can pick a maximum of 3 and minimum of 1 word\n"
f"Be conservative in your selection. Only choose additional categories if there is strong evidence in the user's query to justify their inclusion\n"
f"This is done to boil down which is the most appropriate category to search in\n"
f"THE OUTPUT MUST BE JUST 1 - 3 WORDS IN A LIST, NOTHING ELSE\n"
f"Content:\n{request.content}\n\n"
f"Category List:\n{request.categorylist}\n"
)
    # Continue with the API call using the constructed prompt


    try:
        # Use the Groq client to create a chat completion
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
    

#an endpoint to give a sentence based on each of the selected tables

class SentencefromInput(BaseModel):
    content: str
    table: str


@app.post("/generatesentence")
async def generate_sentence(request: SentencefromInput):
    # Construct the prompt for the API
    prompt = (
        f"Read the user input and understand it\n"
        f"Now, extract just the aspect from this input based on the provided table string"
        f"Now construct a sentence for that aspect, DO NOT HALLUCINATE ANYTHING EXTRA. DO NOT ADD UNNECESSARY COMMENTS"
        f"THE OUTPUT MUST BE JUST A CONCISE PHRASE THAT CAPTURES THE ESSENCE OF THE EXTRACTED ASPECT AND NOTHING ELSE\n"
        f"Content:\n{request.content}\n\n"
        f"Table:\n{request.table}\n"
    )
    # Continue with the API call using the constructed prompt


    try:
        # Use the Groq client to create a chat completion
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
    
#an endpoint to extract all concrete information like names etc from the query

class Concreteinfo(BaseModel):
    content: str

@app.post("/extractconcreteinfo")
async def generate_sentence(request: Concreteinfo):
    # Construct the prompt for the API
    prompt = (
        f"Read the user input and understand it\n"
        f"Now, extract all the names of people and entities from this input and list them\n"
        f"IF THERE IS NOTHING LIKE THAT, just give me ['Nopeople'] inside a list, AGAIN IF YOU DO NOT FIND ANYTHING TO EXTRACT, give ['Nopeople'] inside a list\n"
        f"Construct a concise list, DO NOT HALLUCINATE ANYTHING EXTRA. DO NOT ADD UNNECESSARY COMMENTS\n"
        f"THE OUTPUT MUST BE JUST A LIST THAT CAPTURES ALL THE EXTRACTED NAMES OR CONCRETE INFORMATION AND NOTHING ELSE\n"
        f"AGAIN THE OUTPUT MUST BE A LIST IN THIS FORMAT ['inside this all the words']"
        f"Content:\n{request.content}\n\n"
    )
    # Continue with the API call using the constructed prompt


    try:
        # Use the Groq client to create a chat completion
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
    
#an endpoint to extract only the unstructured part of the query, which describes themes, production etc of a film

class unstructuredInfo(BaseModel):
    content: str

@app.post("/extractunstructuredInfo")
async def generate_sentence(request: unstructuredInfo):
    # Construct the prompt for the API
    prompt = (
        f"Read the user input and understand it\n"
        f"Now, extract all the descriptive or thematic information from this input while ignoring the names of people or specific entities involved\n"
        f"Construct a concise paragraph or couple of sentences summarizing the remaining information\n"
        f"IF THERE NOTHING EXTRACT, PLEASE JUST RETURN 'Noinfo', DO NOT WRITE ANYTHING ELSE. AGAIN, JUST 'Noinfo'\n"
        f"Content:\n{request.content}\n\n"
    )
    # Continue with the API call using the constructed prompt


    try:
        # Use the Groq client to create a chat completion
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
    

#an endpoint to narrow down to the most relvant column in the table

class relevantColumn(BaseModel):
    content: str
    collist: list[Any]


@app.post("/relevantcolumn")
async def relevant_column(request: relevantColumn):
    # Construct the prompt for the API
    prompt = (
        f"Read the content and understand what is written\n"
        f"Now select the word that match the most with what is given in the content from the provided column list\n"
        f"DO NOT HALLUCINATE, pick one word only from the list provided"
        f"This is done to boil down which is the most appropriate column to search in\n"
        f"THE OUTPUT MUST BE JUST 1 WORDS AS A STRING, NOTHING ELSE\n"
        f"Content:\n{request.content}\n\n"
        f"TableList:\n{request.collist}\n"
    )
    # Continue with the API call using the constructed prompt


    try:
        # Use the Groq client to create a chat completion
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

#an endpoint to structure the user query based on that particular subfield structure by taking from frameworks
class structureQuery(BaseModel):
    content: str
    framework: dict  # Allows for any nested dictionary structure with empty fields

@app.post("/structurequery")
async def extract_data(request: structureQuery):
    # Construct the prompt for the API
    prompt = (
        f"Analyze the user query to identify the core intent and key information, ignoring generic words. "
        f"Use the identified intent and information to fill in the provided framework. "
        f"If a field in the framework is not directly relevant to the query, do not include the fields "
        f"Extract as much info you can from the user query while remaining faithful to the original intent. "
        f"Each non-empty field must contain a maximum of two precise sentences. "
        f"Do not include any irrelevant, redundant, or speculative information. "
        f"Strictly adhere to the framework provided. DO NOT hallucinate and DO NOT GIVE UNNECESSARY COMMENTS. "
        f"Only use info from the provided content or extrapolated content to fill the framework; do not make up content. "
        f"PLEASE ENSURE THE OUTPUT IS IN A PROPER DICTIONARY FORMAT. "
        f"Escape 'apostrophes' correctly. "
        f"Content:\n{request.content}\n\n"
        f"Framework:\n{request.framework}\n"
        )
    # Continue with the API call using the constructed prompt


    try:
        # Use the Groq client to create a chat completion
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
    

#an endpoint to answer questions user asks about a particular film
class answerQuery(BaseModel):
    question: str
    filmdetails: dict  # Allows for any nested dictionary structure with empty fields
    filmdata: dict

@app.post("/answerquery")
async def extract_data(request: answerQuery):
    # Construct the prompt for the API
    prompt = (
        f"Understand the question asked by the user\n"
        f"Then based on the question read through the Basic details and Other Film data\n"
        f"Craft an engaging answer based on the question asked and give that string as the output\n"
        f"If there is no relvant content in Basic details or Other film data tell the user that relevant content is not available\n"
        f"Keep your answers always natural do not tell where you are getting or not getting your info from\n"
        f"Content:\n{request.question}\n\n"
        f"Basic Details:\n{request.filmdetails}\n"
        f"Other Film data:\n{request.filmdata}\n"
    )
    # Continue with the API call using the constructed prompt


    try:
        # Use the Groq client to create a chat completion
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

